import { create } from 'zustand';

export interface Sticker {
  id: string;
  name: string;
  /** PNG data URL (transparent background preserved). */
  dataUrl: string;
}

export interface StickerPack {
  id: string;
  name: string;
  stickers: Sticker[];
}

const STORAGE_KEY = 'skellytalk_sticker_packs';
export const MAX_STICKERS_PER_PACK = 50;
export const MAX_PACKS = 20;

const uid = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

const load = (): StickerPack[] => {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as StickerPack[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

/** Returns false when the browser refuses the write (quota exceeded). */
const persist = (packs: StickerPack[]): boolean => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(packs));
    return true;
  } catch {
    return false;
  }
};

interface StickerPackState {
  packs: StickerPack[];
  createPack: (name: string) => string;
  renamePack: (packId: string, name: string) => void;
  deletePack: (packId: string) => void;
  /** Resolves to an error message, or null on success. */
  addSticker: (packId: string, name: string, dataUrl: string) => string | null;
  removeSticker: (packId: string, stickerId: string) => void;
}

export const useStickerPacks = create<StickerPackState>((set, get) => ({
  packs: load(),

  createPack: (name) => {
    const pack: StickerPack = { id: uid('pack'), name: name.trim() || 'My stickers', stickers: [] };
    const next = [...get().packs, pack].slice(0, MAX_PACKS);
    persist(next);
    set({ packs: next });
    return pack.id;
  },

  renamePack: (packId, name) => {
    const next = get().packs.map((p) => (p.id === packId ? { ...p, name: name.trim() || p.name } : p));
    persist(next);
    set({ packs: next });
  },

  deletePack: (packId) => {
    const next = get().packs.filter((p) => p.id !== packId);
    persist(next);
    set({ packs: next });
  },

  addSticker: (packId, name, dataUrl) => {
    const pack = get().packs.find((p) => p.id === packId);
    if (!pack) return 'Pack not found.';
    if (pack.stickers.length >= MAX_STICKERS_PER_PACK) {
      return `A pack holds up to ${MAX_STICKERS_PER_PACK} stickers.`;
    }
    const sticker: Sticker = { id: uid('stk'), name: name.trim() || 'Sticker', dataUrl };
    const next = get().packs.map((p) =>
      p.id === packId ? { ...p, stickers: [...p.stickers, sticker] } : p
    );
    if (!persist(next)) return 'Not enough local storage space for another sticker.';
    set({ packs: next });
    return null;
  },

  removeSticker: (packId, stickerId) => {
    const next = get().packs.map((p) =>
      p.id === packId ? { ...p, stickers: p.stickers.filter((s) => s.id !== stickerId) } : p
    );
    persist(next);
    set({ packs: next });
  },
}));

/** Convert a sticker data URL into a File for the normal attachment upload path. */
export const stickerToFile = async (sticker: Sticker): Promise<File> => {
  const blob = await (await fetch(sticker.dataUrl)).blob();
  return new File([blob], `${sticker.name.replace(/[^\w-]+/g, '_') || 'sticker'}.png`, {
    type: 'image/png',
  });
};
