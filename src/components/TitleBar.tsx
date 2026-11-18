import React, { useEffect, useState } from 'react';
import { Minus, Square, Copy, X, Wifi, Bell, BellOff } from 'lucide-react';
import { useChatStore } from '../store/useChatStore';

export const TitleBar: React.FC = () => {
  const platform = window.lemchat?.platform ?? 'win32';
  const isMac = platform === 'darwin';
  const [isMaximized, setIsMaximized] = useState(false);

  const session = useChatStore((s) => s.session);
  const realtimeConnected = useChatStore((s) => s.realtimeConnected);
  const notificationsEnabled = useChatStore((s) => s.notificationsEnabled);
  const setNotificationsEnabled = useChatStore((s) => s.setNotificationsEnabled);
  const sendTestNotification = useChatStore((s) => s.sendTestNotification);

  useEffect(() => {
    window.lemchat?.isWindowMaximized().then(setIsMaximized).catch(() => {});
    const unsub = window.lemchat?.onMaximizeChange(setIsMaximized);
    return () => {
      unsub?.();
    };
  }, []);

  return (
    <header className="app-drag relative z-30 flex h-10 shrink-0 items-center justify-between px-3.5">
      {/* Left: macOS traffic lights OR LemChat Brand */}
      <div className="flex items-center gap-3">
        {isMac && (
          <div className="app-no-drag flex items-center gap-2 pr-2">
            <button
              onClick={() => window.lemchat?.windowClose()}
              title="Close"
              className="group flex h-3 w-3 items-center justify-center rounded-full bg-[#FF5F57] transition hover:brightness-110"
            >
              <X className="h-2 w-2 text-black/70 opacity-0 group-hover:opacity-100" />
            </button>
            <button
              onClick={() => window.lemchat?.windowMinimize()}
              title="Minimize"
              className="group flex h-3 w-3 items-center justify-center rounded-full bg-[#FEBC2E] transition hover:brightness-110"
            >
              <Minus className="h-2 w-2 text-black/70 opacity-0 group-hover:opacity-100" />
            </button>
            <button
              onClick={() => window.lemchat?.windowMaximize()}
              title="Zoom"
              className="group flex h-3 w-3 items-center justify-center rounded-full bg-[#28C840] transition hover:brightness-110"
            >
              <Square className="h-1.5 w-1.5 text-black/70 opacity-0 group-hover:opacity-100" />
            </button>
          </div>
        )}

        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-[#22C55E] to-[#10B981] text-sm leading-none text-white shadow-lem-glow-sm">
            💀
          </div>
          <span className="text-xs font-semibold tracking-wide text-emerald-950/90 dark:text-emerald-50/95">
            SkellyTalk
          </span>
        </div>
      </div>

      {/* Right: Notification Bell + Realtime Status Pill + Windows Controls */}
      <div className="app-no-drag flex items-center gap-2">
        {session && (
          <>
            <button
              onClick={() => setNotificationsEnabled(!notificationsEnabled)}
              onContextMenu={(e) => {
                e.preventDefault();
                void sendTestNotification();
              }}
              title={
                notificationsEnabled
                  ? 'Notifications On (click to mute, right-click to test)'
                  : 'Notifications Muted (click to enable)'
              }
              className={`glass-pill flex h-7 w-7 items-center justify-center rounded-full transition hover:scale-105 ${
                notificationsEnabled
                  ? 'text-[#22C55E]'
                  : 'text-emerald-900/45 dark:text-white/40'
              }`}
            >
              {notificationsEnabled ? (
                <Bell className="h-3.5 w-3.5" />
              ) : (
                <BellOff className="h-3.5 w-3.5" />
              )}
            </button>

            <div className="glass-pill flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-medium text-emerald-800 dark:text-emerald-200">
              <Wifi
                className={`h-3 w-3 ${
                  realtimeConnected ? 'text-[#22C55E]' : 'animate-pulse text-amber-400'
                }`}
              />
              <span>{realtimeConnected ? 'Supabase Live' : 'Connecting...'}</span>
            </div>
          </>
        )}

        {!isMac && Boolean(window.lemchat) && (
          <div className="ml-1 flex items-center gap-1">
            <button
              onClick={() => window.lemchat?.windowMinimize()}
              aria-label="Minimize"
              className="flex h-7 w-8 items-center justify-center rounded-lg text-emerald-950/70 transition hover:bg-black/5 hover:text-emerald-950 dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => window.lemchat?.windowMaximize()}
              aria-label="Maximize"
              className="flex h-7 w-8 items-center justify-center rounded-lg text-emerald-950/70 transition hover:bg-black/5 hover:text-emerald-950 dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white"
            >
              {isMaximized ? (
                <Copy className="h-3 w-3" />
              ) : (
                <Square className="h-3 w-3" />
              )}
            </button>
            <button
              onClick={() => window.lemchat?.windowClose()}
              aria-label="Close"
              className="flex h-7 w-8 items-center justify-center rounded-lg text-emerald-950/70 transition hover:bg-red-500/80 hover:text-white dark:text-white/70 dark:hover:bg-red-500/80 dark:hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
