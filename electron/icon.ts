import { nativeImage, NativeImage } from 'electron';
import zlib from 'zlib';

// CRC32 table for valid PNG chunk generation
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodeRGBAtoPNG(width: number, height: number, rgba: Buffer): Buffer {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter type 0
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  const idat = zlib.deflateSync(raw, { level: 6 });

  return Buffer.concat([
    signature,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

/**
 * Generates the LemChat brand icon (rounded emerald-lime glass tile with a crisp chat mark)
 * as a NativeImage so notifications, window icon, and tray icon work reliably on all platforms.
 */
export function createLemChatIcon(size = 64): NativeImage {
  const rgba = Buffer.alloc(size * size * 4);
  const radius = size * 0.24;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const nx = x + 0.5;
      const ny = y + 0.5;

      // Signed distance to rounded rectangle
      const cx = Math.max(radius, Math.min(size - radius, nx));
      const cy = Math.max(radius, Math.min(size - radius, ny));
      const dist = Math.hypot(nx - cx, ny - cy) - radius;

      if (dist > 0.75) {
        rgba[idx + 3] = 0;
        continue;
      }

      const alpha = dist < -0.75 ? 255 : Math.max(0, Math.min(255, Math.round((0.75 - dist) * 170)));

      // Diagonal gradient from #22C55E (34, 197, 94) to #059669 (5, 150, 105)
      const t = (x + y) / (2 * size);
      let r = Math.round(34 * (1 - t) + 5 * t);
      let g = Math.round(197 * (1 - t) + 150 * t);
      let b = Math.round(94 * (1 - t) + 105 * t);

      // Subtle top specular highlight
      if (y < size * 0.28) {
        const highlight = (1 - y / (size * 0.28)) * 0.22;
        r = Math.min(255, Math.round(r + (255 - r) * highlight));
        g = Math.min(255, Math.round(g + (255 - g) * highlight));
        b = Math.min(255, Math.round(b + (255 - b) * highlight));
      }

      // Draw crisp white chat bubble / LemHand 'L' glyph inside
      const u = nx / size;
      const v = ny / size;
      const inBubble =
        (Math.hypot((u - 0.5) / 0.28, (v - 0.47) / 0.23) <= 1.0) ||
        (u >= 0.31 && u <= 0.43 && v >= 0.58 && v <= 0.74 && v - 0.58 <= (0.43 - u) * 1.4);

      if (inBubble) {
        // Cut out a sleek green 'L' accent inside the white bubble
        const inL =
          (u >= 0.41 && u <= 0.475 && v >= 0.36 && v <= 0.56) ||
          (u >= 0.41 && u <= 0.59 && v >= 0.505 && v <= 0.56);

        if (!inL) {
          r = 250;
          g = 255;
          b = 252;
        }
      }

      rgba[idx] = r;
      rgba[idx + 1] = g;
      rgba[idx + 2] = b;
      rgba[idx + 3] = alpha;
    }
  }

  return nativeImage.createFromBuffer(encodeRGBAtoPNG(size, size, rgba));
}

/**
 * Generates a small glowing green unread badge overlay icon for Windows taskbar.
 */
export function createBadgeOverlayIcon(count: number): NativeImage {
  const size = 32;
  const rgba = Buffer.alloc(size * size * 4);
  const center = size / 2;
  const radius = size / 2 - 2;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const dist = Math.hypot(x + 0.5 - center, y + 0.5 - center) - radius;
      if (dist > 0.75) {
        rgba[idx + 3] = 0;
        continue;
      }
      const alpha = dist < -0.75 ? 255 : Math.max(0, Math.min(255, Math.round((0.75 - dist) * 170)));
      // Bright LemHand Lime-Emerald circle with white ring
      const isRing = dist > -2.5;
      rgba[idx] = isRing ? 255 : 34;
      rgba[idx + 1] = isRing ? 255 : 197;
      rgba[idx + 2] = isRing ? 255 : 94;
      rgba[idx + 3] = alpha;
    }
  }

  // Note: count is reflected visually in app title / Mac badge; Windows overlay shows crisp green indicator dot
  void count;
  return nativeImage.createFromBuffer(encodeRGBAtoPNG(size, size, rgba));
}
