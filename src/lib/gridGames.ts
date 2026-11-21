export type Mark = 'X' | 'O';
export type Cell = Mark | null;
export type GridGameId =
  | 'tic-tac-toe'
  | 'mega-tic-tac-toe'
  | 'connect-four'
  | 'connect-five'
  | 'gomoku'
  | 'reversi';

export interface GridGameConfig {
  id: GridGameId;
  name: string;
  emoji: string;
  hint: string;
  cols: number;
  rows: number;
  /** Pieces needed in a row (line games). */
  winLen: number;
  /** Pieces fall to the lowest empty row of the chosen column (move = column index). */
  gravity: boolean;
  kind: 'line' | 'reversi';
  /** Display symbols for X and O. */
  symbols: [string, string];
}

export const GRID_GAMES: Record<GridGameId, GridGameConfig> = {
  'tic-tac-toe': { id: 'tic-tac-toe', name: 'Tic-Tac-Toe', emoji: '❌⭕', hint: 'Three in a row', cols: 3, rows: 3, winLen: 3, gravity: false, kind: 'line', symbols: ['X', 'O'] },
  'mega-tic-tac-toe': { id: 'mega-tic-tac-toe', name: 'Mega Tic-Tac-Toe', emoji: '✖️🔵', hint: '4 in a row on a 5×5 board', cols: 5, rows: 5, winLen: 4, gravity: false, kind: 'line', symbols: ['X', 'O'] },
  'connect-four': { id: 'connect-four', name: 'Connect Four', emoji: '🔴🟡', hint: 'Drop discs, line up four', cols: 7, rows: 6, winLen: 4, gravity: true, kind: 'line', symbols: ['🔴', '🟡'] },
  'connect-five': { id: 'connect-five', name: 'Connect Five', emoji: '🟣🟠', hint: 'Bigger board, line up five', cols: 9, rows: 7, winLen: 5, gravity: true, kind: 'line', symbols: ['🟣', '🟠'] },
  gomoku: { id: 'gomoku', name: 'Gomoku', emoji: '⚫⚪', hint: 'Five in a row on a 9×9 board', cols: 9, rows: 9, winLen: 5, gravity: false, kind: 'line', symbols: ['⚫', '⚪'] },
  reversi: { id: 'reversi', name: 'Reversi', emoji: '🟢⚪', hint: 'Flank discs to flip them', cols: 8, rows: 8, winLen: 0, gravity: false, kind: 'reversi', symbols: ['⚫', '⚪'] },
};

export const emptyBoard = (g: GridGameConfig): Cell[] => {
  const b: Cell[] = Array(g.cols * g.rows).fill(null);
  if (g.kind === 'reversi') {
    b[27] = 'O'; b[36] = 'O';
    b[28] = 'X'; b[35] = 'X';
  }
  return b;
};

const DIRS8 = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];

/** Indices flipped if `mark` plays at `idx` in reversi. */
export function reversiFlips(board: Cell[], idx: number, mark: Mark): number[] {
  if (board[idx]) return [];
  const opp: Mark = mark === 'X' ? 'O' : 'X';
  const cx = idx % 8, cy = Math.floor(idx / 8);
  const out: number[] = [];
  for (const [dx, dy] of DIRS8) {
    const run: number[] = [];
    let x = cx + dx, y = cy + dy;
    while (x >= 0 && y >= 0 && x < 8 && y < 8 && board[y * 8 + x] === opp) {
      run.push(y * 8 + x);
      x += dx; y += dy;
    }
    if (run.length && x >= 0 && y >= 0 && x < 8 && y < 8 && board[y * 8 + x] === mark) out.push(...run);
  }
  return out;
}

export const reversiMoves = (board: Cell[], mark: Mark): number[] =>
  board.map((_, i) => i).filter((i) => reversiFlips(board, i, mark).length > 0);

/** Resolve a move (cell index, or column index for gravity games) to a board index, or -1 if illegal. */
export function resolveMove(g: GridGameConfig, board: Cell[], pos: number, mark?: Mark): number {
  if (g.gravity) {
    if (pos < 0 || pos >= g.cols) return -1;
    for (let r = g.rows - 1; r >= 0; r--) if (!board[r * g.cols + pos]) return r * g.cols + pos;
    return -1;
  }
  if (pos < 0 || pos >= board.length || board[pos]) return -1;
  if (g.kind === 'reversi' && mark && reversiFlips(board, pos, mark).length === 0) return -1;
  return pos;
}

function lineResult(g: GridGameConfig, board: Cell[], idx: number): Mark | 'draw' | null {
  const mark = board[idx];
  const cx = idx % g.cols;
  const cy = Math.floor(idx / g.cols);
  for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [1, -1]]) {
    let n = 1;
    for (const s of [1, -1]) {
      let x = cx + dx * s, y = cy + dy * s;
      while (x >= 0 && y >= 0 && x < g.cols && y < g.rows && board[y * g.cols + x] === mark) {
        n++;
        x += dx * s;
        y += dy * s;
      }
    }
    if (n >= g.winLen && mark) return mark;
  }
  return board.every(Boolean) ? 'draw' : null;
}

/** Apply a move for `mark`. Returns null if illegal. */
export function applyMove(
  g: GridGameConfig,
  board: Cell[],
  pos: number,
  mark: Mark
): { board: Cell[]; next: Mark; winner?: Mark | 'draw' } | null {
  const idx = resolveMove(g, board, pos, mark);
  if (idx < 0) return null;
  const b = board.slice();
  const opp: Mark = mark === 'X' ? 'O' : 'X';
  if (g.kind === 'line') {
    b[idx] = mark;
    return { board: b, next: opp, winner: lineResult(g, b, idx) ?? undefined };
  }
  for (const f of reversiFlips(board, idx, mark)) b[f] = mark;
  b[idx] = mark;
  let next = opp;
  if (!reversiMoves(b, opp).length) {
    if (reversiMoves(b, mark).length) next = mark; // opponent passes
    else {
      const x = b.filter((c) => c === 'X').length;
      const o = b.filter((c) => c === 'O').length;
      return { board: b, next: opp, winner: x === o ? 'draw' : x > o ? 'X' : 'O' };
    }
  }
  return { board: b, next };
}
