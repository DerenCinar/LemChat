import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Flame, CheckCircle2 } from 'lucide-react';
import {
  DailyWordGame,
  getCryptleDateKey,
  getCryptlePuzzleNumber,
  hasCompletedDailyCryptleToday,
} from './games/DailyWordGame';
import { SoulBattleGame } from './games/SoulBattleGame';
import {
  getDailyBoss,
  hasClearedDailyBossToday,
  loadSoulBattleSave,
} from './games/soulBattleData';

type Share = (text: string) => void;

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

/* ---------- Memory match ---------- */
const MemoryGame: React.FC<{ share: Share }> = ({ share }) => {
  const deal = () =>
    [...'🍎🍋🍇🍓🥝🍒🍑🍍', ...'🍎🍋🍇🍓🥝🍒🍑🍍']
      .map((e, i) => ({ id: i, e, r: Math.random() }))
      .sort((a, b) => a.r - b.r);

  const [cards, setCards] = useState(deal);
  const [open, setOpen] = useState<number[]>([]);
  const [done, setDone] = useState<number[]>([]);
  const [mismatch, setMismatch] = useState<number[]>([]);
  const [justMatched, setJustMatched] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const lockRef = useRef(false);
  const won = done.length === cards.length;

  const flip = (id: number) => {
    if (lockRef.current || open.length === 2 || open.includes(id) || done.includes(id)) return;
    const next = [...open, id];
    setOpen(next);
    if (next.length === 2) {
      setMoves((m) => m + 1);
      const [a, b] = next.map((i) => cards.find((c) => c.id === i)!);
      if (a.e === b.e) {
        setDone((d) => [...d, a.id, b.id]);
        setJustMatched([a.id, b.id]);
        setOpen([]);
        setTimeout(() => setJustMatched([]), 450);
      } else {
        lockRef.current = true;
        setTimeout(() => setMismatch(next), 220);
        setTimeout(() => {
          setMismatch([]);
          setOpen([]);
          lockRef.current = false;
        }, 720);
      }
    }
  };

  const restart = () => {
    lockRef.current = false;
    setCards(deal());
    setOpen([]);
    setDone([]);
    setMismatch([]);
    setJustMatched([]);
    setMoves(0);
  };

  return (
    <div>
      <div className="grid grid-cols-4 gap-2" style={{ perspective: '700px' }}>
        {cards.map((c, idx) => {
          const isRevealed = open.includes(c.id) || done.includes(c.id);
          const isMatched = done.includes(c.id);
          const isJustMatched = justMatched.includes(c.id);
          const isMismatch = mismatch.includes(c.id);

          return (
            <motion.button
              key={c.id}
              type="button"
              initial={{ opacity: 0, scale: 0.75 }}
              animate={{
                opacity: 1,
                scale: isJustMatched ? [1, 1.15, 1] : 1,
                x: isMismatch ? [0, -6, 6, -4, 4, 0] : 0,
              }}
              transition={{
                opacity: { duration: 0.2, delay: idx * 0.015 },
                scale: { duration: 0.32 },
                x: { duration: 0.36 },
              }}
              whileTap={!isRevealed ? { scale: 0.93 } : undefined}
              onClick={() => flip(c.id)}
              className="relative h-14 w-full"
              style={{ perspective: '600px' }}
            >
              <motion.div
                className="relative h-full w-full"
                initial={false}
                animate={{ rotateY: isRevealed ? 180 : 0 }}
                transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
                style={{ transformStyle: 'preserve-3d' }}
              >
                {/* Card back */}
                <div
                  className="absolute inset-0 flex items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/12 text-xs font-bold text-emerald-700/50 hover:bg-emerald-500/20 dark:text-emerald-200/45"
                  style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
                >
                  ✦
                </div>
                {/* Card front */}
                <div
                  className={`absolute inset-0 flex items-center justify-center rounded-xl border text-2xl shadow-sm ${
                    isMatched
                      ? 'border-emerald-400/60 bg-emerald-500/28 shadow-emerald-500/20'
                      : isMismatch
                        ? 'border-rose-400/70 bg-rose-500/20'
                        : 'border-emerald-400/40 bg-emerald-500/20'
                  }`}
                  style={{
                    transform: 'rotateY(180deg)',
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                  }}
                >
                  {c.e}
                </div>
              </motion.div>
            </motion.button>
          );
        })}
      </div>

      <div className="mt-3 flex items-center justify-between text-xs">
        <span>Moves: {moves}</span>
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded-full bg-emerald-500/15 px-3 py-1 hover:bg-emerald-500/25"
            onClick={restart}
          >
            Restart
          </button>
          {won && (
            <motion.button
              type="button"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="rounded-full bg-[#22C55E] px-3 py-1 font-semibold text-white"
              onClick={() => share(`🧠 I cleared Memory Match in ${moves} moves — beat that!`)}
            >
              Share score
            </motion.button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {won && (
          <motion.p
            initial={{ opacity: 0, y: 6, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="mt-2 text-center text-sm font-semibold text-emerald-500"
          >
            You won in {moves} moves! 🎉
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
};

/* ---------- Snake (Smooth 60 FPS Canvas + Eat Particles) ---------- */
const N = 16;
const SNAKE_TICK_MS = 115;

interface SnakeParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

const SnakeGame: React.FC<{ share: Share }> = ({ share }) => {
  const [score, setScore] = useState(0);
  const [dead, setDead] = useState(false);
  const [started, setStarted] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const snakeRef = useRef<[number, number][]>([
    [8, 8],
    [7, 8],
    [6, 8],
  ]);
  const prevSnakeRef = useRef<[number, number][]>([
    [8, 8],
    [7, 8],
    [6, 8],
  ]);
  const foodRef = useRef<[number, number]>([12, 8]);
  const dirRef = useRef<[number, number]>([1, 0]);
  const queuedRef = useRef<[number, number]>([1, 0]);
  const startedRef = useRef(false);
  const deadRef = useRef(false);
  const lastTickAtRef = useRef(performance.now());
  const particlesRef = useRef<SnakeParticle[]>([]);
  const popupsRef = useRef<{ x: number; y: number; life: number }[]>([]);
  const touchStart = useRef<[number, number] | null>(null);

  const turn = useCallback((dx: number, dy: number) => {
    if (deadRef.current) return;
    if (dx === -dirRef.current[0] && dy === -dirRef.current[1]) return;
    queuedRef.current = [dx, dy];
    if (!startedRef.current) {
      startedRef.current = true;
      lastTickAtRef.current = performance.now();
      setStarted(true);
    }
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const m: Record<string, [number, number]> = {
        ArrowUp: [0, -1],
        ArrowDown: [0, 1],
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0],
        w: [0, -1],
        W: [0, -1],
        s: [0, 1],
        S: [0, 1],
        a: [-1, 0],
        A: [-1, 0],
        d: [1, 0],
        D: [1, 0],
      };
      const d = m[e.key];
      if (d) {
        e.preventDefault();
        e.stopPropagation();
        turn(d[0], d[1]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [turn]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = 280;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    const cell = size / N;

    let raf = 0;
    let lastFrame = performance.now();

    const stepLogic = () => {
      dirRef.current = queuedRef.current;
      const s = snakeRef.current;
      const head: [number, number] = [s[0][0] + dirRef.current[0], s[0][1] + dirRef.current[1]];
      const ate = head[0] === foodRef.current[0] && head[1] === foodRef.current[1];
      const collisionBody = ate ? s : s.slice(0, -1);

      if (
        head[0] < 0 ||
        head[1] < 0 ||
        head[0] >= N ||
        head[1] >= N ||
        collisionBody.some(([x, y]) => x === head[0] && y === head[1])
      ) {
        deadRef.current = true;
        setDead(true);
        return;
      }

      prevSnakeRef.current = s.map((pt) => [...pt] as [number, number]);
      const next: [number, number][] = [head, ...s];
      if (!ate) {
        next.pop();
      } else {
        setScore(next.length - 3);
        const fx = (foodRef.current[0] + 0.5) * cell;
        const fy = (foodRef.current[1] + 0.5) * cell;
        popupsRef.current.push({ x: fx, y: fy - 4, life: 0 });
        for (let i = 0; i < 12; i++) {
          const ang = (Math.PI * 2 * i) / 12 + Math.random() * 0.3;
          const spd = 45 + Math.random() * 65;
          particlesRef.current.push({
            x: fx,
            y: fy,
            vx: Math.cos(ang) * spd,
            vy: Math.sin(ang) * spd,
            life: 0,
            color: i % 2 === 0 ? '#FB7185' : '#4ADE80',
          });
        }
        let f: [number, number];
        do {
          f = [Math.floor(Math.random() * N), Math.floor(Math.random() * N)];
        } while (next.some(([x, y]) => x === f[0] && y === f[1]));
        foodRef.current = f;
      }
      snakeRef.current = next;
    };

    const render = (now: number) => {
      const dt = Math.min(0.05, (now - lastFrame) / 1000);
      lastFrame = now;

      if (startedRef.current && !deadRef.current) {
        while (now - lastTickAtRef.current >= SNAKE_TICK_MS) {
          lastTickAtRef.current += SNAKE_TICK_MS;
          stepLogic();
          if (deadRef.current) break;
        }
      }

      const t =
        startedRef.current && !deadRef.current
          ? Math.min(1, Math.max(0, (now - lastTickAtRef.current) / SNAKE_TICK_MS))
          : 1;

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, size, size);

      // Subtle checkerboard cells
      for (let y = 0; y < N; y++) {
        for (let x = 0; x < N; x++) {
          if ((x + y) % 2 === 0) {
            ctx.fillStyle = 'rgba(255,255,255,0.025)';
            ctx.fillRect(x * cell, y * cell, cell, cell);
          }
        }
      }

      // Pulsing food orb
      const pulse = 1 + Math.sin(now * 0.009) * 0.16;
      const fx = (foodRef.current[0] + 0.5) * cell;
      const fy = (foodRef.current[1] + 0.5) * cell;
      const glow = ctx.createRadialGradient(fx, fy, 1, fx, fy, cell * 0.85 * pulse);
      glow.addColorStop(0, 'rgba(244, 63, 94, 0.55)');
      glow.addColorStop(1, 'rgba(244, 63, 94, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(fx, fy, cell * 0.85 * pulse, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#F43F5E';
      ctx.beginPath();
      ctx.arc(fx, fy, cell * 0.34 * pulse, 0, Math.PI * 2);
      ctx.fill();

      // Interpolated snake segments (draw tail -> head)
      const s = snakeRef.current;
      const ps = prevSnakeRef.current;
      for (let i = s.length - 1; i >= 0; i--) {
        const cur = s[i];
        const prev = ps[Math.min(i, ps.length - 1)];
        const ix = (prev[0] + (cur[0] - prev[0]) * t + 0.5) * cell;
        const iy = (prev[1] + (cur[1] - prev[1]) * t + 0.5) * cell;
        const ratio = i === 0 ? 0.44 : Math.max(0.28, 0.4 - (i / (s.length + 4)) * 0.12);
        const rad = cell * ratio;

        ctx.fillStyle = i === 0 ? '#22C55E' : i % 2 === 0 ? '#34D399' : '#10B981';
        ctx.beginPath();
        ctx.arc(ix, iy, rad, 0, Math.PI * 2);
        ctx.fill();

        if (i === 0) {
          // Cute directional eyes
          const [dx, dy] = dirRef.current;
          const perpX = -dy;
          const perpY = dx;
          ctx.fillStyle = '#052E16';
          ctx.beginPath();
          ctx.arc(ix + dx * 2.5 + perpX * 3, iy + dy * 2.5 + perpY * 3, 1.8, 0, Math.PI * 2);
          ctx.arc(ix + dx * 2.5 - perpX * 3, iy + dy * 2.5 - perpY * 3, 1.8, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Eat particles
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.life += dt;
        if (p.life >= 0.45) {
          particlesRef.current.splice(i, 1);
          continue;
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        ctx.save();
        ctx.globalAlpha = 1 - p.life / 0.45;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // +1 popups
      for (let i = popupsRef.current.length - 1; i >= 0; i--) {
        const pop = popupsRef.current[i];
        pop.life += dt;
        if (pop.life >= 0.6) {
          popupsRef.current.splice(i, 1);
          continue;
        }
        pop.y -= 24 * dt;
        ctx.save();
        ctx.globalAlpha = 1 - pop.life / 0.6;
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('+1', pop.x, pop.y);
        ctx.restore();
      }

      ctx.restore();
      raf = requestAnimationFrame(render);
    };

    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, []);

  const reset = () => {
    snakeRef.current = [
      [8, 8],
      [7, 8],
      [6, 8],
    ];
    prevSnakeRef.current = [
      [8, 8],
      [7, 8],
      [6, 8],
    ];
    foodRef.current = [12, 8];
    dirRef.current = [1, 0];
    queuedRef.current = [1, 0];
    startedRef.current = false;
    deadRef.current = false;
    particlesRef.current = [];
    popupsRef.current = [];
    lastTickAtRef.current = performance.now();
    setScore(0);
    setDead(false);
    setStarted(false);
  };

  return (
    <div>
      <motion.div
        animate={dead ? { x: [0, -7, 7, -5, 5, 0] } : { x: 0 }}
        transition={{ duration: 0.35 }}
        className="relative mx-auto aspect-square w-full max-w-[280px] touch-none overflow-hidden rounded-xl bg-black/25 ring-1 ring-white/10"
        onPointerDown={(e) => {
          touchStart.current = [e.clientX, e.clientY];
        }}
        onPointerUp={(e) => {
          if (!touchStart.current) return;
          const dx = e.clientX - touchStart.current[0];
          const dy = e.clientY - touchStart.current[1];
          touchStart.current = null;
          if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) return;
          if (Math.abs(dx) > Math.abs(dy)) turn(dx > 0 ? 1 : -1, 0);
          else turn(0, dy > 0 ? 1 : -1);
        }}
      >
        <canvas ref={canvasRef} className="h-full w-full" />
        <AnimatePresence>
          {dead && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-black/55 backdrop-blur-[2px]"
            >
              <p className="text-base font-extrabold text-white">Game Over</p>
              <p className="text-xs text-emerald-300">Score: {score}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <div className="mx-auto mt-3 grid w-32 grid-cols-3 gap-1 text-lg sm:hidden">
        <span />
        <button type="button" className="rounded-lg bg-emerald-500/15 py-1 active:scale-95" onClick={() => turn(0, -1)}>
          ↑
        </button>
        <span />
        <button type="button" className="rounded-lg bg-emerald-500/15 py-1 active:scale-95" onClick={() => turn(-1, 0)}>
          ←
        </button>
        <button type="button" className="rounded-lg bg-emerald-500/15 py-1 active:scale-95" onClick={() => turn(0, 1)}>
          ↓
        </button>
        <button type="button" className="rounded-lg bg-emerald-500/15 py-1 active:scale-95" onClick={() => turn(1, 0)}>
          →
        </button>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs">
        <span>
          {dead ? `Game over — score ${score}` : started ? `Score: ${score}` : 'Arrow keys / WASD / swipe'}
        </span>
        <div className="flex gap-2">
          <button type="button" className="rounded-full bg-emerald-500/15 px-3 py-1 hover:bg-emerald-500/25" onClick={reset}>
            Restart
          </button>
          {dead && score > 0 && (
            <button
              type="button"
              className="rounded-full bg-[#22C55E] px-3 py-1 font-semibold text-white"
              onClick={() => share(`🐍 I scored ${score} in Snake — can you beat me?`)}
            >
              Share score
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

/* ---------- 2048 (Real Sliding Block Animations + Merge Pop) ---------- */
interface Tile2048 {
  id: number;
  value: number;
  row: number;
  col: number;
  isNew?: boolean;
  justMerged?: boolean;
}

interface DyingTile extends Tile2048 {
  batchId: number;
}

interface ScorePopup {
  id: number;
  gained: number;
}

const BEST_2048_KEY = 'skellytalk_2048_best';
let nextTileId = 1;

const TILE: Record<number, string> = {
  2: 'bg-emerald-100 text-emerald-950 shadow-sm',
  4: 'bg-emerald-200 text-emerald-950 shadow-sm',
  8: 'bg-amber-300 text-black shadow-sm',
  16: 'bg-orange-400 text-white shadow-sm',
  32: 'bg-orange-500 text-white shadow-md',
  64: 'bg-red-500 text-white shadow-md',
  128: 'bg-yellow-400 text-black shadow-md',
  256: 'bg-yellow-500 text-black shadow-md',
  512: 'bg-lime-500 text-black shadow-lg',
  1024: 'bg-emerald-500 text-white shadow-lg',
  2048: 'bg-[#22C55E] text-white shadow-lg shadow-emerald-500/40',
};

const spawnTile = (tiles: Tile2048[]): Tile2048[] => {
  const occupied = new Set(tiles.map((t) => `${t.row},${t.col}`));
  const open: [number, number][] = [];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (!occupied.has(`${r},${c}`)) open.push([r, c]);
    }
  }
  if (!open.length) return tiles;
  const [row, col] = pick(open);
  return [
    ...tiles,
    {
      id: nextTileId++,
      value: Math.random() < 0.9 ? 2 : 4,
      row,
      col,
      isNew: true,
    },
  ];
};

const createInitial2048 = (): Tile2048[] => spawnTile(spawnTile([]));

const slideTiles = (tiles: Tile2048[], dir: 'L' | 'R' | 'U' | 'D') => {
  const grid: (Tile2048 | null)[][] = Array.from({ length: 4 }, () => [null, null, null, null]);
  for (const t of tiles) {
    grid[t.row][t.col] = t;
  }

  const nextTiles: Tile2048[] = [];
  const dying: Tile2048[] = [];
  let gained = 0;
  let moved = false;

  for (let i = 0; i < 4; i++) {
    const coords: [number, number][] = [];
    for (let step = 0; step < 4; step++) {
      if (dir === 'L') coords.push([i, step]);
      else if (dir === 'R') coords.push([i, 3 - step]);
      else if (dir === 'U') coords.push([step, i]);
      else coords.push([3 - step, i]);
    }

    const line = coords
      .map(([r, c]) => grid[r][c])
      .filter((t): t is Tile2048 => t !== null);

    let destIdx = 0;
    let k = 0;
    while (k < line.length) {
      const [destRow, destCol] = coords[destIdx];
      const a = line[k];
      const b = k + 1 < line.length ? line[k + 1] : null;

      if (b && a.value === b.value) {
        // Both source tiles slide cleanly into destination cell, then disappear behind merged tile
        dying.push({ ...a, row: destRow, col: destCol, isNew: false, justMerged: false });
        dying.push({ ...b, row: destRow, col: destCol, isNew: false, justMerged: false });
        const mergedVal = a.value * 2;
        nextTiles.push({
          id: nextTileId++,
          value: mergedVal,
          row: destRow,
          col: destCol,
          justMerged: true,
        });
        gained += mergedVal;
        moved = true;
        k += 2;
        destIdx++;
      } else {
        if (a.row !== destRow || a.col !== destCol) moved = true;
        nextTiles.push({
          id: a.id,
          value: a.value,
          row: destRow,
          col: destCol,
        });
        k++;
        destIdx++;
      }
    }
  }

  return { tiles: nextTiles, dying, gained, moved };
};

const is2048Over = (tiles: Tile2048[]): boolean => {
  if (tiles.length < 16) return false;
  const grid = Array.from({ length: 4 }, () => [0, 0, 0, 0]);
  for (const t of tiles) grid[t.row][t.col] = t.value;
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const v = grid[r][c];
      if (r < 3 && grid[r + 1][c] === v) return false;
      if (c < 3 && grid[r][c + 1] === v) return false;
    }
  }
  return true;
};

const Game2048: React.FC<{ share: Share }> = ({ share }) => {
  const [tiles, setTiles] = useState<Tile2048[]>(createInitial2048);
  const [dyingTiles, setDyingTiles] = useState<DyingTile[]>([]);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(() => {
    try {
      return Number(localStorage.getItem(BEST_2048_KEY) || 0);
    } catch {
      return 0;
    }
  });
  const [popups, setPopups] = useState<ScorePopup[]>([]);
  const [nudgeDir, setNudgeDir] = useState<'L' | 'R' | 'U' | 'D' | null>(null);

  const tilesRef = useRef(tiles);
  tilesRef.current = tiles;
  const batchRef = useRef(1);
  const popupIdRef = useRef(1);
  const touch = useRef<[number, number] | null>(null);

  const over = is2048Over(tiles);

  useEffect(() => {
    if (score > bestScore) {
      setBestScore(score);
      try {
        localStorage.setItem(BEST_2048_KEY, String(score));
      } catch {
        // ignore storage errors
      }
    }
  }, [bestScore, score]);

  const go = useCallback((d: 'L' | 'R' | 'U' | 'D') => {
    const res = slideTiles(tilesRef.current, d);
    if (!res.moved) {
      setNudgeDir(d);
      setTimeout(() => setNudgeDir(null), 160);
      return;
    }

    const withSpawn = spawnTile(res.tiles);
    tilesRef.current = withSpawn;
    setTiles(withSpawn);

    if (res.dying.length > 0) {
      const batchId = batchRef.current++;
      const incoming: DyingTile[] = res.dying.map((t) => ({ ...t, batchId }));
      setDyingTiles((prev) => [...prev, ...incoming]);
      setTimeout(() => {
        setDyingTiles((prev) => prev.filter((t) => t.batchId !== batchId));
      }, 145);
    }

    if (res.gained > 0) {
      setScore((s) => s + res.gained);
      const pid = popupIdRef.current++;
      setPopups((prev) => [...prev.slice(-3), { id: pid, gained: res.gained }]);
      setTimeout(() => {
        setPopups((prev) => prev.filter((p) => p.id !== pid));
      }, 650);
    }
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const m: Record<string, 'L' | 'R' | 'U' | 'D'> = {
        ArrowLeft: 'L',
        ArrowRight: 'R',
        ArrowUp: 'U',
        ArrowDown: 'D',
        a: 'L',
        A: 'L',
        d: 'R',
        D: 'R',
        w: 'U',
        W: 'U',
        s: 'D',
        S: 'D',
      };
      const mapped = m[e.key];
      if (mapped) {
        e.preventDefault();
        e.stopPropagation();
        go(mapped);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go]);

  const restart = () => {
    const fresh = createInitial2048();
    tilesRef.current = fresh;
    setTiles(fresh);
    setDyingTiles([]);
    setPopups([]);
    setScore(0);
  };

  const nudgeOffset =
    nudgeDir === 'L'
      ? { x: -4 }
      : nudgeDir === 'R'
        ? { x: 4 }
        : nudgeDir === 'U'
          ? { y: -4 }
          : nudgeDir === 'D'
            ? { y: 4 }
            : { x: 0, y: 0 };

  const renderTileCard = (t: Tile2048, isDying = false) => {
    const digits = String(t.value).length;
    const textCls = digits >= 4 ? 'text-sm' : digits === 3 ? 'text-base' : 'text-lg';
    return (
      <div
        key={`${isDying ? 'd-' : ''}${t.id}`}
        className={`absolute left-0 top-0 transition-transform duration-[135ms] ease-out ${isDying ? 'z-0' : 'z-10'}`}
        style={{
          width: 'calc((100% - 18px) / 4)',
          height: 'calc((100% - 18px) / 4)',
          transform: `translate3d(calc(${t.col} * (100% + 6px)), calc(${t.row} * (100% + 6px)), 0)`,
        }}
      >
        <motion.div
          initial={
            t.isNew
              ? { scale: 0.25, opacity: 0 }
              : t.justMerged
                ? { scale: 0.85 }
                : false
          }
          animate={
            t.justMerged
              ? { scale: [0.85, 1.2, 1], opacity: 1 }
              : { scale: 1, opacity: isDying ? 0.65 : 1 }
          }
          transition={{ duration: t.justMerged ? 0.22 : 0.16, ease: 'easeOut' }}
          className={`flex h-full w-full items-center justify-center rounded-lg font-extrabold ${textCls} ${
            TILE[t.value] ?? 'bg-[#22C55E] text-white'
          }`}
        >
          {t.value}
        </motion.div>
      </div>
    );
  };

  return (
    <div>
      {/* Score & Best header with floating +gained */}
      <div className="relative mb-2 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="rounded-lg bg-emerald-500/15 px-2.5 py-1 font-bold">Score {score}</span>
          <span className="rounded-lg bg-black/10 px-2.5 py-1 font-semibold opacity-75">Best {bestScore}</span>
        </div>
        <div className="pointer-events-none relative h-5 w-16 overflow-visible">
          <AnimatePresence>
            {popups.map((p) => (
              <motion.span
                key={p.id}
                initial={{ opacity: 0, y: 8, scale: 0.8 }}
                animate={{ opacity: 1, y: -8, scale: 1.05 }}
                exit={{ opacity: 0, y: -18 }}
                transition={{ duration: 0.45 }}
                className="absolute right-0 top-0 font-extrabold text-emerald-500"
              >
                +{p.gained}
              </motion.span>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Board */}
      <motion.div
        animate={nudgeOffset}
        transition={{ duration: 0.1 }}
        className="relative mx-auto aspect-square w-full max-w-[280px] touch-none rounded-xl bg-black/15 p-1.5"
        onPointerDown={(e) => {
          touch.current = [e.clientX, e.clientY];
        }}
        onPointerUp={(e) => {
          if (!touch.current) return;
          const dx = e.clientX - touch.current[0];
          const dy = e.clientY - touch.current[1];
          touch.current = null;
          if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return;
          go(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'R' : 'L') : dy > 0 ? 'D' : 'U');
        }}
      >
        {/* Static 4x4 background slots */}
        <div className="grid h-full w-full grid-cols-4 gap-1.5">
          {Array.from({ length: 16 }, (_, i) => (
            <div key={i} className="rounded-lg bg-black/10" />
          ))}
        </div>

        {/* Sliding active & merging tile layer */}
        <div className="pointer-events-none absolute inset-1.5">
          {dyingTiles.map((t) => renderTileCard(t, true))}
          {tiles.map((t) => renderTileCard(t, false))}
        </div>

        <AnimatePresence>
          {over && (
            <motion.div
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-xl bg-black/60 text-white backdrop-blur-[2px]"
            >
              <p className="text-base font-extrabold">No moves left</p>
              <p className="mt-0.5 text-xs text-emerald-300">Final Score: {score}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <div className="mt-3 flex items-center justify-between text-xs">
        <span>{over ? `Game Over — ${score}` : 'Arrows / WASD / swipe'}</span>
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded-full bg-emerald-500/15 px-3 py-1 hover:bg-emerald-500/25"
            onClick={restart}
          >
            Restart
          </button>
          {score > 0 && (
            <button
              type="button"
              className="rounded-full bg-[#22C55E] px-3 py-1 font-semibold text-white"
              onClick={() => share(`🔢 I scored ${score} in 2048 — your turn!`)}
            >
              Share score
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

/* ---------- Rock Paper Scissors (vs bot — Animated Countdown) ---------- */
const RPS = ['🪨', '📄', '✂️'];

const RpsGame: React.FC<{ share: Share }> = ({ share }) => {
  const [res, setRes] = useState<{ me: number; bot: number; id: number } | null>(null);
  const [rolling, setRolling] = useState(false);
  const [tally, setTally] = useState({ w: 0, l: 0, d: 0 });
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const play = (me: number) => {
    if (rolling) return;
    setRolling(true);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const bot = Math.floor(Math.random() * 3);
      setRolling(false);
      setRes({ me, bot, id: Date.now() });
      setTally((t) =>
        me === bot
          ? { ...t, d: t.d + 1 }
          : (me - bot + 3) % 3 === 1
            ? { ...t, w: t.w + 1 }
            : { ...t, l: t.l + 1 },
      );
    }, 450);
  };

  const status = res
    ? res.me === res.bot
      ? 'draw'
      : (res.me - res.bot + 3) % 3 === 1
        ? 'win'
        : 'lose'
    : 'idle';

  const outcome = rolling
    ? 'Shoot...!'
    : res
      ? status === 'draw'
        ? "It's a draw"
        : status === 'win'
          ? 'You win! 🎉'
          : 'You lose 😅'
      : 'Pick one';

  return (
    <div className="text-center">
      <div className="mb-3 flex justify-center gap-3">
        {RPS.map((e, i) => (
          <motion.button
            key={e}
            type="button"
            disabled={rolling}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => play(i)}
            className="h-16 w-16 rounded-2xl bg-emerald-500/15 text-3xl transition-colors hover:bg-emerald-500/25 disabled:opacity-60"
          >
            {e}
          </motion.button>
        ))}
      </div>

      <div className="flex h-14 items-center justify-center">
        {rolling ? (
          <motion.div
            animate={{ y: [0, -10, 0, -10, 0, -10, 0] }}
            transition={{ duration: 0.44 }}
            className="flex items-center gap-6 text-3xl"
          >
            <span>✊</span>
            <span className="text-xs font-bold opacity-50">VS</span>
            <span>✊</span>
          </motion.div>
        ) : res ? (
          <motion.div
            key={res.id}
            initial={{ scale: 0.65, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 420, damping: 20 }}
            className="flex items-center gap-5 text-3xl"
          >
            <motion.span
              animate={status === 'win' ? { scale: [1, 1.25, 1.1], y: [0, -6, 0] } : { scale: 1 }}
            >
              {RPS[res.me]}
            </motion.span>
            <span className="text-xs font-bold opacity-50">VS</span>
            <motion.span
              animate={status === 'lose' ? { scale: [1, 1.25, 1.1], y: [0, -6, 0] } : { scale: 1 }}
            >
              {RPS[res.bot]}
            </motion.span>
          </motion.div>
        ) : (
          <span className="text-2xl opacity-70">❔</span>
        )}
      </div>

      <motion.p
        key={outcome}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-2 text-sm font-semibold"
      >
        {outcome}
      </motion.p>

      <div className="flex items-center justify-between text-xs">
        <span>
          W {tally.w} · L {tally.l} · D {tally.d}
        </span>
        {tally.w + tally.l + tally.d > 0 && (
          <button
            type="button"
            className="rounded-full bg-[#22C55E] px-3 py-1 font-semibold text-white"
            onClick={() =>
              share(`✂️ Rock-Paper-Scissors vs the bot: ${tally.w} wins, ${tally.l} losses, ${tally.d} draws`)
            }
          >
            Share score
          </button>
        )}
      </div>
    </div>
  );
};

/* ---------- Reaction test (Pulse Rings & Burst Flash) ---------- */
const ReactionGame: React.FC<{ share: Share }> = ({ share }) => {
  const [state, setState] = useState<'idle' | 'wait' | 'go' | 'early' | 'done'>('idle');
  const [ms, setMs] = useState(0);
  const [bestMs, setBestMs] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const start = useRef(0);

  useEffect(() => () => clearTimeout(timer.current), []);

  const click = () => {
    if (state === 'idle' || state === 'early' || state === 'done') {
      setState('wait');
      timer.current = setTimeout(() => {
        start.current = performance.now();
        setState('go');
      }, 1200 + Math.random() * 2500);
    } else if (state === 'wait') {
      clearTimeout(timer.current);
      setState('early');
    } else {
      const val = Math.round(performance.now() - start.current);
      setMs(val);
      setBestMs((prev) => (prev === null ? val : Math.min(prev, val)));
      setState('done');
    }
  };

  const label = {
    idle: 'Click to start',
    wait: 'Wait for green…',
    go: 'CLICK!',
    early: 'Too early! Click to retry',
    done: `${ms} ms — click to retry`,
  }[state];

  const color =
    state === 'go'
      ? 'bg-[#22C55E] text-white'
      : state === 'wait'
        ? 'bg-rose-500/80 text-white'
        : state === 'early'
          ? 'bg-amber-500/30'
          : 'bg-emerald-500/20';

  return (
    <div>
      <motion.button
        type="button"
        onClick={click}
        animate={
          state === 'early'
            ? { x: [0, -8, 8, -5, 5, 0] }
            : state === 'go'
              ? { scale: [0.96, 1.03, 1] }
              : { x: 0, scale: 1 }
        }
        transition={{ duration: 0.28 }}
        className={`relative flex h-36 w-full flex-col items-center justify-center overflow-hidden rounded-2xl text-lg font-bold transition-colors ${color}`}
      >
        {(state === 'idle' || state === 'wait') && (
          <motion.span
            key={state}
            initial={{ scale: 0.6, opacity: 0.45 }}
            animate={{ scale: 1.9, opacity: 0 }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeOut' }}
            className="pointer-events-none absolute h-24 w-24 rounded-full border-2 border-white/40"
          />
        )}
        <motion.span
          key={`${state}-${ms}`}
          initial={{ scale: 0.85, opacity: 0.7 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative z-10"
        >
          {label}
        </motion.span>
        {state === 'done' && bestMs !== null && (
          <span className="relative z-10 mt-1 text-xs font-medium opacity-75">
            Best: {bestMs} ms
          </span>
        )}
      </motion.button>

      {state === 'done' && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 text-right"
        >
          <button
            type="button"
            className="rounded-full bg-[#22C55E] px-3 py-1 text-xs font-semibold text-white"
            onClick={() => share(`⚡ My reaction time is ${ms} ms. Think you're faster?`)}
          >
            Share score
          </button>
        </motion.div>
      )}
    </div>
  );
};

/* ---------- Hub ---------- */
type GameId = 'soulbattle' | 'cryptle' | 'memory' | 'snake' | '2048' | 'rps' | 'reaction';

const CLASSIC_GAMES: { id: GameId; emoji: string; name: string; hint: string }[] = [
  { id: '2048', emoji: '🔢', name: '2048', hint: 'Smooth sliding tiles' },
  { id: 'memory', emoji: '🧠', name: 'Memory Match', hint: '3D card flip pairs' },
  { id: 'snake', emoji: '🐍', name: 'Snake', hint: 'Eat, grow, survive' },
  { id: 'rps', emoji: '✂️', name: 'Rock Paper Scissors', hint: 'Versus the bot' },
  { id: 'reaction', emoji: '⚡', name: 'Reaction Test', hint: 'How fast are you?' },
];

const ALL_TITLES: Record<GameId, string> = {
  soulbattle: '❤️ SOUL Duel — Daily Boss',
  cryptle: '🦴 Cryptle — Daily Word',
  '2048': '2048',
  memory: 'Memory Match',
  snake: 'Snake',
  rps: 'Rock Paper Scissors',
  reaction: 'Reaction Test',
};

const QUICK_SENDS: { label: string; make: () => string }[] = [
  { label: '🎲 Roll dice', make: () => `🎲 Rolled a ${1 + Math.floor(Math.random() * 6)}` },
  { label: '🪙 Flip coin', make: () => `🪙 Coin flip: ${pick(['Heads', 'Tails'])}` },
  {
    label: '🎱 Magic 8-ball',
    make: () =>
      `🎱 ${pick([
        'It is certain.',
        'Ask again later.',
        'Don’t count on it.',
        'Signs point to yes.',
        'Very doubtful.',
        'Without a doubt.',
        'Cannot predict now.',
      ])}`,
  },
  { label: '🎯 Pick a number', make: () => `🎯 My number is ${1 + Math.floor(Math.random() * 100)} (1–100)` },
  {
    label: '🤔 Would you rather',
    make: () =>
      `🤔 Would you rather ${pick([
        'fly or be invisible?',
        'never sleep or never eat?',
        'have no phone or no internet?',
        'time travel to the past or the future?',
        'be a legend or be rich?',
      ])}`,
  },
];

export const GamesMenu: React.FC<{
  onClose: () => void;
  onTicTacToe: () => void;
  onShare: (text: string) => void;
}> = ({ onClose, onTicTacToe, onShare }) => {
  const [game, setGame] = useState<GameId | null>(null);
  const share: Share = (t) => {
    onShare(t);
    onClose();
  };

  const dailyBoss = getDailyBoss();
  const bossDoneToday = hasClearedDailyBossToday();
  const bossSave = loadSoulBattleSave();
  const cryptleNum = getCryptlePuzzleNumber(getCryptleDateKey());
  const cryptleDoneToday = hasCompletedDailyCryptleToday();

  // Blur any active external input/textarea on mount so game keys don't leak into chat box
  useEffect(() => {
    const active = document.activeElement;
    if (active instanceof HTMLElement && (active.tagName === 'TEXTAREA' || active.tagName === 'INPUT')) {
      active.blur();
    }
  }, []);

  const widthClass =
    game === 'soulbattle' ? 'max-w-xl' : game === 'cryptle' ? 'max-w-md' : 'max-w-sm';

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 p-3 sm:p-4"
      onPointerDown={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
      aria-label="Games"
    >
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className={`glass-panel glass-surface glass-readable max-h-[90vh] w-full ${widthClass} overflow-y-auto rounded-3xl p-4 text-emerald-950 transition-[max-width] duration-200 dark:text-white`}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold">{game ? ALL_TITLES[game] : '🎮 Games'}</h2>
          <div className="flex items-center gap-1">
            {game && (
              <button
                type="button"
                onClick={() => setGame(null)}
                className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold hover:bg-emerald-500/25"
              >
                Back
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close games"
              className="rounded-full p-1.5 hover:bg-emerald-500/15"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {!game ? (
            <motion.div
              key="hub"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.16 }}
              className="space-y-3"
            >
              {/* Daily featured games */}
              <div>
                <p className="mb-1.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider opacity-60">
                  <Sparkles className="h-3 w-3" /> Daily Challenges
                </p>
                <div className="grid grid-cols-1 gap-2">
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.015 }}
                    whileTap={{ scale: 0.985 }}
                    onClick={() => setGame('soulbattle')}
                    className="flex items-center justify-between rounded-2xl border border-yellow-500/30 bg-gradient-to-r from-zinc-950 to-zinc-900 px-3 py-2.5 text-left text-white shadow-sm"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">❤️</span>
                      <div>
                        <span className="block text-xs font-extrabold tracking-wide text-yellow-300">
                          SOUL Duel · Today: {dailyBoss.name}
                        </span>
                        <span className="block text-[10px] text-zinc-300">
                          {dailyBoss.title} · Undertale-style boss fight
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] font-bold">
                      {bossSave.streak > 0 && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/20 px-1.5 py-0.5 text-amber-300">
                          <Flame className="h-3 w-3" /> {bossSave.streak}
                        </span>
                      )}
                      {bossDoneToday && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
                    </div>
                  </motion.button>

                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.015 }}
                    whileTap={{ scale: 0.985 }}
                    onClick={() => setGame('cryptle')}
                    className="flex items-center justify-between rounded-2xl border border-emerald-500/25 bg-emerald-500/15 px-3 py-2.5 text-left hover:bg-emerald-500/20"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">🦴</span>
                      <div>
                        <span className="block text-xs font-extrabold">Cryptle #{cryptleNum}</span>
                        <span className="block text-[10px] opacity-70">
                          Daily · Infinite · 1m/5m/10m Blitz
                        </span>
                      </div>
                    </div>
                    {cryptleDoneToday && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                  </motion.button>
                </div>
              </div>

              <div>
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider opacity-60">
                  Play with your chat
                </p>
                <button
                  type="button"
                  onClick={() => {
                    onTicTacToe();
                    onClose();
                  }}
                  className="flex w-full items-center gap-3 rounded-xl bg-emerald-500/10 px-3 py-2 text-left hover:bg-emerald-500/20"
                >
                  <span className="text-xl">❌⭕</span>
                  <span className="text-sm font-semibold">
                    Tic-Tac-Toe
                    <span className="block text-[11px] font-normal opacity-60">
                      Challenge someone in this chat
                    </span>
                  </span>
                </button>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {QUICK_SENDS.map((q) => (
                    <button
                      key={q.label}
                      type="button"
                      onClick={() => share(q.make())}
                      className="rounded-full bg-emerald-500/15 px-3 py-1.5 text-[11px] font-semibold hover:bg-emerald-500/25"
                    >
                      {q.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider opacity-60">
                  Play solo — share your score
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {CLASSIC_GAMES.map((g) => (
                    <motion.button
                      key={g.id}
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setGame(g.id)}
                      className="rounded-xl bg-emerald-500/10 px-3 py-2.5 text-left hover:bg-emerald-500/20"
                    >
                      <span className="text-xl">{g.emoji}</span>
                      <span className="block text-xs font-semibold">{g.name}</span>
                      <span className="block text-[10px] opacity-60">{g.hint}</span>
                    </motion.button>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key={game}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.16 }}
            >
              {game === 'soulbattle' ? (
                <SoulBattleGame share={share} />
              ) : game === 'cryptle' ? (
                <DailyWordGame share={share} />
              ) : game === 'memory' ? (
                <MemoryGame share={share} />
              ) : game === 'snake' ? (
                <SnakeGame share={share} />
              ) : game === '2048' ? (
                <Game2048 share={share} />
              ) : game === 'rps' ? (
                <RpsGame share={share} />
              ) : (
                <ReactionGame share={share} />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
