import { describe, expect, it } from 'vitest';
import { GRID_GAMES, applyMove, emptyBoard, reversiMoves, resolveMove } from '../src/lib/gridGames';

const line = Object.values(GRID_GAMES).find((g) => g.kind === 'line' && !g.gravity)!;
const gravity = Object.values(GRID_GAMES).find((g) => g.gravity)!;
const reversi = Object.values(GRID_GAMES).find((g) => g.kind === 'reversi')!;

describe('gridGames', () => {
  it('rejects moves on occupied cells', () => {
    const b = emptyBoard(line);
    const r = applyMove(line, b, 0, 'X')!;
    expect(applyMove(line, r.board, 0, 'O')).toBeNull();
  });

  it('alternates turns', () => {
    const r = applyMove(line, emptyBoard(line), 0, 'X')!;
    expect(r.next).toBe('O');
  });

  it('gravity games drop to the lowest free row', () => {
    const b = emptyBoard(gravity);
    const first = resolveMove(gravity, b, 0);
    expect(first).toBe((gravity.rows - 1) * gravity.cols);
    const after = applyMove(gravity, b, 0, 'X')!.board;
    expect(resolveMove(gravity, after, 0)).toBe((gravity.rows - 2) * gravity.cols);
  });

  it('rejects out-of-range columns', () => {
    expect(resolveMove(gravity, emptyBoard(gravity), -1)).toBe(-1);
    expect(resolveMove(gravity, emptyBoard(gravity), gravity.cols)).toBe(-1);
  });

  it('reversi starts with legal moves for both sides and flips discs', () => {
    const b = emptyBoard(reversi);
    const moves = reversiMoves(b, 'X');
    expect(moves.length).toBe(4);
    const r = applyMove(reversi, b, moves[0], 'X')!;
    expect(r.board.filter((c) => c === 'X').length).toBe(4);
  });
});
