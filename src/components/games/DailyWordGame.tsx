import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, RotateCcw, Share2, Sparkles } from 'lucide-react';

type Share = (text: string) => void;
type LetterState = 'correct' | 'present' | 'absent';
type GameStatus = 'playing' | 'won' | 'lost';

const STORAGE_KEY = 'skellytalk_cryptle_v1';

const RAW_DAILY_WORDS = [
  'SKULL', 'BONES', 'GHOST', 'CRYPT', 'FLAME', 'PRISM', 'SPARK', 'CRISP', 'BRAVE', 'CLOUD',
  'DREAM', 'FROST', 'GLIDE', 'HEART', 'LIGHT', 'MAGIC', 'NIGHT', 'OCEAN', 'PEARL', 'QUEST',
  'RIVER', 'SHINE', 'STORM', 'TIGER', 'VIVID', 'WORLD', 'ETHER', 'PIXEL', 'LUCID', 'ORBIT',
  'SOLAR', 'LUNAR', 'COMET', 'PULSE', 'BLAZE', 'CHILL', 'DRIFT', 'EMBER', 'FAITH', 'GLEAM',
  'HAVEN', 'IVORY', 'JOLLY', 'KARMA', 'LEMON', 'MIRTH', 'NOBLE', 'OASIS', 'PLUME', 'QUART',
  'REALM', 'SCENT', 'THORN', 'ULTRA', 'VAULT', 'WHIRL', 'XENON', 'YACHT', 'ZESTY', 'AMBER',
  'BLOOM', 'CROWN', 'DUSKY', 'ELITE', 'FABLE', 'GLORY', 'HONEY', 'INDEX', 'JOKER', 'KNIGHT',
  'LATCH', 'MANGO', 'NEXUS', 'OPERA', 'PANDA', 'QUILL', 'RADAR', 'SABLE', 'TEMPO', 'UNIFY',
  'VAPOR', 'WALTZ', 'YIELD', 'ZEBRA', 'ACORN', 'BADGE', 'CEDAR', 'DELTA', 'EAGLE', 'FJORD',
  'GRACE', 'HASTE', 'IGLOO', 'JAUNT', 'KAYAK', 'LILAC', 'MAPLE', 'NINJA', 'OLIVE', 'PILOT',
  'QUILT', 'ROBIN', 'SAUCE', 'TORCH', 'URBAN', 'VEXED', 'WHEAT', 'YOUTH', 'ZONED', 'ANGEL',
  'BEACH', 'CHARM', 'DANCE', 'ENVOY', 'FLUTE', 'GRAPE', 'HUMOR', 'INLET', 'JELLY', 'KOALA',
  'LOVER', 'MOCHA', 'NERVE', 'ONION', 'PIANO', 'QUIRK', 'ROAST', 'SHARK', 'TRAIL', 'USHER',
  'VALVE', 'WHALE', 'YODEL', 'ZINGY', 'ALERT', 'BLINK', 'CANDY', 'DAISY', 'EARTH', 'FERNS',
  'GIANT', 'HOVER', 'IRONY', 'JAZZY', 'KIOSK', 'LLAMA', 'MEDAL', 'NORTH', 'OTTER', 'PLAZA',
  'QUOTA', 'RELIC', 'SCALE', 'TITAN', 'UMBRA', 'VERGE', 'WINDY', 'YEARN', 'ZIPPY', 'APPLE',
  'BISON', 'CRANE', 'DONUT', 'ELFIN', 'FLOCK', 'GLOBE', 'HERON', 'IMAGE', 'JEWEL', 'KNEEL',
  'LOTUS', 'MELON', 'NOVEL', 'ORCHID', 'PEACH', 'RALLY', 'SONIC', 'TULIP', 'UNITY', 'VIPER',
  'WITCH', 'ACUTE', 'BLUSH', 'CLOVER', 'DODGE', 'EQUIP', 'FOCUS', 'GRIND', 'HYPER', 'IVORY',
  'JUMBO', 'KNACK', 'LYRIC', 'MIRAGE', 'NYMPH', 'OMEGA', 'PHANT', 'QUICK', 'ROGUE', 'SIREN',
  'SWIFT', 'TREND', 'UPSET', 'VALOR', 'WRECK', 'SYNTH', 'CRYPT', 'AUDIO', 'SLATE', 'RAISE',
  'STARE', 'LEAST', 'RATIO', 'TONIC', 'CROWD', 'SPINE', 'GRAVE', 'SHADE', 'CLOAK', 'HAUNT',
  'MUMMY', 'WRAITH', 'SPIRIT', 'BRAIN', 'TOOTH', 'NOISE', 'CHEER', 'GLINT', 'SHARD', 'CROWN',
  'FORGE', 'BLAST', 'FROTH', 'MELLOW', 'CHIME', 'BRISK', 'MISTY', 'GLOWS', 'SWIRL', 'BLOOD',
];

