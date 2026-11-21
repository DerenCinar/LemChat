import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Flame,
  RotateCcw,
  Share2,
  Infinity as InfinityIcon,
  Timer,
  Calendar,
  ShieldAlert,
  Play,
  SkipForward,
} from 'lucide-react';
import { CRYPTLE_ANSWER_WORDS, isValidEnglishWord } from './cryptleDictionary';

type Share = (text: string) => void;
type LetterState = 'correct' | 'present' | 'absent';
type GameStatus = 'playing' | 'won' | 'lost';
type CryptleMode = 'daily' | 'infinite' | 'blitz';
type BlitzDuration = 60 | 180 | 300 | 600;
type BlitzPhase = 'ready' | 'running' | 'ended';

const DAILY_STORAGE_KEY = 'skellytalk_cryptle_v1';
const MODES_STORAGE_KEY = 'skellytalk_cryptle_modes_v1';

const BLITZ_DURATIONS: { sec: BlitzDuration; label: string }[] = [
  { sec: 60, label: '1m' },
  { sec: 180, label: '3m' },
  { sec: 300, label: '5m' },
  { sec: 600, label: '10m' },
];

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

interface CryptleModesSave {
  infiniteBest: number;
  blitzBest: Record<BlitzDuration, number>;
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
  const idx = hashDateKey(`cryptle:${dateKey}`) % CRYPTLE_ANSWER_WORDS.length;
  return CRYPTLE_ANSWER_WORDS[idx];
};

export const getCryptlePuzzleNumber = (dateKey: string): number => {
  const [y, m, d] = dateKey.split('-').map(Number);
  const utcCurrent = Date.UTC(y, m - 1, d);
  const utcEpoch = Date.UTC(2026, 0, 1);
  return Math.max(1, Math.floor((utcCurrent - utcEpoch) / 86400000) + 1);
};

