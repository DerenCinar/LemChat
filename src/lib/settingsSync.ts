/**
 * Cross-device settings sync (web, Windows, macOS, Linux, ChromeOS, Android).
 *
 * Every client persists preferences in localStorage. This module mirrors a
 * whitelist of those keys into the signed-in user's `user_settings` row in
 * Supabase, so choices follow the account instead of the device.
 *
 *  - Writes are detected by wrapping localStorage.setItem/removeItem, so the
 *    existing code that saves settings does not need to change.
 *  - Each key carries a timestamp; the newest write wins (server merges per key).
 *  - Remote changes arrive via realtime, window focus and sign-in, and are
 *    applied back into localStorage and the live UI through `onApplied`.
 *
 * Deliberately NOT synced (device-specific or sensitive): app lock, Supabase
 * connection config, auth session, call window position / output device,
 * message caches, Signal keys, sticker packs (too large for a settings row).
 */
import { getSupabaseClient } from './supabase';

interface Entry {
  v: string | null;
  t: number;
}
type EntryMap = Record<string, Entry>;

const SYNCED_KEYS = new Set<string>([
  'skellytalk_theme',
  'skellytalk_font',
  'skellytalk_font_size',
  'skellytalk_profanity',
  'skellytalk_liquid_glass',
  'lemchat_notif_enabled',
  'lemchat_notif_focused',
  'lemchat_sound_enabled',
  'lemchat-voice-filter',
  'skellytalk-app-logo',
  // Game progress
  'skellytalk_2048_best',
  'skellytalk_cryptle_v1',
  'skellytalk_cryptle_modes_v1',
  'skellytalk_soulbattle_v1',
]);

const SYNCED_PREFIXES = [
  'skellytalk_identity_', // pronouns, bio, activity, status (per user id)
  'lemchat_contact_aliases_', // nicknames for contacts (per user id)
  'skellytalk_private_note_', // private notes about other users
];

const META_KEY = 'lemchat_sync_meta_v1'; // key -> last local-write timestamp
const PENDING_KEY = 'lemchat_sync_pending_v1'; // keys not yet pushed
const OWNER_KEY = 'lemchat_sync_owner_v1'; // user id the local values belong to

const PUSH_DEBOUNCE_MS = 1500;
const FOCUS_SYNC_MIN_GAP_MS = 15_000;

export const isSyncedKey = (key: string): boolean =>
  SYNCED_KEYS.has(key) || SYNCED_PREFIXES.some((p) => key.startsWith(p));

/* ---------- raw storage (bypasses our own hook) ---------- */

const rawGet = Storage.prototype.getItem;
const rawSet = Storage.prototype.setItem;
const rawRemove = Storage.prototype.removeItem;