const DAILY_WORDS = Array.from(
  new Set(RAW_DAILY_WORDS.map((w) => w.trim().toUpperCase()).filter((w) => /^[A-Z]{5}$/.test(w))),
);
const DAILY_WORD_SET = new Set(DAILY_WORDS);

interface CryptleSave {
  dateKey: string;
  guesses: string[];
  status: GameStatus;
  streak: number;
  maxStreak: number;
  played: number;
  wins: number;
  lastWinDate: string | null;
}

const formatDateKey = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const getCryptleDateKey = (): string => formatDateKey(new Date());

const getYesterdayKey = (): string => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return formatDateKey(d);
};

const hashDateKey = (key: string): number => {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

export const getDailyCryptleWord = (dateKey: string): string => {
  const idx = hashDateKey(`cryptle:${dateKey}`) % DAILY_WORDS.length;
  return DAILY_WORDS[idx];
};

export const getCryptlePuzzleNumber = (dateKey: string): number => {
  const [y, m, d] = dateKey.split('-').map(Number);
  const utcCurrent = Date.UTC(y, m - 1, d);
  const utcEpoch = Date.UTC(2026, 0, 1);
  return Math.max(1, Math.floor((utcCurrent - utcEpoch) / 86400000) + 1);
};

export const hasCompletedDailyCryptleToday = (): boolean => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const saved = JSON.parse(raw) as CryptleSave;
    return saved.dateKey === getCryptleDateKey() && (saved.status === 'won' || saved.status === 'lost');
  } catch {
    return false;
  }
};

const evaluateGuess = (guess: string, target: string): LetterState[] => {
  const result: LetterState[] = Array(5).fill('absent');
  const remaining: Record<string, number> = {};

  for (let i = 0; i < 5; i++) {
    if (guess[i] === target[i]) {
      result[i] = 'correct';
    } else {
      const ch = target[i];
      remaining[ch] = (remaining[ch] ?? 0) + 1;
    }
  }

  for (let i = 0; i < 5; i++) {
    if (result[i] === 'correct') continue;
    const ch = guess[i];
    if ((remaining[ch] ?? 0) > 0) {
      result[i] = 'present';
      remaining[ch] -= 1;
    }
  }

  return result;
};

const isPlausibleWord = (word: string): boolean => {
  if (!/^[A-Z]{5}$/.test(word)) return false;
  if (DAILY_WORD_SET.has(word)) return true;
  if (!/[AEIOUY]/.test(word)) return false;
  if (/(.)\1{3,}/.test(word)) return false;
  return true;
};

const KEYBOARD_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACK'],
];

const PRIORITY: Record<LetterState, number> = { absent: 1, present: 2, correct: 3 };

