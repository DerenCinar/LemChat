import type { Cell, Mark } from './gridGames';

export type DuelGameId = 'checkers' | 'dots-and-boxes' | 'pig' | 'memory-duel';

export interface DuelInfo {
  id: DuelGameId;
  name: string;
  emoji: string;
  hint: string;
  symbols: [string, string];
}

export const DUEL_GAMES: Record<DuelGameId, DuelInfo> = {
  checkers: { id: 'checkers', name: 'Checkers', emoji: '🔴⚪', hint: 'Jump and capture, make kings', symbols: ['🔴', '⚪'] },
  'dots-and-boxes': { id: 'dots-and-boxes', name: 'Dots & Boxes', emoji: '🔲', hint: 'Draw lines, claim boxes', symbols: ['🟦', '🟧'] },
  pig: { id: 'pig', name: 'Pig', emoji: '🎲', hint: 'Push your luck — first to 50', symbols: ['🟦', '🟧'] },
  'memory-duel': { id: 'memory-duel', name: 'Memory Duel', emoji: '🧠', hint: 'Match pairs, most pairs wins', symbols: ['🟦', '🟧'] },
};

export interface GamePatch {
  board?: Cell[];
  state?: Record<string, unknown>;
  currentTurn: Mark;
  winner?: Mark | 'draw';
}

const other = (m: Mark): Mark => (m === 'X' ? 'O' : 'X');

/* ---------------- Checkers ---------------- */
export interface CheckersState {
  kings: number[];
  /** Piece that must keep jumping. */
  chain: number | null;
}
export interface CheckersMove {
  from: number;
  to: number;
  cap?: number;
}

export function checkersInitial(): { board: Cell[]; state: CheckersState } {
  const board: Cell[] = Array(64).fill(null);
  for (let i = 0; i < 64; i++) {
    const x = i % 8, y = Math.floor(i / 8);
    if ((x + y) % 2 === 1) {
      if (y < 3) board[i] = 'O';
      else if (y > 4) board[i] = 'X';
    }
  }
  return { board, state: { kings: [], chain: null } };
}

export function checkersMoves(board: Cell[], st: CheckersState, mark: Mark): CheckersMove[] {
  const steps: CheckersMove[] = [];
  const jumps: CheckersMove[] = [];
  const fwd = mark === 'X' ? -1 : 1;
  for (let i = 0; i < 64; i++) {
    if (board[i] !== mark) continue;
    if (st.chain !== null && st.chain !== i) continue;
    const x = i % 8, y = Math.floor(i / 8);
    const dirs = st.kings.includes(i) ? [-1, 1] : [fwd];
    for (const dy of dirs) {
      for (const dx of [-1, 1]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx > 7 || ny > 7) continue;
        const n = ny * 8 + nx;
        if (!board[n]) steps.push({ from: i, to: n });
        else if (board[n] === other(mark)) {
          const jx = x + 2 * dx, jy = y + 2 * dy;
          if (jx >= 0 && jy >= 0 && jx <= 7 && jy <= 7 && !board[jy * 8 + jx]) {
            jumps.push({ from: i, to: jy * 8 + jx, cap: n });
          }
        }
      }
    }
  }
  return jumps.length ? jumps : st.chain !== null ? [] : steps;
}

export function checkersApply(board: Cell[], st: CheckersState, mark: Mark, mv: CheckersMove): GamePatch | null {
  if (!checkersMoves(board, st, mark).some((m) => m.from === mv.from && m.to === mv.to)) return null;
  const b = board.slice();
  let kings = st.kings.filter((k) => k !== mv.from && k !== mv.cap);
  const wasKing = st.kings.includes(mv.from);
  b[mv.to] = mark;
  b[mv.from] = null;
  if (mv.cap !== undefined) b[mv.cap] = null;
  const lastRow = mark === 'X' ? 0 : 7;
  const crowned = !wasKing && Math.floor(mv.to / 8) === lastRow;
  if (wasKing || crowned) kings = [...kings, mv.to];
  if (mv.cap !== undefined && !crowned) {
    const again = checkersMoves(b, { kings, chain: mv.to }, mark);
    if (again.length) return { board: b, state: { kings, chain: mv.to } as unknown as Record<string, unknown>, currentTurn: mark };
  }
  const next = other(mark);
  const ns: CheckersState = { kings, chain: null };
  const winner = checkersMoves(b, ns, next).length ? undefined : mark;
  return { board: b, state: ns as unknown as Record<string, unknown>, currentTurn: next, winner };
}

/* ---------------- Dots & Boxes (4x4 boxes) ---------------- */
export const DB_N = 4;
export interface DotsState {
  h: Array<Mark | null>; // (N+1) rows x N cols
  v: Array<Mark | null>; // N rows x (N+1) cols
  boxes: Array<Mark | null>; // N x N
}

