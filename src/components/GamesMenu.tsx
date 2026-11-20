import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';

type Share = (text: string) => void;

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

/* ---------- Memory match ---------- */
const MemoryGame: React.FC<{ share: Share }> = ({ share }) => {
  const deal = () =>
    [...'🍎🍋🍇🍓🥝🍒🍑🍍', ...'🍎🍋🍇🍓🥝🍒🍑🍍'].map((e, i) => ({ id: i, e, r: Math.random() })).sort((a, b) => a.r - b.r);
  const [cards, setCards] = useState(deal);
  const [open, setOpen] = useState<number[]>([]);
  const [done, setDone] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const won = done.length === cards.length;

  const flip = (id: number) => {
    if (open.length === 2 || open.includes(id) || done.includes(id)) return;
    const next = [...open, id];
    setOpen(next);
    if (next.length === 2) {
      setMoves((m) => m + 1);
      const [a, b] = next.map((i) => cards.find((c) => c.id === i)!);
      if (a.e === b.e) {
        setDone((d) => [...d, a.id, b.id]);
        setOpen([]);
      } else setTimeout(() => setOpen([]), 700);
    }
  };
  return (
    <div>
      <div className="grid grid-cols-4 gap-2">
        {cards.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => flip(c.id)}
            className={`flex h-14 items-center justify-center rounded-xl text-2xl transition ${
              open.includes(c.id) || done.includes(c.id) ? 'bg-emerald-500/25' : 'bg-emerald-500/10 hover:bg-emerald-500/20'
            }`}
          >
            {open.includes(c.id) || done.includes(c.id) ? c.e : ''}
          </button>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between text-xs">
        <span>Moves: {moves}</span>
        <div className="flex gap-2">
          <button type="button" className="rounded-full bg-emerald-500/15 px-3 py-1" onClick={() => { setCards(deal()); setOpen([]); setDone([]); setMoves(0); }}>Restart</button>
          {won && <button type="button" className="rounded-full bg-[#22C55E] px-3 py-1 text-white" onClick={() => share(`🧠 I cleared Memory Match in ${moves} moves — beat that!`)}>Share score</button>}
        </div>
      </div>
      {won && <p className="mt-2 text-center text-sm font-semibold">You won in {moves} moves! 🎉</p>}
    </div>
  );
};

/* ---------- Snake ---------- */
const N = 16;
const SnakeGame: React.FC<{ share: Share }> = ({ share }) => {
  const [snake, setSnake] = useState<[number, number][]>([[8, 8], [7, 8], [6, 8]]);
  const [food, setFood] = useState<[number, number]>([12, 8]);
  const [dead, setDead] = useState(false);
  const [started, setStarted] = useState(false);
  const dir = useRef<[number, number]>([1, 0]);
  const queued = useRef<[number, number]>([1, 0]);
  const score = snake.length - 3;

  const turn = useCallback((dx: number, dy: number) => {
    if (dx === -dir.current[0] && dy === -dir.current[1]) return;
    queued.current = [dx, dy];
    setStarted(true);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const m: Record<string, [number, number]> = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0], w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0] };
      const d = m[e.key];
      if (d) { e.preventDefault(); turn(d[0], d[1]); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [turn]);

  useEffect(() => {
    if (!started || dead) return;
    const id = setInterval(() => {
      dir.current = queued.current;
      setSnake((s) => {
        const head: [number, number] = [s[0][0] + dir.current[0], s[0][1] + dir.current[1]];
        if (head[0] < 0 || head[1] < 0 || head[0] >= N || head[1] >= N || s.some(([x, y]) => x === head[0] && y === head[1])) {
          setDead(true);
          return s;
        }
        const ate = head[0] === food[0] && head[1] === food[1];
        const next = [head, ...s];
        if (!ate) next.pop();
        else {
          let f: [number, number];
          do f = [Math.floor(Math.random() * N), Math.floor(Math.random() * N)];
          while (next.some(([x, y]) => x === f[0] && y === f[1]));
          setFood(f);
        }
        return next;
      });
    }, 130);
    return () => clearInterval(id);
  }, [started, dead, food]);

  const reset = () => { setSnake([[8, 8], [7, 8], [6, 8]]); setFood([12, 8]); dir.current = [1, 0]; queued.current = [1, 0]; setDead(false); setStarted(false); };
  return (
    <div>
      <div className="mx-auto grid aspect-square w-full max-w-[280px] rounded-xl bg-black/20 p-1" style={{ gridTemplateColumns: `repeat(${N}, 1fr)` }}>
        {Array.from({ length: N * N }, (_, i) => {
          const x = i % N, y = Math.floor(i / N);
          const isHead = snake[0][0] === x && snake[0][1] === y;
          const isBody = snake.some(([sx, sy]) => sx === x && sy === y);
          const isFood = food[0] === x && food[1] === y;
          return <div key={i} className={`m-[0.5px] rounded-[3px] ${isHead ? 'bg-[#22C55E]' : isBody ? 'bg-emerald-400/70' : isFood ? 'bg-rose-500' : ''}`} />;
        })}
      </div>
      <div className="mx-auto mt-3 grid w-32 grid-cols-3 gap-1 text-lg sm:hidden">
        <span /><button type="button" className="rounded-lg bg-emerald-500/15 py-1" onClick={() => turn(0, -1)}>↑</button><span />
        <button type="button" className="rounded-lg bg-emerald-500/15 py-1" onClick={() => turn(-1, 0)}>←</button>
        <button type="button" className="rounded-lg bg-emerald-500/15 py-1" onClick={() => turn(0, 1)}>↓</button>
        <button type="button" className="rounded-lg bg-emerald-500/15 py-1" onClick={() => turn(1, 0)}>→</button>
      </div>
      <div className="mt-3 flex items-center justify-between text-xs">
        <span>{dead ? `Game over — score ${score}` : started ? `Score: ${score}` : 'Arrow keys / WASD to start'}</span>
        <div className="flex gap-2">
          <button type="button" className="rounded-full bg-emerald-500/15 px-3 py-1" onClick={reset}>Restart</button>
          {dead && score > 0 && <button type="button" className="rounded-full bg-[#22C55E] px-3 py-1 text-white" onClick={() => share(`🐍 I scored ${score} in Snake — can you beat me?`)}>Share score</button>}
        </div>
      </div>
    </div>
  );
};