const loadDailySave = (today: string): CryptleSave => {
  const yesterday = getYesterdayKey();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as CryptleSave;
      if (parsed.dateKey === today) {
        return parsed;
      }
      const keepStreak = parsed.lastWinDate === yesterday || parsed.lastWinDate === today;
      return {
        dateKey: today,
        guesses: [],
        status: 'playing',
        streak: keepStreak ? parsed.streak ?? 0 : 0,
        maxStreak: parsed.maxStreak ?? 0,
        played: parsed.played ?? 0,
        wins: parsed.wins ?? 0,
        lastWinDate: parsed.lastWinDate ?? null,
      };
    }
  } catch {
    // ignore storage parse failures
  }
  return {
    dateKey: today,
    guesses: [],
    status: 'playing',
    streak: 0,
    maxStreak: 0,
    played: 0,
    wins: 0,
    lastWinDate: null,
  };
};

const getCountdownToMidnight = (): string => {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
  const diff = Math.max(0, Math.floor((next.getTime() - now.getTime()) / 1000));
  const h = String(Math.floor(diff / 3600)).padStart(2, '0');
  const m = String(Math.floor((diff % 3600) / 60)).padStart(2, '0');
  const s = String(diff % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
};

export const DailyWordGame: React.FC<{ share: Share }> = ({ share }) => {
  const today = getCryptleDateKey();
  const puzzleNumber = getCryptlePuzzleNumber(today);
  const dailyTarget = useMemo(() => getDailyCryptleWord(today), [today]);

  const [dailySave, setDailySave] = useState<CryptleSave>(() => loadDailySave(today));
  const [practiceMode, setPracticeMode] = useState(false);
  const [practiceTarget, setPracticeTarget] = useState<string>(() => {
    const candidates = DAILY_WORDS.filter((w) => w !== dailyTarget);
    return candidates[Math.floor(Math.random() * candidates.length)] ?? 'SKULL';
  });
  const [practiceGuesses, setPracticeGuesses] = useState<string[]>([]);
  const [practiceStatus, setPracticeStatus] = useState<GameStatus>('playing');

  const [currentGuess, setCurrentGuess] = useState('');
  const [shakeRow, setShakeRow] = useState<number | null>(null);
  const [flippingRow, setFlippingRow] = useState<number | null>(null);
  const [wonRow, setWonRow] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(getCountdownToMidnight);

  const toastTimer = useRef<ReturnType<typeof setTimeout>>();
  const flipTimer = useRef<ReturnType<typeof setTimeout>>();

  const target = practiceMode ? practiceTarget : dailyTarget;
  const guesses = practiceMode ? practiceGuesses : dailySave.guesses;
  const status = practiceMode ? practiceStatus : dailySave.status;

  useEffect(() => {
    if (!practiceMode) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(dailySave));
      } catch {
        // ignore quota errors
      }
    }
  }, [dailySave, practiceMode]);

  useEffect(() => {
    const id = setInterval(() => setCountdown(getCountdownToMidnight()), 1000);
    return () => {
      clearInterval(id);
      clearTimeout(toastTimer.current);
      clearTimeout(flipTimer.current);
    };
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 1650);
  }, []);

  const triggerShake = useCallback((rowIdx: number) => {
    setShakeRow(rowIdx);
    setTimeout(() => setShakeRow((prev) => (prev === rowIdx ? null : prev)), 460);
  }, []);

  const submitGuess = useCallback(() => {
    if (status !== 'playing' || flippingRow !== null) return;

    if (currentGuess.length < 5) {
      triggerShake(guesses.length);
      showToast('Not enough letters');
      return;
    }

    if (!isPlausibleWord(currentGuess)) {
      triggerShake(guesses.length);
      showToast('Enter a valid 5-letter word');
      return;
    }

    const rowIdx = guesses.length;
    const nextGuesses = [...guesses, currentGuess];
    const solved = currentGuess === target;
    const nextStatus: GameStatus = solved ? 'won' : nextGuesses.length >= 6 ? 'lost' : 'playing';

    setFlippingRow(rowIdx);
    setCurrentGuess('');

    if (practiceMode) {
      setPracticeGuesses(nextGuesses);
      setPracticeStatus(nextStatus);
    } else {
      setDailySave((prev) => {
        const finishedNow = prev.status === 'playing' && nextStatus !== 'playing';
        const nextPlayed = finishedNow ? prev.played + 1 : prev.played;
        const wonNow = prev.status === 'playing' && nextStatus === 'won';
        const nextWins = wonNow ? prev.wins + 1 : prev.wins;
        const nextStreak = wonNow
          ? prev.lastWinDate === today
            ? prev.streak
            : prev.streak + 1
          : nextStatus === 'lost'
            ? 0
            : prev.streak;
        return {
          ...prev,
          guesses: nextGuesses,
          status: nextStatus,
          played: nextPlayed,
          wins: nextWins,
          streak: nextStreak,
          maxStreak: Math.max(prev.maxStreak, nextStreak),
          lastWinDate: wonNow ? today : prev.lastWinDate,
        };
      });
    }

    clearTimeout(flipTimer.current);
    flipTimer.current = setTimeout(() => {
      setFlippingRow(null);
      if (solved) {
        setWonRow(rowIdx);
        const cheers = ['Genius!', 'Magnificent!', 'Impressive!', 'Splendid!', 'Great!', 'Phew!'];
        showToast(cheers[rowIdx] ?? 'Nice!');
      } else if (nextStatus === 'lost') {
        showToast(`Word was ${target}`);
      }
    }, 820);
  }, [currentGuess, flippingRow, guesses, practiceMode, showToast, status, target, today, triggerShake]);

  const handleKey = useCallback(
    (key: string) => {
      if (status !== 'playing' || flippingRow !== null) return;
      if (key === 'ENTER') {
        submitGuess();
        return;
      }
      if (key === 'BACK' || key === 'BACKSPACE') {
        setCurrentGuess((g) => g.slice(0, -1));
        return;
      }
      if (/^[A-Z]$/.test(key) && currentGuess.length < 5) {
        setCurrentGuess((g) => g + key);
      }
    },
    [currentGuess.length, flippingRow, status, submitGuess],
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const key = e.key.toUpperCase();
      if (key === 'ENTER' || key === 'BACKSPACE' || /^[A-Z]$/.test(key)) {
        e.preventDefault();
        e.stopPropagation();
        handleKey(key);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleKey]);

  const evaluatedRows = useMemo(
    () => guesses.map((g) => evaluateGuess(g, target)),
    [guesses, target],
  );

  const keyStates = useMemo(() => {
    const map: Record<string, LetterState> = {};
    guesses.forEach((g, rIdx) => {
      // Wait visually until current row finishes flipping
      if (flippingRow === rIdx) return;
      const evals = evaluatedRows[rIdx];
      for (let i = 0; i < 5; i++) {
        const ch = g[i];
        const st = evals[i];
        if (!map[ch] || PRIORITY[st] > PRIORITY[map[ch]]) {
          map[ch] = st;
        }
      }
    });
    return map;
  }, [evaluatedRows, flippingRow, guesses]);

  const startNewPractice = () => {
    const candidates = DAILY_WORDS.filter((w) => w !== practiceTarget && w !== dailyTarget);
    const next = candidates[Math.floor(Math.random() * candidates.length)] ?? 'GHOST';
    setPracticeMode(true);
    setPracticeTarget(next);
    setPracticeGuesses([]);
    setPracticeStatus('playing');
    setCurrentGuess('');
    setWonRow(null);
    setFlippingRow(null);
    setToast(null);
  };

  const handleShare = () => {
    const lines = evaluatedRows.map((row) =>
      row.map((s) => (s === 'correct' ? '🟩' : s === 'present' ? '🟨' : '⬛')).join(''),
    );
    const header = practiceMode
      ? `🦴 Cryptle (Practice) — ${status === 'won' ? `${guesses.length}/6` : 'X/6'}`
      : `🦴 Cryptle #${puzzleNumber} — ${status === 'won' ? `${guesses.length}/6` : 'X/6'}${
          dailySave.streak > 1 ? ` · 🔥${dailySave.streak}` : ''
        }`;
    share(`${header}\n${lines.join('\n')}`);
  };

  const winRate = dailySave.played > 0 ? Math.round((dailySave.wins / dailySave.played) * 100) : 0;

  return (
    <div className="relative flex flex-col items-center select-none">
      {/* Header bar */}
      <div className="mb-2.5 flex w-full items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 font-bold text-emerald-700 dark:text-emerald-300">
            {practiceMode ? 'Practice Word' : `Cryptle #${puzzleNumber}`}
          </span>
          {dailySave.streak > 0 && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/20 px-2 py-0.5 font-semibold text-amber-700 dark:text-amber-300">
              <Flame className="h-3 w-3" /> {dailySave.streak}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {practiceMode ? (
            <>
              <button
                type="button"
                onClick={startNewPractice}
                className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 font-semibold hover:bg-emerald-500/25"
              >
                <RotateCcw className="h-3 w-3" /> New
              </button>
              <button
                type="button"
                onClick={() => {
                  setPracticeMode(false);
                  setCurrentGuess('');
                  setWonRow(null);
                  setToast(null);
                }}
                className="rounded-full bg-emerald-500/15 px-2.5 py-1 font-semibold hover:bg-emerald-500/25"
              >
                Daily
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={startNewPractice}
              className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 font-semibold hover:bg-emerald-500/25"
            >
              <Sparkles className="h-3 w-3" /> Practice
            </button>
          )}
        </div>
      </div>

      {/* Floating toast */}
      <div className="relative h-6 w-full flex items-center justify-center mb-1">
        <AnimatePresence>
          {toast && (
            <motion.div
              key={toast}
              initial={{ opacity: 0, y: -6, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.92 }}
              className="rounded-full bg-emerald-950 px-3 py-0.5 text-[11px] font-bold text-white shadow-lg dark:bg-white dark:text-emerald-950"
            >
              {toast}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 6x5 Board */}
      <div className="grid gap-1.5" style={{ perspective: '700px' }}>
        {Array.from({ length: 6 }, (_, r) => {
          const isSubmitted = r < guesses.length;
          const isCurrent = r === guesses.length && status === 'playing';
          const word = isSubmitted ? guesses[r] : isCurrent ? currentGuess : '';
          const evals = isSubmitted ? evaluatedRows[r] : null;
          const isFlipping = flippingRow === r;
          const isWinWave = wonRow === r;

          return (
            <motion.div
              key={`${practiceMode ? practiceTarget : dailySave.dateKey}-${r}`}
              className="grid grid-cols-5 gap-1.5"
              animate={shakeRow === r ? { x: [0, -8, 8, -6, 6, -3, 3, 0] } : { x: 0 }}
              transition={{ duration: 0.42 }}
            >
              {Array.from({ length: 5 }, (_, c) => {
                const ch = word[c] ?? '';
                const state = evals?.[c];
                const colorCls =
                  state === 'correct'
                    ? 'bg-[#22C55E] border-[#22C55E] text-white shadow-sm shadow-emerald-500/30'
                    : state === 'present'
                      ? 'bg-amber-500 border-amber-500 text-white shadow-sm shadow-amber-500/30'
                      : 'bg-slate-600/80 border-slate-500/70 text-white dark:bg-zinc-700 dark:border-zinc-600';

                return (
                  <motion.div
                    key={c}
                    className="relative h-11 w-11 sm:h-12 sm:w-12"
                    animate={
                      isWinWave
                        ? { y: [0, -10, 0] }
                        : isCurrent && ch
                          ? { scale: [0.86, 1.13, 1] }
                          : { y: 0, scale: 1 }
                    }
                    transition={
                      isWinWave
                        ? { duration: 0.42, delay: c * 0.065, ease: 'easeOut' }
                        : { duration: 0.14 }
                    }
                    style={{ perspective: '600px' }}
                  >
                    <motion.div
                      className="relative h-full w-full"
                      initial={false}
                      animate={{ rotateX: isSubmitted ? 180 : 0 }}
                      transition={
                        isFlipping
                          ? { duration: 0.48, delay: c * 0.1, ease: [0.4, 0, 0.2, 1] }
                          : { duration: 0 }
                      }
                      style={{ transformStyle: 'preserve-3d' }}
                    >
                      {/* Front face (unsubmitted / typing) */}
                      <div
                        className={`absolute inset-0 flex items-center justify-center rounded-lg border-2 text-lg font-extrabold tracking-wider transition-colors ${
                          ch
                            ? 'border-emerald-500/70 bg-emerald-500/10 text-emerald-950 dark:border-white/55 dark:text-white'
                            : 'border-emerald-950/15 bg-black/5 dark:border-white/15 dark:bg-white/5'
                        }`}
                        style={{
                          backfaceVisibility: 'hidden',
                          WebkitBackfaceVisibility: 'hidden',
                        }}
                      >
                        {ch}
                      </div>

                      {/* Back face (revealed state) */}
                      <div
                        className={`absolute inset-0 flex items-center justify-center rounded-lg border-2 text-lg font-extrabold tracking-wider ${colorCls}`}
                        style={{
                          transform: 'rotateX(180deg)',
                          backfaceVisibility: 'hidden',
                          WebkitBackfaceVisibility: 'hidden',
                        }}
                      >
                        {ch}
                      </div>
                    </motion.div>
                  </motion.div>
                );
              })}
            </motion.div>
          );
        })}
      </div>

      {/* Completion summary or countdown */}
      <AnimatePresence>
        {status !== 'playing' && flippingRow === null && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8 }}
            className="mt-3 flex w-full flex-col gap-2 rounded-2xl bg-emerald-500/10 p-2.5 text-xs"
          >
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="font-bold">
                  {status === 'won' ? `Solved in ${guesses.length}/6!` : `Answer: ${target}`}
                </p>
                {!practiceMode && (
                  <p className="text-[11px] opacity-70">
                    Played {dailySave.played} · Win {winRate}% · Best 🔥{dailySave.maxStreak} · Next in {countdown}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={handleShare}
                  className="inline-flex items-center gap-1 rounded-full bg-[#22C55E] px-3 py-1.5 font-semibold text-white shadow hover:brightness-105"
                >
                  <Share2 className="h-3 w-3" /> Share
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* On-screen QWERTY keyboard */}
      <div className="mt-3 flex w-full flex-col gap-1">
        {KEYBOARD_ROWS.map((row, rowIndex) => (
          <div key={rowIndex} className="flex justify-center gap-1">
            {row.map((key) => {
              const wide = key === 'ENTER' || key === 'BACK';
              const st = !wide ? keyStates[key] : undefined;
              const styleCls =
                st === 'correct'
                  ? 'bg-[#22C55E] text-white border-[#22C55E]'
                  : st === 'present'
                    ? 'bg-amber-500 text-white border-amber-500'
                    : st === 'absent'
                      ? 'bg-slate-600/75 text-white/80 border-slate-500/40 dark:bg-zinc-800 dark:text-zinc-400'
                      : 'bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-500/15';

              return (
                <motion.button
                  key={key}
                  type="button"
                  whileTap={{ scale: 0.91 }}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleKey(key)}
                  className={`flex h-9 items-center justify-center rounded-lg border font-bold transition-colors ${
                    wide ? 'px-2.5 text-[10px] sm:px-3' : 'flex-1 max-w-[34px] text-xs'
                  } ${styleCls}`}
                >
                  {key === 'BACK' ? '⌫' : key}
                </motion.button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};
