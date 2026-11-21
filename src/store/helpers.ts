import type { Conversation, LiquidGlassTheme, ProfanityFilter, Reaction } from '../types/chat';

const PROFANITY_WORDS = [
  'fuck', 'shit', 'bitch', 'asshole', 'bastard', 'damn', 'cunt', 'dick', 'cock', 'penis',
  'pussy', 'vagina', 'whore', 'slut', 'piss', 'twat', 'wank', 'bollocks', 'prick', 'dildo',
  'tits', 'boobs', 'nigg', 'fag',
];
// Common character substitutions used to dodge filters (f*ck, sh1t, d!ck ...)
const LEET: Record<string, string> = { a: '[a@4]', e: '[e3]', i: '[i1!|]', o: '[o0]', s: '[s$5]', u: '[uv*]', c: '[ck]', k: '[kc]' };
const SUFFIX = '(?:s|es|ed|er|ers|ing|in|y|head|heads|face|hole|holes|wad|bag)?';
const buildPattern = (word: string) =>
  new RegExp(`\\b${[...word].map((ch) => `${LEET[ch] ?? ch}+`).join('')}${SUFFIX}\\b`, 'gi');
export const filterProfanity = (text: string, mode: ProfanityFilter) => {
  if (mode === 'off') return text;
  return PROFANITY_WORDS.reduce((result, word) => {
    const pattern = buildPattern(word);
    return result.replace(pattern, (match) =>
      mode === 'strict' ? '****' : `${match[0]}${'*'.repeat(Math.max(2, match.length - 1))}`
    );
  }, text);
};

export function formatCallDuration(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  if (m >= 60) return `${Math.floor(m / 60)}h ${m % 60}m`;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export function buildIceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ];
  // Optional TURN relay (needed for calls behind symmetric NAT / strict firewalls).
  // Configure VITE_TURN_URL (comma-separated), VITE_TURN_USERNAME, VITE_TURN_CREDENTIAL.
  const env = import.meta.env;
  const turnUrl = env.VITE_TURN_URL as string | undefined;
  if (turnUrl) {
    servers.push({
      urls: turnUrl.split(',').map((u) => u.trim()).filter(Boolean),
      username: env.VITE_TURN_USERNAME as string | undefined,
      credential: env.VITE_TURN_CREDENTIAL as string | undefined,
    });
  }
  return servers;
}

export const RTC_CONFIG: RTCConfiguration = {
  iceServers: buildIceServers(),
};

export function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  let format: LiquidGlassTheme['timestampFormat'] = '12h';
  try {
    const parsed = JSON.parse(localStorage.getItem('skellytalk_liquid_glass') || '{}') as Partial<LiquidGlassTheme>;
    format = parsed.timestampFormat ?? '12h';
  } catch {
    format = '12h';
  }
  if (format === 'relative') {
    const diffMinutes = Math.max(0, Math.round((now.getTime() - date.getTime()) / 60000));
    if (diffMinutes < 1) return 'now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.round(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.round(diffHours / 24)}d ago`;
  }
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (isToday) {
    return date.toLocaleTimeString([], format === '24h'
      ? { hour: '2-digit', minute: '2-digit', hour12: false }
      : format === 'seconds'
        ? { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }
        : { hour: '2-digit', minute: '2-digit', hour12: true });
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function bytesToBase64(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

export function base64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function computeTotalUnread(conversations: Conversation[]): number {
  return conversations.reduce((sum, c) => sum + c.unreadCount, 0);
}

export function buildReactionsList(
  rows: Array<{ emoji: string; user_id: string }>,
  selfId: string
): Reaction[] {
  const map = new Map<string, { count: number; reactedByMe: boolean }>();
  for (const r of rows) {
    const entry = map.get(r.emoji) ?? { count: 0, reactedByMe: false };
    entry.count += 1;
    if (r.user_id === selfId) entry.reactedByMe = true;
    map.set(r.emoji, entry);
  }
  return Array.from(map.entries()).map(([emoji, data]) => ({
    emoji,
    count: data.count,
    reactedByMe: data.reactedByMe,
  }));
}