/* ---------- 2048 ---------- */
type Board = number[][];
const empty = (): Board => Array.from({ length: 4 }, () => [0, 0, 0, 0]);
const addTile = (b: Board): Board => {
  const cells: [number, number][] = [];
  b.forEach((r, y) => r.forEach((v, x) => { if (!v) cells.push([x, y]); }));
  if (!cells.length) return b;
  const [x, y] = pick(cells);
  const n = b.map((r) => r.slice());
  n[y][x] = Math.random() < 0.9 ? 2 : 4;
  return n;
};
const slideRow = (row: number[]) => {
  const t = row.filter(Boolean);
  const out: number[] = [];
  let gained = 0;
  for (let i = 0; i < t.length; i++) {
    if (t[i] === t[i + 1]) { out.push(t[i] * 2); gained += t[i] * 2; i++; } else out.push(t[i]);
  }
  while (out.length < 4) out.push(0);
  return { out, gained };
};
const move = (b: Board, d: 'L' | 'R' | 'U' | 'D') => {
  let gained = 0;
  const rot = (m: Board) => m[0].map((_, x) => m.map((r) => r[x]));
  let m = d === 'U' || d === 'D' ? rot(b) : b.map((r) => r.slice());
  m = m.map((r) => {
    const src = d === 'R' || d === 'D' ? r.slice().reverse() : r;
    const { out, gained: g } = slideRow(src);
    gained += g;
    return d === 'R' || d === 'D' ? out.reverse() : out;
  });
  if (d === 'U' || d === 'D') m = rot(m);
  return { board: m, gained, moved: JSON.stringify(m) !== JSON.stringify(b) };
};
const TILE: Record<number, string> = { 0: 'bg-black/10', 2: 'bg-emerald-100 text-emerald-900', 4: 'bg-emerald-200 text-emerald-900', 8: 'bg-amber-300 text-black', 16: 'bg-orange-400 text-white', 32: 'bg-orange-500 text-white', 64: 'bg-red-500 text-white', 128: 'bg-yellow-400 text-black', 256: 'bg-yellow-500 text-black', 512: 'bg-lime-500 text-black', 1024: 'bg-emerald-500 text-white', 2048: 'bg-[#22C55E] text-white' };

