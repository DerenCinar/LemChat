import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  Hash,
  AtSign,
  Settings,
  Sun,
  Moon,
} from 'lucide-react';
import { useChatStore } from '../store/useChatStore';
import type { NavTab, SelfPresence } from '../types/chat';

const STATUS_CONFIG: Record<
  SelfPresence,
  { label: string; dotClass: string; ringClass: string }
> = {
  online: {
    label: 'Online',
    dotClass: 'bg-[#22C55E]',
    ringClass: 'ring-[#22C55E]/35',
  },
  away: {
    label: 'Away',
    dotClass: 'bg-amber-400',
    ringClass: 'ring-amber-400/35',
  },
  busy: {
    label: 'Busy',
    dotClass: 'bg-rose-500',
    ringClass: 'ring-rose-500/35',
  },
};

export const NavRail: React.FC = () => {
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);

  const self = useChatStore((s) => s.self);
  const activeTab = useChatStore((s) => s.activeTab);
  const theme = useChatStore((s) => s.theme);
  const conversations = useChatStore((s) => s.conversations);
  const setActiveTab = useChatStore((s) => s.setActiveTab);
  const setSelfStatus = useChatStore((s) => s.setSelfStatus);
  const toggleTheme = useChatStore((s) => s.toggleTheme);

  const dmUnread = conversations
    .filter((c) => c.type === 'dm')
    .reduce((sum, c) => sum + c.unreadCount, 0);
  const channelUnread = conversations
    .filter((c) => c.type === 'channel')
    .reduce((sum, c) => sum + c.unreadCount, 0);
  const mentionCount = conversations.reduce(
    (sum, c) => sum + c.messages.filter((m) => m.isMention).length,
    0
  );

  const navItems: Array<{
    id: NavTab;
    label: string;
    icon: React.FC<{ className?: string }>;
    badge?: number;
  }> = [
    { id: 'chats', label: 'Chats', icon: MessageSquare, badge: dmUnread + channelUnread },
    { id: 'channels', label: 'Channels', icon: Hash, badge: channelUnread },
    { id: 'mentions', label: 'Mentions', icon: AtSign, badge: mentionCount },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const currentStatus = self?.status ?? 'online';
  const statusMeta = STATUS_CONFIG[currentStatus];

  return (
    <aside className="glass-panel glass-rail relative z-20 flex w-[68px] shrink-0 flex-col items-center justify-between rounded-2xl py-3.5">
      {/* Top: User Avatar + Live Status Dot */}
      <div className="relative flex flex-col items-center">
        <button
          onClick={() => setStatusMenuOpen((v) => !v)}
          title={`${self?.name ?? 'User'} (${statusMeta.label}) — Click to change status`}
          className="group relative flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#22C55E] to-[#059669] text-sm font-bold text-white shadow-lem-glow-sm transition-transform hover:scale-105 active:scale-95"
        >
          {self?.avatar ?? 'LC'}
          <span
            className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-[#090F0C] ring-4 ${statusMeta.dotClass} ${statusMeta.ringClass} dark:border-[#090F0C]`}
          />
        </button>

        <AnimatePresence>
          {statusMenuOpen && self && (
            <motion.div
              initial={{ opacity: 0, x: -8, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -8, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 420, damping: 28 }}
              className="glass-panel glass-surface absolute left-14 top-0 z-50 w-48 rounded-2xl p-2"
            >
              <div className="mb-1.5 px-2.5 py-1">
                <p className="text-xs font-semibold text-emerald-950 dark:text-white">
                  {self.name}
                </p>
                <p className="text-[10px] text-emerald-800/70 dark:text-emerald-200/60">
                  {self.handle}
                </p>
              </div>
              <div className="h-px bg-black/10 dark:bg-white/10" />
              <div className="mt-1.5 space-y-1">
                {(['online', 'away', 'busy'] as SelfPresence[]).map((st) => {
                  const cfg = STATUS_CONFIG[st];
                  const active = self.status === st;
                  return (
                    <button
                      key={st}
                      onClick={() => {
                        void setSelfStatus(st, true);
                        setStatusMenuOpen(false);
                      }}
                      className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-left text-xs transition ${
                        active
                          ? 'bg-emerald-500/20 font-semibold text-emerald-900 dark:text-emerald-200'
                          : 'text-emerald-900/80 hover:bg-black/5 dark:text-white/80 dark:hover:bg-white/10'
                      }`}
                    >
                      <span className={`h-2.5 w-2.5 rounded-full ${cfg.dotClass}`} />
                      <span>{cfg.label}</span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Middle: Navigation Tabs with Morphing Active Indicator */}
      <nav className="flex flex-col items-center gap-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              title={item.label}
              className={`group relative flex h-11 w-11 items-center justify-center rounded-2xl transition-colors ${
                isActive
                  ? 'text-white'
                  : 'text-emerald-900/60 hover:text-emerald-950 dark:text-emerald-100/55 dark:hover:text-white'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="nav-active-pill"
                  transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                  className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#22C55E] to-[#10B981] shadow-lem-glow"
                />
              )}
              <Icon className="relative z-10 h-5 w-5" />

              {item.badge !== undefined && item.badge > 0 && (
                <span className="absolute -right-0.5 -top-0.5 z-20 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#22C55E] px-1 text-[9px] font-bold text-white shadow-lem-glow-sm ring-2 ring-[#090F0C]/60">
                  {item.badge > 9 ? '9+' : item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom: Theme Toggle */}
      <button
        onClick={toggleTheme}
        title={
          theme === 'dark'
            ? 'Switch to Frosted Mint Light Mode'
            : 'Switch to Forest-Slate Dark Mode'
        }
        className="glass-pill flex h-10 w-10 items-center justify-center rounded-2xl text-emerald-800 transition hover:scale-105 hover:border-emerald-400/50 dark:text-emerald-200"
      >
        <motion.div
          key={theme}
          initial={{ rotate: -45, opacity: 0, scale: 0.7 }}
          animate={{ rotate: 0, opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 350, damping: 22 }}
        >
          {theme === 'dark' ? (
            <Sun className="h-4 w-4 text-emerald-300" />
          ) : (
            <Moon className="h-4 w-4 text-emerald-700" />
          )}
        </motion.div>
      </button>
    </aside>
  );
};