export const dotsInitial = (): DotsState => ({
  h: Array((DB_N + 1) * DB_N).fill(null),
  v: Array(DB_N * (DB_N + 1)).fill(null),
  boxes: Array(DB_N * DB_N).fill(null),
});

export function dotsApply(st: DotsState, kind: 'h' | 'v', idx: number, mark: Mark): GamePatch | null {
  if (st[kind][idx]) return null;
  const s: DotsState = { h: st.h.slice(), v: st.v.slice(), boxes: st.boxes.slice() };
  s[kind][idx] = mark;
  let gained = 0;
  for (let r = 0; r < DB_N; r++) {
    for (let c = 0; c < DB_N; c++) {
      const bi = r * DB_N + c;
      if (s.boxes[bi]) continue;
      if (s.h[r * DB_N + c] && s.h[(r + 1) * DB_N + c] && s.v[r * (DB_N + 1) + c] && s.v[r * (DB_N + 1) + c + 1]) {
        s.boxes[bi] = mark;
        gained++;
      }
    }
  }
  let winner: Mark | 'draw' | undefined;
  if (s.boxes.every(Boolean)) {
    const x = s.boxes.filter((b) => b === 'X').length;
    const o = s.boxes.length - x;
    winner = x === o ? 'draw' : x > o ? 'X' : 'O';
  }
  return { state: s as unknown as Record<string, unknown>, currentTurn: gained ? mark : other(mark), winner };
}

/* ---------------- Pig ---------------- */
export const PIG_GOAL = 50;
export interface PigState {
  scores: { X: number; O: number };
  turnTotal: number;
  lastRoll: number | null;
}
export const pigInitial = (): PigState => ({ scores: { X: 0, O: 0 }, turnTotal: 0, lastRoll: null });

export function pigRoll(st: PigState, mark: Mark): GamePatch {
  const r = 1 + Math.floor(Math.random() * 6);
  if (r === 1) return { state: { ...st, turnTotal: 0, lastRoll: 1 }, currentTurn: other(mark) };
  return { state: { ...st, turnTotal: st.turnTotal + r, lastRoll: r }, currentTurn: mark };
}

export function pigHold(st: PigState, mark: Mark): GamePatch {
  const scores = { ...st.scores, [mark]: st.scores[mark] + st.turnTotal };
  const won = scores[mark] >= PIG_GOAL;
  return {
    state: { ...st, scores, turnTotal: 0, lastRoll: null },
    currentTurn: other(mark),
    winner: won ? mark : undefined,
  };
}

/* ---------------- Memory Duel ---------------- */
export interface MemoryState {
  cards: string[];
  matched: Array<Mark | null>;
  flipped: number[];
}
const FACES = ['🍎', '🍋', '🍇', '🍓', '🥝', '🍒', '🍑', '🍍', '🥥', '🍉'];
export const memoryInitial = (): MemoryState => {
  const cards = [...FACES, ...FACES].map((e) => ({ e, r: Math.random() })).sort((a, b) => a.r - b.r).map((c) => c.e);
  return { cards, matched: Array(cards.length).fill(null), flipped: [] };
};

export function memoryFlip(st: MemoryState, idx: number, mark: Mark): GamePatch | null {
  if (st.matched[idx] || (st.flipped.includes(idx) && st.flipped.length === 1)) return null;
  if (st.flipped.length !== 1) {
    // Starting a new pick (any previous mismatch is hidden again).
    return { state: { ...st, flipped: [idx] }, currentTurn: mark };
  }
  const a = st.flipped[0];
  if (st.cards[a] === st.cards[idx]) {
    const matched = st.matched.slice();
    matched[a] = mark;
    matched[idx] = mark;
    let winner: Mark | 'draw' | undefined;
    if (matched.every(Boolean)) {
      const x = matched.filter((m) => m === 'X').length;
      const o = matched.length - x;
      winner = x === o ? 'draw' : x > o ? 'X' : 'O';
    }
    return { state: { ...st, matched, flipped: [] }, currentTurn: mark, winner };
  }
  return { state: { ...st, flipped: [a, idx] }, currentTurn: other(mark) };
}

export function initialDuel(id: DuelGameId): { board: Cell[]; state: Record<string, unknown> } {
  switch (id) {
    case 'checkers': {
      const c = checkersInitial();
      return { board: c.board, state: c.state as unknown as Record<string, unknown> };
    }
    case 'dots-and-boxes':
      return { board: [], state: dotsInitial() as unknown as Record<string, unknown> };
    case 'pig':
      return { board: [], state: pigInitial() as unknown as Record<string, unknown> };
    case 'memory-duel':
      return { board: [], state: memoryInitial() as unknown as Record<string, unknown> };
  }
}