export const hasCompletedDailyCryptleToday = (): boolean => {
  try {
    const raw = localStorage.getItem(DAILY_STORAGE_KEY);
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

const validateHardMode = (guess: string, priorGuesses: string[], target: string): string | null => {
  if (priorGuesses.length === 0) return null;

  const ord = ['1st', '2nd', '3rd', '4th', '5th'];
  const minCounts: Record<string, number> = {};

  for (const prev of priorGuesses) {
    const evals = evaluateGuess(prev, target);
    const rowCounts: Record<string, number> = {};

    for (let i = 0; i < 5; i++) {
      if (evals[i] === 'correct' && guess[i] !== prev[i]) {
        return `${ord[i]} letter must be ${prev[i]}`;
      }
      if (evals[i] === 'correct' || evals[i] === 'present') {
        const ch = prev[i];
        rowCounts[ch] = (rowCounts[ch] ?? 0) + 1;
      }
    }

    for (const [ch, cnt] of Object.entries(rowCounts)) {
      minCounts[ch] = Math.max(minCounts[ch] ?? 0, cnt);
    }
  }

  for (const [ch, needed] of Object.entries(minCounts)) {
    let have = 0;
    for (let i = 0; i < guess.length; i++) {
      if (guess[i] === ch) have++;
    }
    if (have < needed) {
      return needed > 1 ? `Guess must contain ${needed}× ${ch}` : `Guess must contain ${ch}`;
    }
  }

  return null;
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
    const raw = localStorage.getItem(DAILY_STORAGE_KEY);
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
    // ignore storage parse errors
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

const loadModesSave = (): CryptleModesSave => {
  try {
    const raw = localStorage.getItem(MODES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<CryptleModesSave>;
      return {
        infiniteBest: parsed.infiniteBest ?? 0,
        blitzBest: {
          60: parsed.blitzBest?.[60] ?? 0,
          180: parsed.blitzBest?.[180] ?? 0,
          300: parsed.blitzBest?.[300] ?? 0,
          600: parsed.blitzBest?.[600] ?? 0,
        },
      };
    }
  } catch {
    // ignore parse failures
  }
  return {
    infiniteBest: 0,
    blitzBest: { 60: 0, 180: 0, 300: 0, 600: 0 },
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

const formatTimer = (totalSec: number): string => {
  const s = Math.max(0, totalSec);
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${String(m).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
};

export const DailyWordGame: React.FC<{ share: Share }> = ({ share }) => {
  const today = getCryptleDateKey();
  const puzzleNumber = getCryptlePuzzleNumber(today);
  const dailyTarget = useMemo(() => getDailyCryptleWord(today), [today]);

  const [mode, setMode] = useState<CryptleMode>('daily');
  const [hardMode, setHardMode] = useState(false);

  const [dailySave, setDailySave] = useState<CryptleSave>(() => loadDailySave(today));
  const [modesSave, setModesSave] = useState<CryptleModesSave>(loadModesSave);

  const recentWordsRef = useRef<string[]>([dailyTarget]);
  const pickFreshWord = useCallback((exclude?: string) => {
    const recent = new Set(recentWordsRef.current.slice(-30));
    if (exclude) recent.add(exclude);
    const pool = CRYPTLE_ANSWER_WORDS.filter((w) => !recent.has(w));
    const source = pool.length > 0 ? pool : CRYPTLE_ANSWER_WORDS;
    const chosen = source[Math.floor(Math.random() * source.length)] ?? 'SKULL';
    recentWordsRef.current.push(chosen);
    return chosen;
  }, []);

  // Infinite state
  const [infTarget, setInfTarget] = useState<string>(() => pickFreshWord(dailyTarget));
  const [infGuesses, setInfGuesses] = useState<string[]>([]);
  const [infStatus, setInfStatus] = useState<GameStatus>('playing');
  const [infStreak, setInfStreak] = useState(0);
  const [infRoundId, setInfRoundId] = useState(1);

  // Blitz (Timed Infinite) state
  const [blitzDuration, setBlitzDuration] = useState<BlitzDuration>(300);
  const [blitzPhase, setBlitzPhase] = useState<BlitzPhase>('ready');
  const [blitzSecondsLeft, setBlitzSecondsLeft] = useState<number>(300);
  const [blitzTarget, setBlitzTarget] = useState<string>(() => pickFreshWord(dailyTarget));
  const [blitzGuesses, setBlitzGuesses] = useState<string[]>([]);
  const [blitzStatus, setBlitzStatus] = useState<GameStatus>('playing');
  const [blitzSolved, setBlitzSolved] = useState(0);
  const [blitzAttempted, setBlitzAttempted] = useState(0);
  const [blitzRoundId, setBlitzRoundId] = useState(1);

  // UI & animation states
  const [currentGuess, setCurrentGuess] = useState('');
  const [shakeRow, setShakeRow] = useState<number | null>(null);
  const [flippingRow, setFlippingRow] = useState<number | null>(null);
  const [wonRow, setWonRow] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(getCountdownToMidnight);

  const toastTimer = useRef<ReturnType<typeof setTimeout>>();
  const flipTimer = useRef<ReturnType<typeof setTimeout>>();
  const advanceTimer = useRef<ReturnType<typeof setTimeout>>();
  const blitzPhaseRef = useRef<BlitzPhase>(blitzPhase);
  blitzPhaseRef.current = blitzPhase;

  const target =
    mode === 'daily' ? dailyTarget : mode === 'infinite' ? infTarget : blitzTarget;
  const guesses =
    mode === 'daily' ? dailySave.guesses : mode === 'infinite' ? infGuesses : blitzGuesses;
  const status =
    mode === 'daily' ? dailySave.status : mode === 'infinite' ? infStatus : blitzStatus;
  const roundKey =
    mode === 'daily'
      ? `daily-${dailySave.dateKey}`
      : mode === 'infinite'
        ? `inf-${infRoundId}`
        : `blitz-${blitzRoundId}`;

  useEffect(() => {
    try {
      localStorage.setItem(DAILY_STORAGE_KEY, JSON.stringify(dailySave));
    } catch {
      // ignore quota errors
    }
  }, [dailySave]);

  useEffect(() => {
    try {
      localStorage.setItem(MODES_STORAGE_KEY, JSON.stringify(modesSave));
    } catch {
      // ignore quota errors
    }
  }, [modesSave]);

  useEffect(() => {
    const id = setInterval(() => setCountdown(getCountdownToMidnight()), 1000);
    return () => {
      clearInterval(id);
      clearTimeout(toastTimer.current);
      clearTimeout(flipTimer.current);
      clearTimeout(advanceTimer.current);
    };
  }, []);

  // Blitz 1-second countdown interval
  useEffect(() => {
    if (mode !== 'blitz' || blitzPhase !== 'running') return;
    const id = setInterval(() => {
      setBlitzSecondsLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [blitzPhase, mode]);

  useEffect(() => {
    if (mode === 'blitz' && blitzPhase === 'running' && blitzSecondsLeft <= 0) {
      setBlitzPhase('ended');
      clearTimeout(advanceTimer.current);
    }
  }, [blitzPhase, blitzSecondsLeft, mode]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 1650);
  }, []);

  const triggerShake = useCallback((rowIdx: number) => {
    setShakeRow(rowIdx);
    setTimeout(() => setShakeRow((prev) => (prev === rowIdx ? null : prev)), 460);
  }, []);

  const nextInfiniteWord = useCallback(() => {
    clearTimeout(flipTimer.current);
    const next = pickFreshWord(infTarget);
    setInfTarget(next);
    setInfGuesses([]);
    setInfStatus('playing');
    setInfRoundId((n) => n + 1);
    setCurrentGuess('');
    setFlippingRow(null);
    setWonRow(null);
    setToast(null);
  }, [infTarget, pickFreshWord]);

  const startBlitzRun = useCallback(
    (dur: BlitzDuration = blitzDuration) => {
      clearTimeout(flipTimer.current);
      clearTimeout(advanceTimer.current);
      const next = pickFreshWord();
      setBlitzDuration(dur);
      setBlitzSecondsLeft(dur);
      setBlitzPhase('running');
      setBlitzTarget(next);
      setBlitzGuesses([]);
      setBlitzStatus('playing');
      setBlitzSolved(0);
      setBlitzAttempted(0);
      setBlitzRoundId((n) => n + 1);
      setCurrentGuess('');
      setFlippingRow(null);
      setWonRow(null);
      setToast(`${dur / 60}m Blitz Started!`);
      clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setToast(null), 1200);
    },
    [blitzDuration, pickFreshWord],
  );

  const selectBlitzDuration = (dur: BlitzDuration) => {
    clearTimeout(flipTimer.current);
    clearTimeout(advanceTimer.current);
    setBlitzDuration(dur);
    setBlitzSecondsLeft(dur);
    setBlitzPhase('ready');
    setBlitzTarget(pickFreshWord());
    setBlitzGuesses([]);
    setBlitzStatus('playing');
    setBlitzSolved(0);
    setBlitzAttempted(0);
    setBlitzRoundId((n) => n + 1);
    setCurrentGuess('');
    setFlippingRow(null);
    setWonRow(null);
    setToast(null);
  };

  const skipBlitzWord = () => {
    if (mode !== 'blitz' || blitzPhase !== 'running') return;
    clearTimeout(flipTimer.current);
    clearTimeout(advanceTimer.current);
    showToast(`Skipped (${blitzTarget}) · -15s`);
    setBlitzSecondsLeft((s) => Math.max(0, s - 15));
    setBlitzAttempted((a) => a + 1);
    setBlitzTarget(pickFreshWord(blitzTarget));
    setBlitzGuesses([]);
    setBlitzStatus('playing');
    setBlitzRoundId((n) => n + 1);
    setCurrentGuess('');
    setFlippingRow(null);
    setWonRow(null);
  };

  const switchMode = (nextMode: CryptleMode) => {
    if (nextMode === mode) return;
    clearTimeout(flipTimer.current);
    clearTimeout(advanceTimer.current);
    setMode(nextMode);
    setCurrentGuess('');
    setFlippingRow(null);
    setWonRow(null);
    setToast(null);
  };

  const submitGuess = useCallback(() => {
    if (mode === 'blitz' && blitzPhase === 'ended') return;
    if (status !== 'playing' || flippingRow !== null) return;

    if (currentGuess.length < 5) {
      triggerShake(guesses.length);
      showToast('Not enough letters');
      return;
    }

    if (!isValidEnglishWord(currentGuess)) {
      triggerShake(guesses.length);
      showToast('Not in word list');
      return;
    }

    if (hardMode && mode !== 'blitz') {
      const violation = validateHardMode(currentGuess, guesses, target);
      if (violation) {
        triggerShake(guesses.length);
        showToast(violation);
        return;
      }
    }

    const rowIdx = guesses.length;
    const nextGuesses = [...guesses, currentGuess];
    const solved = currentGuess === target;
    const nextStatus: GameStatus = solved ? 'won' : nextGuesses.length >= 6 ? 'lost' : 'playing';

    setFlippingRow(rowIdx);
    setCurrentGuess('');

    if (mode === 'daily') {
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
    } else if (mode === 'infinite') {
      setInfGuesses(nextGuesses);
      setInfStatus(nextStatus);
      if (solved) {
        const nextStreakVal = infStreak + 1;
        setInfStreak(nextStreakVal);
        setModesSave((prev) => ({
          ...prev,
          infiniteBest: Math.max(prev.infiniteBest, nextStreakVal),
        }));
      } else if (nextStatus === 'lost') {
        setInfStreak(0);
      }
    } else {
      // Blitz mode
      setBlitzGuesses(nextGuesses);
      setBlitzStatus(nextStatus);
      if (solved) {
        const nextSolved = blitzSolved + 1;
        setBlitzSolved(nextSolved);
        setBlitzAttempted((a) => a + 1);
        setModesSave((prev) => ({
          ...prev,
          blitzBest: {
            ...prev.blitzBest,
            [blitzDuration]: Math.max(prev.blitzBest[blitzDuration] ?? 0, nextSolved),
          },
        }));
      } else if (nextStatus === 'lost') {
        setBlitzAttempted((a) => a + 1);
      }
    }

    const revealDelay = mode === 'blitz' ? 560 : 780;
    clearTimeout(flipTimer.current);
    flipTimer.current = setTimeout(() => {
      setFlippingRow(null);
      if (solved) {
        setWonRow(rowIdx);
        if (mode === 'blitz') {
          showToast('+1 Word!');
          clearTimeout(advanceTimer.current);
          advanceTimer.current = setTimeout(() => {
            if (blitzPhaseRef.current !== 'running') return;
            setBlitzTarget((curT) => pickFreshWord(curT));
            setBlitzGuesses([]);
            setBlitzStatus('playing');
            setBlitzRoundId((n) => n + 1);
            setCurrentGuess('');
            setWonRow(null);
          }, 520);
        } else {
          const cheers = ['Genius!', 'Magnificent!', 'Impressive!', 'Splendid!', 'Great!', 'Phew!'];
          showToast(cheers[rowIdx] ?? 'Nice!');
        }
      } else if (nextStatus === 'lost') {
        showToast(`Word was ${target}`);
        if (mode === 'blitz') {
          clearTimeout(advanceTimer.current);
          advanceTimer.current = setTimeout(() => {
            if (blitzPhaseRef.current !== 'running') return;
            setBlitzTarget((curT) => pickFreshWord(curT));
            setBlitzGuesses([]);
            setBlitzStatus('playing');
            setBlitzRoundId((n) => n + 1);
            setCurrentGuess('');
            setWonRow(null);
          }, 850);
        }
      }
    }, revealDelay);
  }, [
    blitzDuration,
    blitzPhase,
    blitzSolved,
    currentGuess,
    flippingRow,
    guesses,
    hardMode,
    infStreak,
    mode,
    pickFreshWord,
    showToast,
    status,
    target,
    today,
    triggerShake,
  ]);

  const handleKey = useCallback(
    (key: string) => {
      if (mode === 'blitz' && blitzPhase === 'ended') return;
      if (mode === 'infinite' && status !== 'playing' && key === 'ENTER' && flippingRow === null) {
        nextInfiniteWord();
        return;
      }
      if (mode === 'blitz' && blitzPhase === 'ready' && (/^[A-Z]$/.test(key) || key === 'ENTER')) {
        // Start Blitz immediately on first keystroke!
        setBlitzPhase('running');
        if (/^[A-Z]$/.test(key)) {
          setCurrentGuess(key);
        }
        return;
      }
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
    [blitzPhase, currentGuess.length, flippingRow, mode, nextInfiniteWord, status, submitGuess],
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

  const handleShare = () => {
    if (mode === 'blitz') {
      const durLabel = BLITZ_DURATIONS.find((d) => d.sec === blitzDuration)?.label ?? `${blitzDuration / 60}m`;
      share(`⏱️ Cryptle Blitz (${durLabel}) — Solved ${blitzSolved} word${blitzSolved === 1 ? '' : 's'}!`);
      return;
    }
    const lines = evaluatedRows.map((row) =>
      row.map((s) => (s === 'correct' ? '🟩' : s === 'present' ? '🟨' : '⬛')).join(''),
    );
    const header =
      mode === 'infinite'
        ? `♾️ Cryptle Infinite — Streak 🔥${infStreak} (${status === 'won' ? `${guesses.length}/6` : 'X/6'})`
        : `🦴 Cryptle #${puzzleNumber} — ${status === 'won' ? `${guesses.length}/6` : 'X/6'}${
            dailySave.streak > 1 ? ` · 🔥${dailySave.streak}` : ''
          }`;
    share(`${header}\n${lines.join('\n')}`);
  };

  const winRate = dailySave.played > 0 ? Math.round((dailySave.wins / dailySave.played) * 100) : 0;
  const blitzBestForDur = modesSave.blitzBest[blitzDuration] ?? 0;
  const blitzUrgent = mode === 'blitz' && blitzPhase === 'running' && blitzSecondsLeft <= 15;

  return (
    <div className="relative flex flex-col items-center select-none">
      {/* Mode selector tabs */}
      <div className="mb-2 grid w-full grid-cols-3 gap-1 rounded-2xl bg-black/10 p-1 text-[11px] font-bold">
        {[
          { id: 'daily' as const, label: 'Daily', icon: <Calendar className="h-3 w-3" /> },
          { id: 'infinite' as const, label: 'Infinite', icon: <InfinityIcon className="h-3 w-3" /> },
          { id: 'blitz' as const, label: 'Timed Blitz', icon: <Timer className="h-3 w-3" /> },
        ].map((tab) => {
          const active = mode === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => switchMode(tab.id)}
              className={`flex items-center justify-center gap-1 rounded-xl py-1.5 transition ${
                active
                  ? 'bg-[#22C55E] text-white shadow-sm'
                  : 'opacity-75 hover:bg-emerald-500/15 hover:opacity-100'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Mode info & controls bar */}
      <div className="mb-1.5 flex w-full flex-wrap items-center justify-between gap-1.5 text-xs">
        {mode === 'daily' && (
          <>
            <div className="flex items-center gap-1.5">
              <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 font-bold text-emerald-700 dark:text-emerald-300">
                Cryptle #{puzzleNumber}
              </span>
              {dailySave.streak > 0 && (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/20 px-2 py-0.5 font-semibold text-amber-700 dark:text-amber-300">
                  <Flame className="h-3 w-3" /> {dailySave.streak}
                </span>
              )}
            </div>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setHardMode((h) => !h)}
              title="Revealed hints must be used in subsequent guesses"
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold transition ${
                hardMode ? 'bg-rose-500 text-white' : 'bg-emerald-500/15 opacity-75 hover:opacity-100'
              }`}
            >
              <ShieldAlert className="h-3 w-3" /> Hard
            </button>
          </>
        )}

        {mode === 'infinite' && (
          <>
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/20 px-2.5 py-0.5 font-bold text-amber-700 dark:text-amber-300">
                <Flame className="h-3 w-3" /> Streak {infStreak}
              </span>
              <span className="rounded-full bg-black/10 px-2 py-0.5 text-[11px] font-semibold opacity-75">
                Best {modesSave.infiniteBest}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setHardMode((h) => !h)}
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold transition ${
                  hardMode ? 'bg-rose-500 text-white' : 'bg-emerald-500/15 opacity-75 hover:opacity-100'
                }`}
              >
                <ShieldAlert className="h-3 w-3" /> Hard
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={nextInfiniteWord}
                className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-bold hover:bg-emerald-500/25"
              >
                <RotateCcw className="h-3 w-3" /> New
              </button>
            </div>
          </>
        )}

        {mode === 'blitz' && (
          <div className="flex w-full flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1">
                {BLITZ_DURATIONS.map((d) => (
                  <button
                    key={d.sec}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => selectBlitzDuration(d.sec)}
                    className={`rounded-full px-2 py-0.5 text-[11px] font-bold transition ${
                      blitzDuration === d.sec
                        ? 'bg-amber-500 text-white shadow-sm'
                        : 'bg-emerald-500/15 hover:bg-emerald-500/25'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1.5">
                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 font-bold text-emerald-700 dark:text-emerald-300">
                  Solved: {blitzSolved}
                </span>
                <span
                  className={`rounded-full px-2.5 py-0.5 font-mono text-xs font-extrabold ${
                    blitzUrgent
                      ? 'animate-pulse bg-rose-500 text-white'
                      : 'bg-black/15 dark:bg-white/15'
                  }`}
                >
                  {formatTimer(blitzSecondsLeft)}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between text-[11px] opacity-80">
              <span>Best: {blitzBestForDur} words · Attempted: {blitzAttempted}</span>
              {blitzPhase === 'ready' ? (
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => startBlitzRun(blitzDuration)}
                  className="inline-flex items-center gap-1 rounded-full bg-[#22C55E] px-2.5 py-0.5 font-bold text-white"
                >
                  <Play className="h-3 w-3" /> Start
                </button>
              ) : blitzPhase === 'running' ? (
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={skipBlitzWord}
                  className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2.5 py-0.5 font-bold hover:bg-amber-500/30"
                >
                  <SkipForward className="h-3 w-3" /> Skip (-15s)
                </button>
              ) : (
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => startBlitzRun(blitzDuration)}
                  className="inline-flex items-center gap-1 rounded-full bg-[#22C55E] px-2.5 py-0.5 font-bold text-white"
                >
                  <RotateCcw className="h-3 w-3" /> Retry
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Floating toast */}
      <div className="relative mb-1 flex h-6 w-full items-center justify-center">
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
      <div className="relative">
        <div className="grid gap-1.5" style={{ perspective: '700px' }}>
          {Array.from({ length: 6 }, (_, r) => {
            const isSubmitted = r < guesses.length;
            const isCurrent =
              r === guesses.length && status === 'playing' && !(mode === 'blitz' && blitzPhase === 'ended');
            const word = isSubmitted ? guesses[r] : isCurrent ? currentGuess : '';
            const evals = isSubmitted ? evaluatedRows[r] : null;
            const isFlipping = flippingRow === r;
            const isWinWave = wonRow === r;

            return (
              <motion.div
                key={`${roundKey}-${r}`}
                className="grid grid-cols-5 gap-1.5"
                animate={shakeRow === r ? { x: [0, -8, 8, -6, 6, -3, 3, 0] } : { x: 0 }}
                transition={{ duration: 0.4 }}
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
                      className="relative h-10 w-10 sm:h-11 sm:w-11"
                      animate={
                        isWinWave
                          ? { y: [0, -10, 0] }
                          : isCurrent && ch
                            ? { scale: [0.86, 1.13, 1] }
                            : { y: 0, scale: 1 }
                      }
                      transition={
                        isWinWave
                          ? { duration: 0.36, delay: c * 0.055, ease: 'easeOut' }
                          : { duration: 0.12 }
                      }
                      style={{ perspective: '600px' }}
                    >
                      <motion.div
                        className="relative h-full w-full"
                        initial={false}
                        animate={{ rotateX: isSubmitted ? 180 : 0 }}
                        transition={
                          isFlipping
                            ? {
                                duration: mode === 'blitz' ? 0.36 : 0.46,
                                delay: c * (mode === 'blitz' ? 0.065 : 0.095),
                                ease: [0.4, 0, 0.2, 1],
                              }
                            : { duration: 0 }
                        }
                        style={{ transformStyle: 'preserve-3d' }}
                      >
                        <div
                          className={`absolute inset-0 flex items-center justify-center rounded-lg border-2 text-base font-extrabold tracking-wider transition-colors sm:text-lg ${
                            ch
                              ? 'border-emerald-500/70 bg-emerald-500/10 text-emerald-950 dark:border-white/55 dark:text-white'
                              : 'border-emerald-950/15 bg-black/5 dark:border-white/15 dark:bg-white/5'
                          }`}
                          style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
                        >
                          {ch}
                        </div>

                        <div
                          className={`absolute inset-0 flex items-center justify-center rounded-lg border-2 text-base font-extrabold tracking-wider sm:text-lg ${colorCls}`}
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

        {/* Blitz Time's Up Overlay */}
        <AnimatePresence>
          {mode === 'blitz' && blitzPhase === 'ended' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-2xl bg-black/75 p-4 text-center text-white backdrop-blur-sm"
            >
              <p className="text-base font-black text-amber-300">TIME&apos;S UP!</p>
              <p className="mt-1 text-2xl font-extrabold text-[#22C55E]">{blitzSolved} solved</p>
              <p className="mt-0.5 text-xs text-zinc-300">
                Last word: <span className="font-bold text-white">{blitzTarget}</span> · Best: {blitzBestForDur}
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => startBlitzRun(blitzDuration)}
                  className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold hover:bg-white/25"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Play Again
                </button>
                <button
                  type="button"
                  onClick={handleShare}
                  className="inline-flex items-center gap-1 rounded-full bg-[#22C55E] px-3 py-1.5 text-xs font-bold text-white"
                >
                  <Share2 className="h-3.5 w-3.5" /> Share
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Daily & Infinite Round Completion Summary */}
      <AnimatePresence>
        {mode !== 'blitz' && status !== 'playing' && flippingRow === null && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8 }}
            className="mt-2.5 flex w-full items-center justify-between gap-2 rounded-2xl bg-emerald-500/10 p-2.5 text-xs"
          >
            <div>
              <p className="font-bold">
                {status === 'won' ? `Solved in ${guesses.length}/6!` : `Answer: ${target}`}
              </p>
              {mode === 'daily' ? (
                <p className="text-[11px] opacity-70">
                  Played {dailySave.played} · Win {winRate}% · Best 🔥{dailySave.maxStreak} · Next {countdown}
                </p>
              ) : (
                <p className="text-[11px] opacity-70">
                  Streak 🔥{infStreak} · Best {modesSave.infiniteBest} · Press Enter for next
                </p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              {mode === 'infinite' && (
                <button
                  type="button"
                  onClick={nextInfiniteWord}
                  className="rounded-full bg-emerald-500/20 px-3 py-1.5 font-bold hover:bg-emerald-500/30"
                >
                  Next Word
                </button>
              )}
              <button
                type="button"
                onClick={handleShare}
                className="inline-flex items-center gap-1 rounded-full bg-[#22C55E] px-3 py-1.5 font-semibold text-white shadow hover:brightness-105"
              >
                <Share2 className="h-3 w-3" /> Share
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* On-screen QWERTY keyboard */}
      <div className="mt-2.5 flex w-full flex-col gap-1">
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