const readJson = <T>(key: string, fallback: T): T => {
  try {
    const raw = rawGet.call(localStorage, key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};
const writeJson = (key: string, value: unknown) => {
  try {
    rawSet.call(localStorage, key, JSON.stringify(value));
  } catch {
    /* quota / private mode — sync is best effort */
  }
};

const getMeta = () => readJson<Record<string, number>>(META_KEY, {});
const getPending = () => new Set(readJson<string[]>(PENDING_KEY, []));
const savePending = (s: Set<string>) => writeJson(PENDING_KEY, [...s]);

/* ---------- state ---------- */

let activeUserId: string | null = null;
let applying = false;
let hookInstalled = false;
let pushTimer: ReturnType<typeof setTimeout> | null = null;
let pushing = false;
let lastSyncAt = 0;
let onAppliedCb: ((changedKeys: string[]) => void) | null = null;
let realtimeCleanup: (() => void) | null = null;
let focusHandler: (() => void) | null = null;

/* ---------- local change detection ---------- */

const noteLocalChange = (key: string) => {
  const meta = getMeta();
  meta[key] = Date.now();
  writeJson(META_KEY, meta);
  const pending = getPending();
  pending.add(key);
  savePending(pending);
  schedulePush();
};

const installHook = () => {
  if (hookInstalled || typeof Storage === 'undefined') return;
  hookInstalled = true;

  Storage.prototype.setItem = function (this: Storage, key: string, value: string) {
    if (this === localStorage && !applying && activeUserId && isSyncedKey(key)) {
      const previous = rawGet.call(this, key);
      rawSet.call(this, key, value);
      if (previous !== String(value)) noteLocalChange(key);
      return;
    }
    rawSet.call(this, key, value);
  };

  Storage.prototype.removeItem = function (this: Storage, key: string) {
    if (this === localStorage && !applying && activeUserId && isSyncedKey(key)) {
      const had = rawGet.call(this, key) !== null;
      rawRemove.call(this, key);
      if (had) noteLocalChange(key);
      return;
    }
    rawRemove.call(this, key);
  };
};

/* ---------- merge / apply ---------- */

const localValue = (key: string): string | null => rawGet.call(localStorage, key);

const localTimestamp = (key: string, meta: Record<string, number>): number => {
  if (meta[key] != null) return meta[key];
  // Value that predates sync: treat as older than any real remote write.
  return localValue(key) !== null ? 1 : 0;
};

/** Applies remote entries that are newer than local ones. Returns changed keys. */
const applyRemote = (remote: EntryMap): string[] => {
  const meta = getMeta();
  const pending = getPending();
  const changed: string[] = [];

  applying = true;
  try {
    for (const [key, entry] of Object.entries(remote)) {
      if (!isSyncedKey(key) || !entry || typeof entry.t !== 'number') continue;
      const localT = localTimestamp(key, meta);
      if (entry.t <= localT) continue;

      const current = localValue(key);
      if (entry.v === null) {
        if (current !== null) {
          rawRemove.call(localStorage, key);
          changed.push(key);
        }
      } else if (current !== entry.v) {
        try {
          rawSet.call(localStorage, key, entry.v);
          changed.push(key);
        } catch {
          continue; // quota — keep going with the rest
        }
      }
      meta[key] = entry.t;
      pending.delete(key);
    }
  } finally {
    applying = false;
  }

  writeJson(META_KEY, meta);
  savePending(pending);
  return changed;
};

/** Local keys that are newer than (or missing from) the remote copy. */
const collectOutgoing = (remote: EntryMap): EntryMap => {
  const meta = getMeta();
  const pending = getPending();
  const out: EntryMap = {};

  const consider = (key: string) => {
    if (!isSyncedKey(key)) return;
    const value = localValue(key);
    const localT = localTimestamp(key, meta);
    const remoteT = remote[key]?.t ?? 0;
    if (localT <= remoteT) {
      pending.delete(key);
      return;
    }
    if (value === null && !remote[key]) return; // nothing to tombstone
    out[key] = { v: value, t: localT };
  };

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) consider(key);
  }
  for (const key of pending) consider(key); // includes locally deleted keys
  savePending(pending);
  return out;
};

const notifyApplied = (changed: string[]) => {
  if (changed.length && onAppliedCb) {
    try {
      onAppliedCb(changed);
    } catch (err) {
      console.warn('[settingsSync] onApplied failed', err);
    }
  }
};

/* ---------- network ---------- */

const schedulePush = () => {
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushTimer = null;
    void pushPending();
  }, PUSH_DEBOUNCE_MS);
};

const pushPending = async () => {
  const supabase = getSupabaseClient();
  const userId = activeUserId;
  if (!supabase || !userId || pushing) return;

  const pending = getPending();
  if (!pending.size) return;

  const meta = getMeta();
  const patch: EntryMap = {};
  for (const key of pending) {
    patch[key] = { v: localValue(key), t: meta[key] ?? Date.now() };
  }

  pushing = true;
  try {
    const { data, error } = await supabase.rpc('merge_user_settings', { patch });
    if (error) throw error;
    if (activeUserId !== userId) return;

    // Whatever we sent is now on the server; clear it unless it changed meanwhile.
    const stillPending = getPending();
    const metaNow = getMeta();
    for (const key of Object.keys(patch)) {
      if ((metaNow[key] ?? 0) === patch[key].t) stillPending.delete(key);
    }
    savePending(stillPending);

    if (data && typeof data === 'object') notifyApplied(applyRemote(data as EntryMap));
  } catch (err) {
    console.warn('[settingsSync] push failed; will retry', err);
    setTimeout(schedulePush, 15_000);
  } finally {
    pushing = false;
    if (getPending().size && !pushTimer) schedulePush();
  }
};

