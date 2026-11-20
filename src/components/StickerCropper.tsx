import React, { useEffect, useRef, useState } from 'react';
import { X, ImagePlus, Square, Circle } from 'lucide-react';
import { useStickerPacks, MAX_STICKERS_PER_PACK } from '../store/useStickerPacks';

const VIEW = 288; // on-screen crop square (px)
const OUT = 320; // exported sticker size (px)

interface StickerCropperProps {
  onClose: () => void;
  /** Pack to preselect when opening from a pack tab. */
  initialPackId?: string | null;
}

export const StickerCropper: React.FC<StickerCropperProps> = ({ onClose, initialPackId }) => {
  const packs = useStickerPacks((s) => s.packs);
  const createPack = useStickerPacks((s) => s.createPack);
  const addSticker = useStickerPacks((s) => s.addSticker);

  const [packId, setPackId] = useState<string>(initialPackId ?? packs[0]?.id ?? '__new__');
  const [newPackName, setNewPackName] = useState('');
  const [stickerName, setStickerName] = useState('');
  const [shape, setShape] = useState<'square' | 'circle'>('square');
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 }); // image centre relative to crop centre
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  useEffect(
    () => () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    },
    []
  );

  // "Cover" scale: at zoom 1 the image fully covers the crop square.
  const baseScale = img ? VIEW / Math.min(img.naturalWidth, img.naturalHeight) : 1;

  const clampOffset = (o: { x: number; y: number }, z: number) => {
    if (!img) return o;
    const w = img.naturalWidth * baseScale * z;
    const h = img.naturalHeight * baseScale * z;
    const maxX = Math.max(0, (w - VIEW) / 2);
    const maxY = Math.max(0, (h - VIEW) / 2);
    return { x: Math.min(maxX, Math.max(-maxX, o.x)), y: Math.min(maxY, Math.max(-maxY, o.y)) };
  };

  const draw = (ctx: CanvasRenderingContext2D, size: number, forExport: boolean) => {
    const k = size / VIEW;
    ctx.clearRect(0, 0, size, size);
    if (!img) return;
    ctx.save();
    if (shape === 'circle') {
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
      ctx.clip();
    }
    const w = img.naturalWidth * baseScale * zoom * k;
    const h = img.naturalHeight * baseScale * zoom * k;
    ctx.drawImage(img, size / 2 + offset.x * k - w / 2, size / 2 + offset.y * k - h / 2, w, h);
    ctx.restore();
    if (!forExport) {
      // Dim everything outside a circle crop so the user sees the final shape.
      if (shape === 'circle') {
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.beginPath();
        ctx.rect(0, 0, size, size);
        ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2, true);
        ctx.fill('evenodd');
        ctx.restore();
      }
    }
  };

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) draw(ctx, VIEW, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [img, zoom, offset, shape]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image or PNG file.');
      return;
    }
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    const el = new Image();
    el.onload = () => {
      setImg(el);
      setZoom(1);
      setOffset({ x: 0, y: 0 });
      setError(null);
      if (!stickerName) setStickerName(file.name.replace(/\.[^.]+$/, '').slice(0, 30));
    };
    el.onerror = () => setError('That image could not be loaded.');
    el.src = url;
  };

  const handleSave = () => {
    if (!img) return;
    const out = document.createElement('canvas');
    out.width = OUT;
    out.height = OUT;
    const ctx = out.getContext('2d');
    if (!ctx) return;
    draw(ctx, OUT, true);
    const dataUrl = out.toDataURL('image/png');

    let targetId = packId;
    if (targetId === '__new__') targetId = createPack(newPackName);
    const err = addSticker(targetId, stickerName, dataUrl);
    if (err) {
      setError(err);
      return;
    }
    setPackId(targetId);
    setSaved((n) => n + 1);
    setImg(null);
    setStickerName('');
    setError(null);
  };

  const targetPack = packs.find((p) => p.id === packId);
  const packFull = !!targetPack && targetPack.stickers.length >= MAX_STICKERS_PER_PACK;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-3 backdrop-blur-sm"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="glass-panel glass-surface max-h-[92vh] w-full max-w-[360px] overflow-y-auto rounded-3xl p-4 text-emerald-950 dark:text-white">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-bold">Create sticker</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close sticker creator"
            className="rounded-full p-1 hover:bg-black/5 dark:hover:bg-white/10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

        <div className="mx-auto mb-3" style={{ width: VIEW, maxWidth: '100%' }}>
          {img ? (
            <canvas
              ref={canvasRef}
              width={VIEW}
              height={VIEW}
              style={{
                width: VIEW,
                height: VIEW,
                touchAction: 'none',
                backgroundImage:
                  'repeating-conic-gradient(rgba(128,128,128,0.25) 0% 25%, transparent 0% 50%)',
                backgroundSize: '16px 16px',
              }}
              className="max-w-full cursor-grab rounded-2xl border border-emerald-500/30 active:cursor-grabbing"
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                dragRef.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
              }}
              onPointerMove={(e) => {
                const d = dragRef.current;
                if (!d) return;
                setOffset(clampOffset({ x: d.ox + e.clientX - d.x, y: d.oy + e.clientY - d.y }, zoom));
              }}
              onPointerUp={() => (dragRef.current = null)}
              onPointerCancel={() => (dragRef.current = null)}
              onWheel={(e) => {
                const z = Math.min(4, Math.max(1, zoom - e.deltaY * 0.002));
                setZoom(z);
                setOffset((o) => clampOffset(o, z));
              }}
            />
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              style={{ height: VIEW }}
              className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-emerald-500/40 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-500/10 dark:text-emerald-300"
            >
              <ImagePlus className="h-8 w-8" />
              Choose an image or PNG
            </button>
          )}
        </div>

        {img && (
          <>
            <div className="mb-3 flex items-center gap-2 text-xs">
              <span className="w-10 opacity-70">Zoom</span>
              <input
                type="range"
                min={1}
                max={4}
                step={0.01}
                value={zoom}
                onChange={(e) => {
                  const z = Number(e.target.value);
                  setZoom(z);
                  setOffset((o) => clampOffset(o, z));
                }}
                className="min-w-0 flex-1 accent-emerald-500"
              />
              <button
                type="button"
                onClick={() => setShape('square')}
                title="Square"
                className={`rounded-lg p-1.5 ${shape === 'square' ? 'bg-emerald-500/25 text-[#22C55E]' : 'opacity-60'}`}
              >
                <Square className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setShape('circle')}
                title="Circle"
                className={`rounded-lg p-1.5 ${shape === 'circle' ? 'bg-emerald-500/25 text-[#22C55E]' : 'opacity-60'}`}
              >
                <Circle className="h-4 w-4" />
              </button>
            </div>
            <p className="mb-3 text-[10px] opacity-60">Drag to reposition. Scroll or use the slider to zoom.</p>
          </>
        )}

        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider opacity-60">
          Sticker name
        </label>
        <input
          value={stickerName}
          onChange={(e) => setStickerName(e.target.value)}
          maxLength={30}
          placeholder="Sticker"
          className="mb-3 w-full rounded-xl border border-emerald-900/15 bg-white/40 px-3 py-2 text-xs outline-none focus:border-emerald-500/70 dark:border-white/15 dark:bg-white/5"
        />

        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider opacity-60">
          Save to pack
        </label>
        <select
          value={packId}
          onChange={(e) => setPackId(e.target.value)}
          className="mb-2 w-full rounded-xl border border-emerald-900/15 bg-white/40 px-3 py-2 text-xs outline-none focus:border-emerald-500/70 dark:border-white/15 dark:bg-zinc-900"
        >
          {packs.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.stickers.length})
            </option>
          ))}
          <option value="__new__">+ New pack…</option>
        </select>
        {packId === '__new__' && (
          <input
            value={newPackName}
            onChange={(e) => setNewPackName(e.target.value)}
            maxLength={30}
            placeholder="Pack name"
            className="mb-2 w-full rounded-xl border border-emerald-900/15 bg-white/40 px-3 py-2 text-xs outline-none focus:border-emerald-500/70 dark:border-white/15 dark:bg-white/5"
          />
        )}

        {error && <p className="mb-2 text-xs text-rose-500">{error}</p>}
        {saved > 0 && !img && <p className="mb-2 text-xs text-emerald-600 dark:text-emerald-300">Saved! Add another or close.</p>}

        <div className="mt-2 flex items-center justify-between gap-2">
          {img ? (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="rounded-full px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-300"
            >
              Change image
            </button>
          ) : (
            <span />
          )}
          <button
            type="button"
            disabled={!img || packFull}
            onClick={handleSave}
            className="rounded-full bg-gradient-to-r from-[#22C55E] to-[#10B981] px-4 py-1.5 text-xs font-semibold text-white transition hover:brightness-110 disabled:opacity-40"
          >
            Save sticker
          </button>
        </div>
      </div>
    </div>
  );
};
