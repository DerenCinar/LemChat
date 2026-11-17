import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Moon, Sun, LogOut, Database, Wifi, Check, Bell, Volume2, Sparkles, RefreshCw } from 'lucide-react';
import { useChatStore } from '../store/useChatStore';
import { getSupabaseConfig } from '../lib/supabase';

export const SettingsView: React.FC = () => {
  const theme = useChatStore((s) => s.theme);
  const self = useChatStore((s) => s.self);
  const realtimeConnected = useChatStore((s) => s.realtimeConnected);
  const setTheme = useChatStore((s) => s.setTheme);
  const signOut = useChatStore((s) => s.signOut);
  const updateSelfProfile = useChatStore((s) => s.updateSelfProfile);
  const notificationsEnabled = useChatStore((s) => s.notificationsEnabled);
  const notifyWhenFocused = useChatStore((s) => s.notifyWhenFocused);
  const soundEnabled = useChatStore((s) => s.soundEnabled);
  const setNotificationsEnabled = useChatStore((s) => s.setNotificationsEnabled);
  const setNotifyWhenFocused = useChatStore((s) => s.setNotifyWhenFocused);
  const setSoundEnabled = useChatStore((s) => s.setSoundEnabled);
  const sendTestNotification = useChatStore((s) => s.sendTestNotification);
  const updateStatus = useChatStore((s) => s.updateStatus);
  const checkForUpdates = useChatStore((s) => s.checkForUpdates);
  const installUpdate = useChatStore((s) => s.installUpdate);

  const [displayName, setDisplayName] = useState(self?.name ?? '');
  const [role, setRole] = useState(self?.role ?? '');
  const [saved, setSaved] = useState(false);

  const { url } = getSupabaseConfig();

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateSelfProfile(displayName, role);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 360, damping: 28 }}
      className="glass-panel glass-surface lem-scrollbar flex flex-1 flex-col overflow-y-auto rounded-2xl p-6"
    >
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <div>
          <h1 className="text-xl font-bold text-emerald-950 dark:text-white">
            SkellyTalk Preferences
          </h1>
          <p className="mt-1 text-xs text-emerald-800/70 dark:text-emerald-200/60">
            Manage your profile, Liquid Glass theme, notifications, and live session.
          </p>
        </div>

        {/* Profile Card + Inline Editor */}
        {self && (
          <form
            onSubmit={handleSaveProfile}
            className="glass-pill space-y-4 rounded-2xl p-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#22C55E] to-[#10B981] text-sm font-bold text-white shadow-lem-glow-sm">
                  {self.avatar}
                </div>
                <div>
                  <p className="text-sm font-bold text-emerald-950 dark:text-white">
                    {self.name}
                  </p>
                  <p className="text-xs text-emerald-800/70 dark:text-emerald-200/65">
                    {self.handle} · {self.role}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => void signOut()}
                className="flex items-center gap-1.5 rounded-full bg-rose-500/15 px-3.5 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-500/25 dark:text-rose-300"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Sign Out</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 border-t border-black/5 pt-3 dark:border-white/10">
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-emerald-800/65 dark:text-emerald-200/60">
                  Display Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="glass-pill w-full rounded-xl px-3 py-2 text-xs text-emerald-950 outline-none focus:border-[#22C55E] dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-emerald-800/65 dark:text-emerald-200/60">
                  Role / Title
                </label>
                <input
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="glass-pill w-full rounded-xl px-3 py-2 text-xs text-emerald-950 outline-none focus:border-[#22C55E] dark:text-white"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <motion.button
                whileTap={{ scale: 0.96 }}
                type="submit"
                className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#22C55E] to-[#10B981] px-4 py-1.5 text-xs font-semibold text-white shadow-lem-glow-sm transition hover:brightness-110"
              >
                {saved && <Check className="h-3.5 w-3.5" />}
                <span>{saved ? 'Saved!' : 'Save Profile'}</span>
              </motion.button>
            </div>
          </form>
        )}

        {/* Theme Selection */}
        <div className="space-y-2.5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-800/65 dark:text-emerald-200/55">
            Liquid Glass Theme
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setTheme('dark')}
              className={`glass-pill flex items-center gap-3 rounded-2xl p-4 text-left transition ${
                theme === 'dark'
                  ? 'border-[#22C55E] bg-[#22C55E]/15 ring-1 ring-[#22C55E]/50'
                  : 'hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              <Moon className="h-5 w-5 text-[#22C55E]" />
              <div>
                <p className="text-xs font-bold text-emerald-950 dark:text-white">
                  Forest-Slate Dark
                </p>
                <p className="text-[11px] text-emerald-800/65 dark:text-emerald-200/55">
                  #090F0C · Deep emerald mesh
                </p>
              </div>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setTheme('light')}
              className={`glass-pill flex items-center gap-3 rounded-2xl p-4 text-left transition ${
                theme === 'light'
                  ? 'border-[#22C55E] bg-[#22C55E]/15 ring-1 ring-[#22C55E]/50'
                  : 'hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              <Sun className="h-5 w-5 text-[#10B981]" />
              <div>
                <p className="text-xs font-bold text-emerald-950 dark:text-white">
                  Frosted Mint Light
                </p>
                <p className="text-[11px] text-emerald-800/65 dark:text-emerald-200/55">
                  #F0FDF4 · Translucent mint glass
                </p>
              </div>
            </motion.button>
          </div>
        </div>

        {/* Desktop Notifications & Sound */}
        <div className="space-y-2.5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-800/65 dark:text-emerald-200/55">
            Notifications &amp; Sound
          </h2>
          <div className="glass-pill space-y-3.5 rounded-2xl p-4 text-xs">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-start gap-2.5">
                <Bell className="mt-0.5 h-4 w-4 text-[#22C55E]" />
                <div>
                  <p className="font-semibold text-emerald-950 dark:text-white">
                    Desktop Notifications
                  </p>
                  <p className="text-[11px] text-emerald-800/65 dark:text-emerald-200/55">
                    Show native OS alerts for new messages and incoming calls.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                  notificationsEnabled
                    ? 'bg-gradient-to-r from-[#22C55E] to-[#10B981]'
                    : 'bg-black/20 dark:bg-white/15'
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    notificationsEnabled ? 'left-[22px]' : 'left-0.5'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between gap-4 border-t border-black/5 pt-3 dark:border-white/10">
              <div className="flex items-start gap-2.5">
                <Sparkles className="mt-0.5 h-4 w-4 text-[#10B981]" />
                <div>
                  <p className="font-semibold text-emerald-950 dark:text-white">
                    Notify Even When Focused
                  </p>
                  <p className="text-[11px] text-emerald-800/65 dark:text-emerald-200/55">
                    Trigger OS notifications for other channels while SkellyTalk is open.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setNotifyWhenFocused(!notifyWhenFocused)}
                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                  notifyWhenFocused
                    ? 'bg-gradient-to-r from-[#22C55E] to-[#10B981]'
                    : 'bg-black/20 dark:bg-white/15'
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    notifyWhenFocused ? 'left-[22px]' : 'left-0.5'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between gap-4 border-t border-black/5 pt-3 dark:border-white/10">
              <div className="flex items-start gap-2.5">
                <Volume2 className="mt-0.5 h-4 w-4 text-[#22C55E]" />
                <div>
                  <p className="font-semibold text-emerald-950 dark:text-white">
                    Notification Sound Chime
                  </p>
                  <p className="text-[11px] text-emerald-800/65 dark:text-emerald-200/55">
                    Play a soft glass chime when new messages arrive.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                  soundEnabled
                    ? 'bg-gradient-to-r from-[#22C55E] to-[#10B981]'
                    : 'bg-black/20 dark:bg-white/15'
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    soundEnabled ? 'left-[22px]' : 'left-0.5'
                  }`}
                />
              </button>
            </div>

            <div className="flex justify-end border-t border-black/5 pt-3 dark:border-white/10">
              <motion.button
                whileTap={{ scale: 0.96 }}
                type="button"
                onClick={() => void sendTestNotification()}
                className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#22C55E] to-[#10B981] px-4 py-1.5 text-xs font-semibold text-white shadow-lem-glow-sm transition hover:brightness-110"
              >
                <Bell className="h-3.5 w-3.5" />
                <span>Send Test Notification</span>
              </motion.button>
            </div>
          </div>
        </div>

        {/* Auto-Updates */}
        <div className="space-y-2.5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-800/65 dark:text-emerald-200/55">
            Software Updates
          </h2>
          <div className="glass-pill flex items-center justify-between gap-4 rounded-2xl p-4 text-xs">
            <div className="flex min-w-0 flex-1 items-start gap-2.5">
              <RefreshCw
                className={`mt-0.5 h-4 w-4 shrink-0 text-[#22C55E] ${
                  updateStatus.status === 'checking' ||
                  updateStatus.status === 'downloading'
                    ? 'animate-spin'
                    : ''
                }`}
              />
              <div className="min-w-0">
                <p className="font-semibold text-emerald-950 dark:text-white">
                  Automatic Updates
                </p>
                <p className="line-clamp-2 break-words text-[11px] text-emerald-800/65 dark:text-emerald-200/55">
                  {updateStatus.status === 'checking'
                    ? 'Checking for updates...'
                    : updateStatus.status === 'downloading'
                      ? `Downloading update (${updateStatus.progress ?? 0}%)...`
                      : updateStatus.status === 'downloaded'
                        ? `Version ${updateStatus.version ?? ''} downloaded and ready.`
                        : updateStatus.status === 'available'
                          ? `Update v${updateStatus.version ?? ''} found, downloading...`
                          : updateStatus.message ?? 'SkellyTalk checks for updates automatically on launch.'}
                </p>
              </div>
            </div>

            {updateStatus.status === 'downloaded' ? (
              <button
                type="button"
                onClick={installUpdate}
                className="shrink-0 rounded-full bg-gradient-to-r from-[#22C55E] to-[#10B981] px-4 py-1.5 text-xs font-semibold text-white shadow-lem-glow-sm hover:brightness-110"
              >
                Restart &amp; Install
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void checkForUpdates()}
                className="glass-pill shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold text-emerald-900 transition hover:border-[#22C55E]/50 dark:text-emerald-100"
              >
                Check for Updates
              </button>
            )}
          </div>
        </div>

        {/* Supabase Connection Info */}
        <div className="space-y-2.5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-800/65 dark:text-emerald-200/55">
            Supabase Backend
          </h2>
          <div className="glass-pill space-y-3 rounded-2xl p-4 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-950 dark:text-white">
                <Database className="h-4 w-4 text-[#22C55E]" />
                <span className="font-semibold">Project Endpoint</span>
              </div>
              <span className="max-w-[260px] truncate font-mono text-[11px] text-emerald-800/75 dark:text-emerald-200/75">
                {url}
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-black/5 pt-2.5 dark:border-white/10">
              <div className="flex items-center gap-2 text-emerald-950 dark:text-white">
                <Wifi className="h-4 w-4 text-[#22C55E]" />
                <span className="font-semibold">Realtime WebSocket</span>
              </div>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                  realtimeConnected
                    ? 'bg-[#22C55E]/20 text-emerald-700 dark:text-emerald-300'
                    : 'bg-amber-500/20 text-amber-600 dark:text-amber-300'
                }`}
              >
                {realtimeConnected ? 'Connected' : 'Reconnecting'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
};
