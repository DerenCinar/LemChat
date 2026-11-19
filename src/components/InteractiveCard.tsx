import React from 'react';
import { BarChart3, Gamepad2 } from 'lucide-react';
import { useChatStore } from '../store/useChatStore';
import type { GameMetadata, Message, PollMetadata } from '../types/chat';

const PollCard: React.FC<{ message: Message; poll: PollMetadata }> = ({ message, poll }) => {
  const votePoll = useChatStore((s) => s.votePoll);
  const selfId = useChatStore((s) => s.self?.id);
  const total = Object.keys(poll.votes).length;
  const mine = selfId ? poll.votes[selfId] : undefined;

  return (
    <div className="mt-1 w-full min-w-[220px] max-w-sm rounded-xl border border-white/15 bg-black/10 p-3">
      <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide opacity-70">
        <BarChart3 className="h-3.5 w-3.5" />
        <span>Poll</span>
      </div>
      <p className="mb-2.5 text-sm font-semibold">{poll.question}</p>
      <div className="space-y-1.5">
        {poll.options.map((opt) => {
          const count = Object.values(poll.votes).filter((v) => v === opt.id).length;
          const pct = total ? Math.round((count / total) * 100) : 0;
          const selected = mine === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => votePoll(message.id, opt.id)}
              className={`relative w-full overflow-hidden rounded-lg border px-3 py-2 text-left text-xs transition ${
                selected
                  ? 'border-emerald-400/80 bg-emerald-500/10'
                  : 'border-white/15 hover:border-emerald-400/50'
              }`}
            >
              <span
                className="absolute inset-y-0 left-0 bg-emerald-500/25 transition-all"
                style={{ width: `${pct}%` }}
              />
              <span className="relative flex items-center justify-between gap-2">
                <span className="truncate">
                  {selected ? '✓ ' : ''}
                  {opt.text}
                </span>
                <span className="shrink-0 opacity-70">
                  {count} · {pct}%
                </span>
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-[10px] opacity-60">
        {total} vote{total === 1 ? '' : 's'} · click again to remove your vote
      </p>
    </div>
  );
};

const GameCard: React.FC<{ message: Message; game: GameMetadata }> = ({ message, game }) => {
  const makeGameMove = useChatStore((s) => s.makeGameMove);
  const selfId = useChatStore((s) => s.self?.id);
  const profiles = useChatStore((s) => s.profiles);

  const name = (id?: string) => (id ? profiles[id]?.displayName ?? 'Player' : 'Waiting...');
  const mySide = selfId === game.xPlayerId ? 'X' : selfId === game.oPlayerId ? 'O' : null;
  const myTurn =
    !game.winner &&
    (game.currentTurn === 'X'
      ? selfId === game.xPlayerId
      : game.oPlayerId
        ? selfId === game.oPlayerId
        : selfId !== game.xPlayerId);

  let status: string;
  if (game.winner === 'draw') status = "It's a draw!";
  else if (game.winner)
    status = `${name(game.winner === 'X' ? game.xPlayerId : game.oPlayerId)} wins!`;
  else if (myTurn) status = `Your turn${mySide ? ` (${mySide})` : ''}`;
  else if (!game.oPlayerId && selfId === game.xPlayerId)
    status = 'Waiting for an opponent to move...';
  else status = `${game.currentTurn === 'X' ? name(game.xPlayerId) : name(game.oPlayerId)}'s turn`;

  return (
    <div className="mt-1 w-fit rounded-xl border border-white/15 bg-black/10 p-3">
      <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide opacity-70">
        <Gamepad2 className="h-3.5 w-3.5" />
        <span>Tic-Tac-Toe</span>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {game.board.map((cell, i) => (
          <button
            key={i}
            type="button"
            disabled={Boolean(cell) || !myTurn}
            onClick={() => makeGameMove(message.id, i)}
            className={`flex h-12 w-12 items-center justify-center rounded-lg border text-xl font-bold transition ${
              cell
                ? cell === 'X'
                  ? 'border-emerald-400/50 bg-emerald-500/15 text-emerald-300'
                  : 'border-sky-400/50 bg-sky-500/15 text-sky-300'
                : myTurn
                  ? 'border-white/20 hover:border-emerald-400/60 hover:bg-emerald-500/10'
                  : 'border-white/10 opacity-60'
            }`}
          >
            {cell}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs font-medium">{status}</p>
      <p className="text-[10px] opacity-60">
        X: {name(game.xPlayerId)} · O: {name(game.oPlayerId)}
      </p>
    </div>
  );
};

export const InteractiveCard: React.FC<{ message: Message }> = ({ message }) => {
  const data = message.interactive;
  if (!data) return null;
  return data.kind === 'poll' ? (
    <PollCard message={message} poll={data} />
  ) : (
    <GameCard message={message} game={data} />
  );
};
