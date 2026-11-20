import React, { useMemo } from 'react';
import { Flame, MessageCircle, Smile, CalendarHeart, Lock } from 'lucide-react';
import type { Message } from '../types/chat';

const EMOJI_RE = /\p{Extended_Pictographic}/u;

const segmenter =
  typeof Intl !== 'undefined' && 'Segmenter' in Intl
    ? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
    : null;

const extractEmojis = (text: string): string[] => {
  if (!text) return [];
  if (segmenter) {
    const out: string[] = [];
    for (const { segment } of segmenter.segment(text)) {
      if (EMOJI_RE.test(segment)) out.push(segment);
    }
    return out;
  }
  return Array.from(text).filter((ch) => EMOJI_RE.test(ch));
};

const dayKey = (d: Date) =>
  d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();

const DAY_MS = 86_400_000;

export interface FriendshipStatsData {
  totalMessages: number;
  sentByMe: number;
  longestStreak: number;
  topEmoji: string | null;
  topEmojiCount: number;
  firstMessageAt: Date | null;
}

export const computeFriendshipStats = (messages: Message[]): FriendshipStats => {
  const live = messages.filter((m) => !m.deletedAt && m.content !== '');
  const days = new Set<number>();
  const dayStarts: number[] = [];
  const emojiCounts = new Map<string, number>();
  let sentByMe = 0;
  let first: Date | null = null;

  for (const m of live) {
    const d = new Date(m.createdAt);
    if (Number.isNaN(d.getTime())) continue;
    if (!first || d < first) first = d;
    if (m.isMe) sentByMe += 1;
    const key = dayKey(d);
    if (!days.has(key)) {
      days.add(key);
      dayStarts.push(new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12).getTime());
    }
    for (const e of extractEmojis(m.content)) {
      emojiCounts.set(e, (emojiCounts.get(e) ?? 0) + 1);
    }
    for (const r of m.reactions ?? []) {
      emojiCounts.set(r.emoji, (emojiCounts.get(r.emoji) ?? 0) + Math.max(1, r.count));
    }
  }

  dayStarts.sort((a, b) => a - b);
  let longest = 0;
  let run = 0;
  for (let i = 0; i < dayStarts.length; i += 1) {
    // Noon-to-noon, rounded, so DST shifts don't break a run.
    run =
      i > 0 && Math.round((dayStarts[i] - dayStarts[i - 1]) / DAY_MS) === 1 ? run + 1 : 1;
    if (run > longest) longest = run;
  }

  let topEmoji: string | null = null;
  let topEmojiCount = 0;
  for (const [emoji, count] of emojiCounts) {
    if (count > topEmojiCount) {
      topEmoji = emoji;
      topEmojiCount = count;
    }
  }

  return {
    totalMessages: live.length,
    sentByMe,
    longestStreak: longest,
    topEmoji,
    topEmojiCount,
    firstMessageAt: first,
  };
};

type FriendshipStats = FriendshipStatsData;

const Row: React.FC<{ icon: React.ReactNode; label: string; value: React.ReactNode }> = ({
  icon,
  label,
  value,
}) => (
  <div className="flex items-center justify-between gap-2 text-xs">
    <span className="flex items-center gap-1.5 text-emerald-800/65 dark:text-emerald-200/60">
      {icon}
      {label}
    </span>
    <span className="truncate text-right font-semibold text-emerald-950 dark:text-white">
      {value}
    </span>
  </div>
);

export const FriendshipStatsPanel: React.FC<{ messages: Message[] }> = ({ messages }) => {
  const stats = useMemo(() => computeFriendshipStats(messages), [messages]);

  return (
    <div className="space-y-2">
      <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-800/55 dark:text-emerald-200/50">
        Friendship Stats
        <Lock className="h-2.5 w-2.5 opacity-70" aria-label="Private to you" />
      </p>
      <div className="glass-pill space-y-2 rounded-xl px-3 py-2.5">
        <Row
          icon={<Flame className="h-3 w-3 text-orange-500" />}
          label="Longest streak"
          value={
            stats.longestStreak > 0
              ? `${stats.longestStreak} day${stats.longestStreak === 1 ? '' : 's'}`
              : '—'
          }
        />
        <Row
          icon={<MessageCircle className="h-3 w-3 text-[#22C55E]" />}
          label="Messages sent"
          value={
            <>
              {stats.totalMessages.toLocaleString()}
              <span className="ml-1 font-normal opacity-60">
                ({stats.sentByMe.toLocaleString()} you)
              </span>
            </>
          }
        />
        <Row
          icon={<Smile className="h-3 w-3 text-amber-500" />}
          label="Top emoji"
          value={
            stats.topEmoji ? (
              <>
                <span className="text-sm">{stats.topEmoji}</span>
                <span className="ml-1 font-normal opacity-60">×{stats.topEmojiCount}</span>
              </>
            ) : (
              '—'
            )
          }
        />
        <Row
          icon={<CalendarHeart className="h-3 w-3 text-rose-500" />}
          label="First message"
          value={
            stats.firstMessageAt
              ? stats.firstMessageAt.toLocaleDateString([], { dateStyle: 'medium' })
              : '—'
          }
        />
      </div>
    </div>
  );
};
