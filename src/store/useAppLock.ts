import { create } from 'zustand';

const STORAGE_KEY = 'skellytalk_applock_v1';

interface PersistedLock {
  enabled: boolean;
  salt: string;
  hash: string;
  timeoutMinutes: number; // 0 = never auto-lock
  shortcutEnabled: boolean;
}

const DEFAULTS: PersistedLock = {
  enabled: false,
  salt: '',
  hash: '',
  timeoutMinutes: 5,
  shortcutEnabled: true,
};

const load = (): PersistedLock => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = { ...DEFAULTS, ...(JSON.parse(raw) as Partial<PersistedLock>) };
    // A lock without a credential is meaningless; treat as off.
    if (!parsed.hash || !parsed.salt) parsed.enabled = false;
    return parsed;
  } catch {
    return { ...DEFAULTS };
  }
};

const save = (state: PersistedLock) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // storage unavailable
  }
};

const toHex = (buffer: ArrayBuffer) =>
  Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

const hashSecret = async (secret: string, salt: string): Promise<string> => {
  const data = new TextEncoder().encode(`${salt}:${secret}`);
  let digest = await crypto.subtle.digest('SHA-256', data);
  // Light key stretching so a 4-digit PIN is not trivially one hash away.
  for (let i = 0; i < 20000; i += 1) {
    const next = new Uint8Array(digest.byteLength + data.byteLength);
    next.set(new Uint8Array(digest), 0);
    next.set(data, digest.byteLength);
    digest = await crypto.subtle.digest('SHA-256', next);
  }
  return toHex(digest);
};

const newSalt = () => toHex(crypto.getRandomValues(new Uint8Array(16)).buffer);

export const MIN_SECRET_LENGTH = 4;

interface AppLockState extends PersistedLock {
  locked: boolean;
  failedAttempts: number;
  lockoutUntil: number;
  lock: () => void;
  unlock: (secret: string) => Promise<boolean>;
  verify: (secret: string) => Promise<boolean>;
  enable: (secret: string) => Promise<void>;
  changeSecret: (secret: string) => Promise<void>;
  disable: () => void;
  setTimeoutMinutes: (minutes: number) => void;
  setShortcutEnabled: (enabled: boolean) => void;
}

const initial = load();

export const useAppLock = create<AppLockState>((set, get) => {
  const persist = () => {
    const { enabled, salt, hash, timeoutMinutes, shortcutEnabled } = get();
    save({ enabled, salt, hash, timeoutMinutes, shortcutEnabled });
  };

  return {
    ...initial,
    // Locked on launch when the feature is on.
    locked: initial.enabled,
    failedAttempts: 0,
    lockoutUntil: 0,

    lock: () => {
      if (get().enabled) set({ locked: true });
    },

    verify: async (secret) => {
      const { salt, hash } = get();
      if (!salt || !hash) return false;
      return (await hashSecret(secret, salt)) === hash;
    },

    unlock: async (secret) => {
      if (Date.now() < get().lockoutUntil) return false;
      const ok = await get().verify(secret);
      if (ok) {
        set({ locked: false, failedAttempts: 0, lockoutUntil: 0 });
        return true;
      }
      const failedAttempts = get().failedAttempts + 1;
      // After 5 misses, back off 30s, doubling for each further miss batch.
      const lockoutUntil =
        failedAttempts >= 5
          ? Date.now() + 30_000 * 2 ** Math.min(Math.floor(failedAttempts / 5) - 1, 6)
          : 0;
      set({ failedAttempts, lockoutUntil });
      return false;
    },

    enable: async (secret) => {
      const salt = newSalt();
      const hash = await hashSecret(secret, salt);
      set({ enabled: true, salt, hash, locked: false, failedAttempts: 0, lockoutUntil: 0 });
      persist();
    },

    changeSecret: async (secret) => {
      const salt = newSalt();
      const hash = await hashSecret(secret, salt);
      set({ salt, hash });
      persist();
    },

    disable: () => {
      set({ enabled: false, salt: '', hash: '', locked: false, failedAttempts: 0, lockoutUntil: 0 });
      persist();
    },

    setTimeoutMinutes: (timeoutMinutes) => {
      set({ timeoutMinutes });
      persist();
    },

    setShortcutEnabled: (shortcutEnabled) => {
      set({ shortcutEnabled });
      persist();
    },
  };
});
