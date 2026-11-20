import React from 'react';
import { BarChart3, Gamepad2, Lock, Unlock } from 'lucide-react';
import { useChatStore } from '../store/useChatStore';
import type { CapsuleMetadata, GameMetadata, Message, PollMetadata } from '../types/chat';

const PollCard: React.FC<{ message: Message; poll: PollMetadata }> = ({ message, poll }) => {
  const votePoll = useChatStore((s) => s.votePoll);
  const selfId = useChatStore((s) => s.self?.id);
  const total = Object.keys(poll.votes).length;
  const mine = selfId ? poll.votes[selfId] : undefined;

  return (
    <div className="mt-1 w-full min-w-[240px] max-w-sm rounded-2xl border border-white/20 bg-black/15 p-3.5 shadow-inner">
      <div className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest opacity-75">
        <span className="flex h-5 w-5 items-center justify-center rounded-md bg-white/20">
          <BarChart3 className="h-3 w-3" />
        </span>
        <span>Poll</span>
      </div>
      <p className="mb-3 text-[14px] font-bold leading-snug">{poll.question}</p>
      <div className="space-y-2">
        {poll.options.map((opt) => {
          const count = Object.values(poll.votes).filter((v) => v === opt.id).length;
          const pct = total ? Math.round((count / total) * 100) : 0;
          const selected = mine === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => votePoll(message.id, opt.id)}
              className={`group/opt relative w-full overflow-hidden rounded-xl border px-3 py-2.5 text-left text-xs transition active:scale-[0.99] ${
                selected
                  ? 'border-emerald-300/90 bg-emerald-400/15 font-semibold'
                  : 'border-white/20 bg-white/5 hover:border-emerald-300/60 hover:bg-white/10'
              }`}
            >
              <span
                className={`absolute inset-y-0 left-0 transition-all duration-500 ${
                  selected ? 'bg-emerald-400/40' : 'bg-white/15'
                }`}
                style={{ width: `${pct}%` }}
              />
              <span className="relative flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[9px] ${
                      selected
                        ? 'border-emerald-200 bg-emerald-300 text-emerald-950'
                        : 'border-white/40'
                    }`}
                  >
                    {selected ? '✓' : ''}
                  </span>
                  <span className="truncate">{opt.text}</span>
                </span>
                <span className="shrink-0 text-[11px] font-semibold tabular-nums opacity-80">
                  {pct}%
                  <span className="ml-1 font-normal opacity-70">({count})</span>
                </span>
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-2.5 text-[10px] opacity-65">
        {total} vote{total === 1 ? '' : 's'} · tap your choice again to remove your vote
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

const formatCountdown = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${sec}s`;
  return `${m}m ${sec}s`;
};

const CapsuleCard: React.FC<{ message: Message; capsule: CapsuleMetadata }> = ({
  message,
  capsule,
}) => {
  const openCapsule = useChatStore((s) => s.openCapsule);
  const unlockMs = new Date(capsule.unlockAt).getTime();
  const [now, setNow] = React.useState(Date.now());
  const [opened, setOpened] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const ready = now >= unlockMs;

  React.useEffect(() => {
    if (ready) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [ready]);

  const open = async () => {
    setBusy(true);
    setError(null);
    try {
      setOpened(await openCapsule(message.id, capsule));
    } catch (e) {
      // The server clock is authoritative; a skewed local clock lands here.
      setError(e instanceof Error ? e.message : 'Could not open capsule.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-1 w-full min-w-[240px] max-w-sm rounded-2xl border border-white/20 bg-black/15 p-3.5 shadow-inner">
      <div className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest opacity-75">
        <span className="flex h-5 w-5 items-center justify-center rounded-md bg-white/20">
          {opened !== null ? <Unlock className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
        </span>
        <span>Time capsule</span>
      </div>
      {opened !== null ? (
        <p className="whitespace-pre-wrap break-words text-[14px] leading-snug">{opened}</p>
      ) : ready ? (
        <>
          <p className="mb-2.5 text-xs opacity-80">This capsule is ready to open.</p>
          <button
            type="button"
            onClick={() => void open()}
            disabled={busy}
            className="rounded-full bg-emerald-400/90 px-4 py-1.5 text-xs font-semibold text-emerald-950 transition hover:brightness-110 disabled:opacity-60"
          >
            {busy ? 'Opening…' : 'Open capsule'}
          </button>
        </>
      ) : (
        <>
          <p className="text-lg font-bold tabular-nums">{formatCountdown(unlockMs - now)}</p>
          <p className="mt-0.5 text-[11px] opacity-70">
            Locked until {new Date(unlockMs).toLocaleString()}
          </p>
        </>
      )}
      {error && <p className="mt-2 text-[11px] text-rose-300">{error}</p>}
    </div>
  );
};

export const InteractiveCard: React.FC<{ message: Message }> = ({ message }) => {
  const data = message.interactive;
  if (!data) return null;
  if (data.kind === 'poll') return <PollCard message={message} poll={data} />;
  if (data.kind === 'capsule') return <CapsuleCard message={message} capsule={data} />;
  return <GameCard message={message} game={data} />;
};