/** Full two-way sync: pull remote, apply newer, push anything newer locally. */
export const syncSettingsNow = async (): Promise<void> => {
  const supabase = getSupabaseClient();
  const userId = activeUserId;
  if (!supabase || !userId) return;
  lastSyncAt = Date.now();

  try {
    const { data, error } = await supabase
      .from('user_settings')
      .select('data')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    if (activeUserId !== userId) return;

    const remote = (data?.data ?? {}) as EntryMap;
    notifyApplied(applyRemote(remote));

    const outgoing = collectOutgoing(remote);
    if (Object.keys(outgoing).length) {
      const pending = getPending();
      const meta = getMeta();
      for (const [key, entry] of Object.entries(outgoing)) {
        pending.add(key);
        meta[key] = entry.t;
      }
      savePending(pending);
      writeJson(META_KEY, meta);
      await pushPending();
    }
  } catch (err) {
    // Most likely the user_settings migration has not been run yet.
    console.warn('[settingsSync] sync failed', err);
  }
};

const subscribeRealtime = (userId: string) => {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  try {
    const channel = supabase
      .channel(`user-settings-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_settings', filter: `user_id=eq.${userId}` },
        (payload) => {
          const row = payload.new as { data?: EntryMap } | undefined;
          if (row?.data) notifyApplied(applyRemote(row.data));
        }
      )
      .subscribe();
    realtimeCleanup = () => {
      void supabase.removeChannel(channel);
    };
  } catch (err) {
    console.warn('[settingsSync] realtime unavailable', err);
  }
};

/* ---------- public API ---------- */

/**
 * Begin syncing for `userId`. `onApplied` is called whenever remote values were
 * written to localStorage so the app can refresh live state (theme, fonts, …).
 */
export const startSettingsSync = async (
  userId: string,
  onApplied: (changedKeys: string[]) => void
): Promise<void> => {
  if (activeUserId === userId) return;
  stopSettingsSync();
  installHook();

  onAppliedCb = onApplied;

  // If another account used this device, its values must not leak into this
  // account's remote row: wipe local synced keys and let the remote repopulate.
  const owner = rawGet.call(localStorage, OWNER_KEY);
  if (owner && owner !== userId) {
    applying = true;
    try {
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && isSyncedKey(k)) keys.push(k);
      }
      keys.forEach((k) => rawRemove.call(localStorage, k));
    } finally {
      applying = false;
    }
    rawRemove.call(localStorage, META_KEY);
    rawRemove.call(localStorage, PENDING_KEY);
    onApplied(['*']);
  }
  rawSet.call(localStorage, OWNER_KEY, userId);

  activeUserId = userId;

  focusHandler = () => {
    if (document.visibilityState === 'hidden') return;
    if (Date.now() - lastSyncAt > FOCUS_SYNC_MIN_GAP_MS) void syncSettingsNow();
  };
  window.addEventListener('focus', focusHandler);
  document.addEventListener('visibilitychange', focusHandler);
  window.addEventListener('online', focusHandler);

  subscribeRealtime(userId);
  await syncSettingsNow();
};

export const stopSettingsSync = (): void => {
  activeUserId = null;
  onAppliedCb = null;
  if (pushTimer) {
    clearTimeout(pushTimer);
    pushTimer = null;
  }
  realtimeCleanup?.();
  realtimeCleanup = null;
  if (focusHandler) {
    window.removeEventListener('focus', focusHandler);
    document.removeEventListener('visibilitychange', focusHandler);
    window.removeEventListener('online', focusHandler);
    focusHandler = null;
  }
};
