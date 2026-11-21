import { create } from 'zustand';
import { hashWith, newSalt, safeEqual, type LockKdf } from '../lib/lockHash';

const STORAGE_KEY = 'skellytalk_applock_v1';

interface PersistedLock {
  enabled: boolean;
  salt: string;
  hash: string;
  kdf: LockKdf;
  timeoutMinutes: number; // 0 = never auto-lock
  shortcutEnabled: boolean;
}

const DEFAULTS: PersistedLock = {
  enabled: false,
  salt: '',
  hash: '',
  kdf: 'legacy-sha256',
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
    const { enabled, salt, hash, kdf, timeoutMinutes, shortcutEnabled } = get();
    save({ enabled, salt, hash, kdf, timeoutMinutes, shortcutEnabled });
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
      const { salt, hash, kdf } = get();
      if (!salt || !hash) return false;
      const ok = safeEqual(await hashWith(kdf, secret, salt), hash);
      if (ok && kdf !== 'pbkdf2') {
        // Transparently upgrade old locks to PBKDF2 now that we know the secret.
        const newS = newSalt();
        set({ salt: newS, hash: await hashWith('pbkdf2', secret, newS), kdf: 'pbkdf2' });
        persist();
      }
      return ok;
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
      const hash = await hashWith('pbkdf2', secret, salt);
      set({ enabled: true, salt, hash, kdf: 'pbkdf2', locked: false, failedAttempts: 0, lockoutUntil: 0 });
      persist();
    },

    changeSecret: async (secret) => {
      const salt = newSalt();
      const hash = await hashWith('pbkdf2', secret, salt);
      set({ salt, hash, kdf: 'pbkdf2' });
      persist();
    },

    disable: () => {
      set({ enabled: false, salt: '', hash: '', kdf: 'pbkdf2', locked: false, failedAttempts: 0, lockoutUntil: 0 });
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
