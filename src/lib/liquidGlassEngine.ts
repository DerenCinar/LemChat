import type { LiquidGlassVariant } from '../components/LiquidGlassLayer';
import type { RealGlassMode } from '../types/chat';

const SVG_NS = 'http://www.w3.org/2000/svg';
const MAP_SIZE = 96;

const mapUrlCache = new Map<RealGlassMode, string>();

const FOCAL_VARIANTS = new Set<LiquidGlassVariant>([
  'surface',
  'pill',
  'popover',
  'modal',
  'toast',
]);

function clampByte(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)));
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * Generates and caches a 96x96 procedural RGBA optical refraction map per RealGlassMode.
 * R encodes X displacement, G encodes Y displacement (128 = neutral / crisp center).
 */
export function getDisplacementMapUrl(mode: RealGlassMode): string {
  const cached = mapUrlCache.get(mode);
  if (cached) return cached;
  if (typeof document === 'undefined') return '';

  const canvas = document.createElement('canvas');
  canvas.width = MAP_SIZE;
  canvas.height = MAP_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const img = ctx.createImageData(MAP_SIZE, MAP_SIZE);
  const data = img.data;

  for (let y = 0; y < MAP_SIZE; y++) {
    const ny = ((y + 0.5) / MAP_SIZE) * 2 - 1;
    for (let x = 0; x < MAP_SIZE; x++) {
      const nx = ((x + 0.5) / MAP_SIZE) * 2 - 1;
      const edgePx = Math.min(x, y, MAP_SIZE - 1 - x, MAP_SIZE - 1 - y);
      // 1.5px smooth taper to neutral at map perimeter prevents Chromium edge artifacts
      const edgeTaper = Math.min(1, edgePx / 1.5);

      let dx = 0;
      let dy = 0;

      if (mode === 'polar') {
        const r = Math.min(1, Math.hypot(nx, ny));
        const rim = smoothstep(0.28, 0.96, r);
        dx = nx * rim * 0.85 - ny * rim * 0.14;
        dy = ny * rim * 0.85 + nx * rim * 0.14;
      } else if (mode === 'prominent') {
        const boxD = Math.max(Math.abs(nx), Math.abs(ny));
        const eucD = Math.min(1, Math.hypot(nx, ny));
        const d = boxD * 0.65 + eucD * 0.35;
        const rim = smoothstep(0.32, 0.92, d);
        const ridge = Math.sin(rim * Math.PI) * 0.32;
        const mag = rim * 0.95 + ridge;
        dx = nx * mag;
        dy = ny * mag;
      } else if (mode === 'shader') {
        const qx = Math.abs(nx) - 0.62;
        const qy = Math.abs(ny) - 0.62;
        const sdf =
          Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) +
          Math.min(Math.max(qx, qy), 0) -
          0.32;
        const bezel = smoothstep(-0.36, 0.04, sdf);
        const curve = bezel * bezel * 0.9;
        dx = nx * curve;
        dy = ny * curve;
      } else {
        // 'standard': clean Apple-style crisp interior + smooth curved bezel refraction
        const boxD = Math.max(Math.abs(nx), Math.abs(ny));
        const eucD = Math.min(1, Math.hypot(nx, ny));
        const d = boxD * 0.6 + eucD * 0.4;
        const rim = smoothstep(0.46, 0.96, d);
        dx = nx * rim * 0.78;
        dy = ny * rim * 0.78;
      }

      const idx = (y * MAP_SIZE + x) * 4;
      data[idx] = clampByte((dx * edgeTaper * 0.5 + 0.5) * 255);
      data[idx + 1] = clampByte((dy * edgeTaper * 0.5 + 0.5) * 255);
      data[idx + 2] = 128;
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(img, 0, 0);
  const url = canvas.toDataURL('image/png');
  mapUrlCache.set(mode, url);
  return url;
}

export function quantizeDimension(value: number): number {
  const safe = Math.max(12, Math.round(value));
  if (safe < 96) {
    return Math.max(12, Math.ceil(safe / 4) * 4);
  }
  if (safe <= 320) {
    return Math.ceil(safe / 24) * 24;
  }
  return Math.ceil(safe / 64) * 64;
}

interface FilterEntry {
  id: string;
  refs: number;
  el: SVGFilterElement;
}

const filterRegistry = new Map<string, FilterEntry>();
let sharedSvgDefs: SVGDefsElement | null = null;
let filterCounter = 0;

function ensureSharedDefs(): SVGDefsElement | null {
  if (typeof document === 'undefined') return null;
  if (sharedSvgDefs && sharedSvgDefs.isConnected) return sharedSvgDefs;

  const existing = document.getElementById('skellytalk-lg-defs');
  if (existing instanceof SVGSVGElement) {
    const defs = existing.querySelector('defs');
    if (defs instanceof SVGDefsElement) {
      sharedSvgDefs = defs;
      return sharedSvgDefs;
    }
  }

  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.id = 'skellytalk-lg-defs';
  svg.setAttribute('aria-hidden', 'true');
  svg.style.position = 'fixed';
  svg.style.width = '0';
  svg.style.height = '0';
  svg.style.pointerEvents = 'none';
  svg.style.overflow = 'hidden';

  const defs = document.createElementNS(SVG_NS, 'defs');
  svg.appendChild(defs);
  document.body.appendChild(svg);
  sharedSvgDefs = defs;
  return sharedSvgDefs;
}

function createSvgEl<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number>
): SVGElementTagNameMap[K] {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    el.setAttribute(k, String(v));
  }
  return el;
}

export interface AcquireGlassFilterOptions {
  mode: RealGlassMode;
  variant: LiquidGlassVariant;
  width: number;
  height: number;
  displacementScale: number;
  aberrationIntensity: number;
}

