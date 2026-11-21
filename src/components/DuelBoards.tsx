import React from 'react';
import type { GameMetadata } from '../types/chat';
import {
  DB_N,
  PIG_GOAL,
  checkersApply,
  checkersMoves,
  dotsApply,
  memoryFlip,
  pigHold,
  pigRoll,
  type CheckersState,
  type DotsState,
  type GamePatch,
  type MemoryState,
  type PigState,
} from '../lib/duelGames';

interface Props {
  game: GameMetadata;
  myTurn: boolean;
  big: boolean;
  onPlay: (build: (g: GameMetadata, mark: 'X' | 'O') => GamePatch | null) => void;
}

const boardWidth = (big: boolean, small: number) =>
  big ? { width: 'min(92vw, 68vh, 620px)' } : { width: small };

/* ---------------- Checkers ---------------- */
const CheckersBoard: React.FC<Props> = ({ game, myTurn, big, onPlay }) => {
  const st = game.state as unknown as CheckersState;
  const mark = game.currentTurn;
  const [sel, setSel] = React.useState<number | null>(null);
  const moves = React.useMemo(
    () => (myTurn ? checkersMoves(game.board, st, mark) : []),
    [game.board, st, mark, myTurn]
  );
  const active = st.chain ?? sel;
  const movable = new Set(moves.map((m) => m.from));
  const dests = new Map(moves.filter((m) => m.from === active).map((m) => [m.to, m]));

  const click = (i: number) => {
    if (!myTurn) return;
    const mv = dests.get(i);
    if (mv) {
      setSel(null);
      onPlay((g, m) => checkersApply(g.board, g.state as unknown as CheckersState, m, mv));
    } else if (movable.has(i) && st.chain === null) setSel(i === sel ? null : i);
  };

  return (
    <div className="grid grid-cols-8 overflow-hidden rounded-lg" style={boardWidth(big, 256)}>
      {game.board.map((c, i) => {
        const dark = ((i % 8) + Math.floor(i / 8)) % 2 === 1;
        return (
          <button
            key={i}
            type="button"
            onClick={() => click(i)}
            className={`relative flex aspect-square items-center justify-center ${
              dark ? 'bg-emerald-900/60' : 'bg-emerald-100/20'
            } ${active === i ? 'ring-2 ring-inset ring-yellow-300' : ''}`}
          >
            {dests.has(i) && <span className="absolute h-1/3 w-1/3 rounded-full bg-yellow-300/70" />}
            {c && (
              <span
                className={`flex h-[78%] w-[78%] items-center justify-center rounded-full border-2 text-[0.9em] shadow ${
                  c === 'X' ? 'border-red-300 bg-red-500' : 'border-slate-300 bg-slate-100 text-slate-800'
                }`}
              >
                {st.kings.includes(i) ? '♛' : ''}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

/* ---------------- Dots & Boxes ---------------- */
const colorOf = (m: 'X' | 'O' | null) => (m === 'X' ? 'bg-sky-400' : m === 'O' ? 'bg-orange-400' : '');

const DotsBoard: React.FC<Props> = ({ game, myTurn, big, onPlay }) => {
  const st = game.state as unknown as DotsState;
  const track = Array.from({ length: DB_N * 2 + 1 }, (_, i) =>
    i % 2 === 0 ? (big ? '16px' : '12px') : 'minmax(0, 1fr)'
  ).join(' ');
  const play = (kind: 'h' | 'v', idx: number) => {
    if (myTurn) onPlay((g, m) => dotsApply(g.state as unknown as DotsState, kind, idx, m));
  };
  const lineCls = (owner: 'X' | 'O' | null) =>
    owner ? colorOf(owner) : myTurn ? 'bg-white/25 hover:bg-white/70' : 'bg-white/10';

  const cells: React.ReactNode[] = [];
  for (let i = 0; i <= DB_N * 2; i++) {
    for (let j = 0; j <= DB_N * 2; j++) {
      const key = `${i}-${j}`;
      if (i % 2 === 0 && j % 2 === 0) {
        cells.push(<div key={key} className="m-auto h-full w-full rounded-full bg-current opacity-80" />);
      } else if (i % 2 === 0) {
        const idx = (i / 2) * DB_N + (j - 1) / 2;
        const owner = st.h[idx];
        cells.push(
          <button key={key} type="button" disabled={!myTurn || !!owner} onClick={() => play('h', idx)} className="flex items-center">
            <span className={`h-1.5 w-full rounded-full ${lineCls(owner)}`} />
          </button>
        );
      } else if (j % 2 === 0) {
        const idx = ((i - 1) / 2) * (DB_N + 1) + j / 2;
        const owner = st.v[idx];
        cells.push(
          <button key={key} type="button" disabled={!myTurn || !!owner} onClick={() => play('v', idx)} className="flex justify-center">
            <span className={`h-full w-1.5 rounded-full ${lineCls(owner)}`} />
          </button>
        );
      } else {
        const owner = st.boxes[((i - 1) / 2) * DB_N + (j - 1) / 2];
        cells.push(
          <div
            key={key}
            className={`flex aspect-square items-center justify-center rounded-md text-xs font-bold ${
              owner ? `${colorOf(owner)} text-black/70` : ''
            }`}
          >
            {owner === 'X' ? '1' : owner === 'O' ? '2' : ''}
          </div>
        );
      }
    }
  }
  const x = st.boxes.filter((b) => b === 'X').length;
  const o = st.boxes.filter((b) => b === 'O').length;
  return (
    <div>
      <div className="grid" style={{ ...boardWidth(big, 230), gridTemplateColumns: track }}>
        {cells}
      </div>
      <p className="mt-1 text-[11px] opacity-70">
        Boxes — 🟦 {x} · 🟧 {o}
      </p>
    </div>
  );
};

/* ---------------- Pig ---------------- */
const PigBoard: React.FC<Props> = ({ game, myTurn, big, onPlay }) => {
  const st = game.state as unknown as PigState;
  const mark = game.currentTurn;
  return (
    <div className={`text-center ${big ? 'w-[min(92vw,420px)]' : 'w-56'}`}>
      <div className="mb-2 grid grid-cols-2 gap-2 text-xs">
        {(['X', 'O'] as const).map((m) => (
          <div
            key={m}
            className={`rounded-xl p-2 ${
              mark === m && !game.winner ? 'bg-emerald-500/25 ring-1 ring-emerald-300' : 'bg-white/5'
            }`}
          >
            <p className="opacity-70">{m === 'X' ? '🟦 Player 1' : '🟧 Player 2'}</p>
            <p className="text-2xl font-extrabold tabular-nums">{st.scores[m]}</p>
          </div>
        ))}
      </div>
      <div className={`mb-2 ${big ? 'text-6xl' : 'text-4xl'}`}>
        {st.lastRoll ? ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'][st.lastRoll] : '🎲'}
      </div>
      <p className="mb-2 text-xs opacity-80">
        {st.lastRoll === 1 ? 'Rolled a 1 — turn lost!' : `This turn: ${st.turnTotal} · goal ${PIG_GOAL}`}
      </p>
      <div className="flex justify-center gap-2">
        <button
          type="button"
          disabled={!myTurn}
          onClick={() => onPlay((g, m) => pigRoll(g.state as unknown as PigState, m))}
          className="rounded-full bg-[#22C55E] px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
        >
          Roll
        </button>
        <button
          type="button"
          disabled={!myTurn || st.turnTotal === 0}
          onClick={() => onPlay((g, m) => pigHold(g.state as unknown as PigState, m))}
          className="rounded-full bg-emerald-500/20 px-4 py-1.5 text-xs font-semibold disabled:opacity-40"
        >
          Hold
        </button>
      </div>
    </div>
  );
};

/* ---------------- Memory Duel ---------------- */
const MemoryBoard: React.FC<Props> = ({ game, myTurn, big, onPlay }) => {
  const st = game.state as unknown as MemoryState;
  const x = st.matched.filter((m) => m === 'X').length / 2;
  const o = st.matched.filter((m) => m === 'O').length / 2;
  return (
    <div>
      <div className="grid grid-cols-5 gap-1" style={boardWidth(big, 240)}>
        {st.cards.map((face, i) => {
          const owner = st.matched[i];
          const shown = owner || st.flipped.includes(i);
          return (
            <button
              key={i}
              type="button"
              disabled={!myTurn || !!owner}
              onClick={() => onPlay((g, m) => memoryFlip(g.state as unknown as MemoryState, i, m))}
              className={`flex aspect-square items-center justify-center rounded-lg border text-xl transition ${
                owner === 'X'
                  ? 'border-sky-400/60 bg-sky-500/20'
                  : owner === 'O'
                    ? 'border-orange-400/60 bg-orange-500/20'
                    : shown
                      ? 'border-white/30 bg-white/15'
                      : 'border-white/15 bg-emerald-500/10 hover:bg-emerald-500/20'
              }`}
            >
              {shown ? face : ''}
            </button>
          );
        })}
      </div>
      <p className="mt-1 text-[11px] opacity-70">
        Pairs — 🟦 {x} · 🟧 {o}
      </p>
    </div>
  );
};

export const DuelBoard: React.FC<Props> = (props) => {
  if (!props.game.state) return <p className="text-xs opacity-60">This game needs an app update.</p>;
  switch (props.game.game) {
    case 'checkers':
      return <CheckersBoard {...props} />;
    case 'dots-and-boxes':
      return <DotsBoard {...props} />;
    case 'pig':
      return <PigBoard {...props} />;
    case 'memory-duel':
      return <MemoryBoard {...props} />;
    default:
      return null;
  }
};