const Game2048: React.FC<{ share: Share }> = ({ share }) => {
  const [board, setBoard] = useState<Board>(() => addTile(addTile(empty())));
  const [score, setScore] = useState(0);
  const over = (['L', 'R', 'U', 'D'] as const).every((d) => !move(board, d).moved);
  const go = useCallback((d: 'L' | 'R' | 'U' | 'D') => {
    setBoard((b) => {
      const r = move(b, d);
      if (!r.moved) return b;
      setScore((s) => s + r.gained);
      return addTile(r.board);
    });
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const m: Record<string, 'L' | 'R' | 'U' | 'D'> = { ArrowLeft: 'L', ArrowRight: 'R', ArrowUp: 'U', ArrowDown: 'D', a: 'L', d: 'R', w: 'U', s: 'D' };
      if (m[e.key]) { e.preventDefault(); go(m[e.key]); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go]);
  const touch = useRef<[number, number] | null>(null);
  return (
    <div>
      <div
        className="mx-auto grid w-full max-w-[280px] touch-none grid-cols-4 gap-1.5 rounded-xl bg-black/15 p-1.5"
        onPointerDown={(e) => { touch.current = [e.clientX, e.clientY]; }}
        onPointerUp={(e) => {
          if (!touch.current) return;
          const dx = e.clientX - touch.current[0], dy = e.clientY - touch.current[1];
          touch.current = null;
          if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return;
          go(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'R' : 'L') : dy > 0 ? 'D' : 'U');
        }}
      >
        {board.flat().map((v, i) => (
          <div key={i} className={`flex aspect-square items-center justify-center rounded-lg text-lg font-bold ${TILE[v] ?? 'bg-[#22C55E] text-white'}`}>{v || ''}</div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between text-xs">
        <span>{over ? `No moves left — score ${score}` : `Score: ${score} · arrows / swipe`}</span>
        <div className="flex gap-2">
          <button type="button" className="rounded-full bg-emerald-500/15 px-3 py-1" onClick={() => { setBoard(addTile(addTile(empty()))); setScore(0); }}>Restart</button>
          {score > 0 && <button type="button" className="rounded-full bg-[#22C55E] px-3 py-1 text-white" onClick={() => share(`🔢 I scored ${score} in 2048 — your turn!`)}>Share score</button>}
        </div>
      </div>
    </div>
  );
};

/* ---------- Rock Paper Scissors (vs bot) ---------- */
const RPS = ['🪨', '📄', '✂️'];
const RpsGame: React.FC<{ share: Share }> = ({ share }) => {
  const [res, setRes] = useState<{ me: number; bot: number } | null>(null);
  const [tally, setTally] = useState({ w: 0, l: 0, d: 0 });
  const play = (me: number) => {
    const bot = Math.floor(Math.random() * 3);
    setRes({ me, bot });
    setTally((t) => (me === bot ? { ...t, d: t.d + 1 } : (me - bot + 3) % 3 === 1 ? { ...t, w: t.w + 1 } : { ...t, l: t.l + 1 }));
  };
  const outcome = res ? (res.me === res.bot ? "It's a draw" : (res.me - res.bot + 3) % 3 === 1 ? 'You win! 🎉' : 'You lose 😅') : 'Pick one';
  return (
    <div className="text-center">
      <div className="mb-3 flex justify-center gap-3">
        {RPS.map((e, i) => (
          <button key={e} type="button" onClick={() => play(i)} className="h-16 w-16 rounded-2xl bg-emerald-500/15 text-3xl transition hover:scale-105 hover:bg-emerald-500/25">{e}</button>
        ))}
      </div>
      <p className="text-lg">{res ? `${RPS[res.me]}  vs  ${RPS[res.bot]}` : '❔'}</p>
      <p className="mb-2 text-sm font-semibold">{outcome}</p>
      <div className="flex items-center justify-between text-xs">
        <span>W {tally.w} · L {tally.l} · D {tally.d}</span>
        {tally.w + tally.l + tally.d > 0 && <button type="button" className="rounded-full bg-[#22C55E] px-3 py-1 text-white" onClick={() => share(`✂️ Rock-Paper-Scissors vs the bot: ${tally.w} wins, ${tally.l} losses, ${tally.d} draws`)}>Share score</button>}
      </div>
    </div>
  );
};

/* ---------- Reaction test ---------- */
const ReactionGame: React.FC<{ share: Share }> = ({ share }) => {
  const [state, setState] = useState<'idle' | 'wait' | 'go' | 'early' | 'done'>('idle');
  const [ms, setMs] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const start = useRef(0);
  useEffect(() => () => clearTimeout(timer.current), []);
  const click = () => {
    if (state === 'idle' || state === 'early' || state === 'done') {
      setState('wait');
      timer.current = setTimeout(() => { start.current = performance.now(); setState('go'); }, 1200 + Math.random() * 2500);
    } else if (state === 'wait') {
      clearTimeout(timer.current);
      setState('early');
    } else {
      setMs(Math.round(performance.now() - start.current));
      setState('done');
    }
  };
  const label = { idle: 'Click to start', wait: 'Wait for green…', go: 'CLICK!', early: 'Too early! Click to retry', done: `${ms} ms — click to retry` }[state];
  const color = state === 'go' ? 'bg-[#22C55E]' : state === 'wait' ? 'bg-rose-500/80' : 'bg-emerald-500/20';
  return (
    <div>
      <button type="button" onClick={click} className={`flex h-36 w-full items-center justify-center rounded-2xl text-lg font-bold transition ${color}`}>{label}</button>
      {state === 'done' && <div className="mt-3 text-right"><button type="button" className="rounded-full bg-[#22C55E] px-3 py-1 text-xs text-white" onClick={() => share(`⚡ My reaction time is ${ms} ms. Think you're faster?`)}>Share score</button></div>}
    </div>
  );
};

/* ---------- Hub ---------- */
type GameId = 'memory' | 'snake' | '2048' | 'rps' | 'reaction';
const GAMES: { id: GameId; emoji: string; name: string; hint: string }[] = [
  { id: 'memory', emoji: '🧠', name: 'Memory Match', hint: 'Find all the pairs' },
  { id: 'snake', emoji: '🐍', name: 'Snake', hint: 'Eat, grow, survive' },
  { id: '2048', emoji: '🔢', name: '2048', hint: 'Merge tiles' },
  { id: 'rps', emoji: '✂️', name: 'Rock Paper Scissors', hint: 'Versus the bot' },
  { id: 'reaction', emoji: '⚡', name: 'Reaction Test', hint: 'How fast are you?' },
];

const QUICK_SENDS: { label: string; make: () => string }[] = [
  { label: '🎲 Roll dice', make: () => `🎲 Rolled a ${1 + Math.floor(Math.random() * 6)}` },
  { label: '🪙 Flip coin', make: () => `🪙 Coin flip: ${pick(['Heads', 'Tails'])}` },
  { label: '🎱 Magic 8-ball', make: () => `🎱 ${pick(['It is certain.', 'Ask again later.', 'Don’t count on it.', 'Signs point to yes.', 'Very doubtful.', 'Without a doubt.', 'Cannot predict now.'])}` },
  { label: '🎯 Pick a number', make: () => `🎯 My number is ${1 + Math.floor(Math.random() * 100)} (1–100)` },
  { label: '🤔 Would you rather', make: () => `🤔 Would you rather ${pick(['fly or be invisible?', 'never sleep or never eat?', 'have no phone or no internet?', 'time travel to the past or the future?', 'be a legend or be rich?'])}` },
];

export const GamesMenu: React.FC<{
  onClose: () => void;
  onTicTacToe: () => void;
  onShare: (text: string) => void;
}> = ({ onClose, onTicTacToe, onShare }) => {
  const [game, setGame] = useState<GameId | null>(null);
  const share: Share = (t) => { onShare(t); onClose(); };
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4" onPointerDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Games">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="glass-panel glass-surface glass-readable max-h-[88vh] w-full max-w-sm overflow-y-auto rounded-3xl p-4 text-emerald-950 dark:text-white"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold">{game ? GAMES.find((g) => g.id === game)?.name : '🎮 Games'}</h2>
          <div className="flex items-center gap-1">
            {game && <button type="button" onClick={() => setGame(null)} className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold">Back</button>}
            <button type="button" onClick={onClose} aria-label="Close games" className="rounded-full p-1.5 hover:bg-emerald-500/15"><X className="h-4 w-4" /></button>
          </div>
        </div>
        {!game ? (
          <div className="space-y-3">
            <div>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider opacity-60">Play with your chat</p>
              <button type="button" onClick={() => { onTicTacToe(); onClose(); }} className="flex w-full items-center gap-3 rounded-xl bg-emerald-500/10 px-3 py-2 text-left hover:bg-emerald-500/20">
                <span className="text-xl">❌⭕</span>
                <span className="text-sm font-semibold">Tic-Tac-Toe<span className="block text-[11px] font-normal opacity-60">Challenge someone in this chat</span></span>
              </button>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {QUICK_SENDS.map((q) => (
                  <button key={q.label} type="button" onClick={() => share(q.make())} className="rounded-full bg-emerald-500/15 px-3 py-1.5 text-[11px] font-semibold hover:bg-emerald-500/25">{q.label}</button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider opacity-60">Play solo — share your score</p>
              <div className="grid grid-cols-2 gap-2">
                {GAMES.map((g) => (
                  <button key={g.id} type="button" onClick={() => setGame(g.id)} className="rounded-xl bg-emerald-500/10 px-3 py-2.5 text-left hover:bg-emerald-500/20">
                    <span className="text-xl">{g.emoji}</span>
                    <span className="block text-xs font-semibold">{g.name}</span>
                    <span className="block text-[10px] opacity-60">{g.hint}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : game === 'memory' ? <MemoryGame share={share} />
          : game === 'snake' ? <SnakeGame share={share} />
          : game === '2048' ? <Game2048 share={share} />
          : game === 'rps' ? <RpsGame share={share} />
          : <ReactionGame share={share} />}
      </motion.div>
    </div>
  );
};