/**
 * Acquires (or increments refcount on) a shared global SVG filter matching the
 * quantized size, optical mode, displacement scale, and aberration strength.
 */
export function acquireGlassFilter({
  mode,
  variant,
  width,
  height,
  displacementScale,
  aberrationIntensity,
}: AcquireGlassFilterOptions): { key: string; id: string } | null {
  const defs = ensureSharedDefs();
  if (!defs) return null;

  const qw = quantizeDimension(width);
  const qh = quantizeDimension(height);
  const qScale = Math.round(displacementScale / 2) * 2;
  const useAberration =
    FOCAL_VARIANTS.has(variant) && aberrationIntensity > 0.1;
  const qAberr = useAberration ? Math.round(aberrationIntensity * 2) / 2 : 0;

  const key = `${mode}|${useAberration ? 1 : 0}|${qw}x${qh}|s${qScale}|a${qAberr}`;
  const existing = filterRegistry.get(key);
  if (existing) {
    existing.refs += 1;
    return { key, id: existing.id };
  }

  filterCounter += 1;
  const id = `skelly-lg-${filterCounter}`;
  const mapUrl = getDisplacementMapUrl(mode);
  const filterEl = createSvgEl('filter', {
    id,
    x: '0%',
    y: '0%',
    width: '100%',
    height: '100%',
    'color-interpolation-filters': 'sRGB',
  });

  filterEl.appendChild(
    createSvgEl('feImage', {
      x: 0,
      y: 0,
      width: qw,
      height: qh,
      preserveAspectRatio: 'none',
      href: mapUrl,
      result: 'DISPLACEMENT_MAP',
    })
  );

  const signedScale = qScale * (mode === 'shader' ? 1 : -1);

  if (useAberration) {
    const cyanScale = signedScale - Math.sign(signedScale || -1) * qAberr * 2.2;

    filterEl.appendChild(
      createSvgEl('feDisplacementMap', {
        in: 'SourceGraphic',
        in2: 'DISPLACEMENT_MAP',
        scale: signedScale,
        xChannelSelector: 'R',
        yChannelSelector: 'G',
        result: 'RED_DISP',
      })
    );
    filterEl.appendChild(
      createSvgEl('feColorMatrix', {
        in: 'RED_DISP',
        type: 'matrix',
        values: '1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0',
        result: 'RED_CH',
      })
    );

    filterEl.appendChild(
      createSvgEl('feDisplacementMap', {
        in: 'SourceGraphic',
        in2: 'DISPLACEMENT_MAP',
        scale: cyanScale,
        xChannelSelector: 'R',
        yChannelSelector: 'G',
        result: 'CYAN_DISP',
      })
    );
    filterEl.appendChild(
      createSvgEl('feColorMatrix', {
        in: 'CYAN_DISP',
        type: 'matrix',
        values: '0 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0',
        result: 'CYAN_CH',
      })
    );

    filterEl.appendChild(
      createSvgEl('feBlend', {
        in: 'RED_CH',
        in2: 'CYAN_CH',
        mode: 'screen',
      })
    );
  } else {
    filterEl.appendChild(
      createSvgEl('feDisplacementMap', {
        in: 'SourceGraphic',
        in2: 'DISPLACEMENT_MAP',
        scale: signedScale,
        xChannelSelector: 'R',
        yChannelSelector: 'G',
      })
    );
  }

  defs.appendChild(filterEl);
  filterRegistry.set(key, { id, refs: 1, el: filterEl });
  return { key, id };
}

export function releaseGlassFilter(key: string): void {
  const entry = filterRegistry.get(key);
  if (!entry) return;
  entry.refs -= 1;
  if (entry.refs <= 0) {
    entry.el.remove();
    filterRegistry.delete(key);
  }
}

type VisibilityCallback = (visible: boolean) => void;
type SizeCallback = (width: number, height: number) => void;

const visibilityCallbacks = new WeakMap<Element, VisibilityCallback>();
const sizeCallbacks = new WeakMap<Element, SizeCallback>();

let sharedIo: IntersectionObserver | null = null;
let sharedRo: ResizeObserver | null = null;

function getVisibilityObserver(): IntersectionObserver | null {
  if (typeof IntersectionObserver === 'undefined') return null;
  if (!sharedIo) {
    sharedIo = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          visibilityCallbacks.get(entry.target)?.(entry.isIntersecting);
        }
      },
      { rootMargin: '80px' }
    );
  }
  return sharedIo;
}

function getSizeObserver(): ResizeObserver | null {
  if (typeof ResizeObserver === 'undefined') return null;
  if (!sharedRo) {
    sharedRo = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const cb = sizeCallbacks.get(entry.target);
        if (!cb) continue;
        const box = entry.borderBoxSize?.[0];
        const width = box ? box.inlineSize : entry.contentRect.width;
        const height = box ? box.blockSize : entry.contentRect.height;
        cb(Math.round(width), Math.round(height));
      }
    });
  }
  return sharedRo;
}

export function observeVisibility(
  el: Element,
  cb: VisibilityCallback
): () => void {
  const io = getVisibilityObserver();
  if (!io) return () => {};
  visibilityCallbacks.set(el, cb);
  io.observe(el);
  return () => {
    visibilityCallbacks.delete(el);
    io.unobserve(el);
  };
}

export function observeSize(el: Element, cb: SizeCallback): () => void {
  const ro = getSizeObserver();
  if (!ro) return () => {};
  sizeCallbacks.set(el, cb);
  ro.observe(el);
  return () => {
    sizeCallbacks.delete(el);
    ro.unobserve(el);
  };
}
