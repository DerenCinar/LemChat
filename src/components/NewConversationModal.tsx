import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Hash, MessageSquarePlus, Search, X, Sparkles } from 'lucide-react';
import { useChatStore } from '../store/useChatStore';

export const NewConversationModal: React.FC = () => {
  const isOpen = useChatStore((s) => s.isNewConvModalOpen);
  const setOpen = useChatStore((s) => s.setNewConvModalOpen);
  const profiles = useChatStore((s) => s.profiles);
  const self = useChatStore((s) => s.self);
  const onlineUserIds = useChatStore((s) => s.onlineUserIds);
  const createChannel = useChatStore((s) => s.createChannel);
  const startDirectMessage = useChatStore((s) => s.startDirectMessage);

  const [tab, setTab] = useState<'channel' | 'dm'>('channel');
  const [channelName, setChannelName] = useState('');
  const [channelTopic, setChannelTopic] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const otherUsers = Object.values(profiles)
    .filter((p) => p.id !== self?.id)
    .filter((p) => {
      if (!memberSearch.trim()) return true;
      const q = memberSearch.toLowerCase();
      return (
        p.displayName.toLowerCase().includes(q) ||
        p.handle.toLowerCase().includes(q) ||
        p.role.toLowerCase().includes(q)
      );
    });

  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!channelName.trim() || submitting) return;
    setSubmitting(true);
    await createChannel(channelName, channelTopic);
    setChannelName('');
    setChannelTopic('');
    setSubmitting(false);
    setOpen(false);
  };

  const handleStartDm = async (userId: string) => {
    if (submitting) return;
    setSubmitting(true);
    await startDirectMessage(userId);
    setSubmitting(false);
    setOpen(false);
  };

  const slugPreview = channelName
    .trim()
    .toLowerCase()
    .replace(/^#/, '')
    .replace(/\s+/g, '-');

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-md"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 14 }}
            transition={{ type: 'spring', stiffness: 420, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
            className="glass-panel glass-surface relative w-full max-w-md overflow-hidden rounded-3xl p-6 ring-1 ring-white/20"
          >
            {/* One-shot Liquid Glass specular sheen sweep */}
            <motion.span
              aria-hidden
              initial={{ x: '-130%', opacity: 0.85 }}
              animate={{ x: '220%', opacity: 0 }}
              transition={{ duration: 0.95, ease: [0.22, 1, 0.36, 1] }}
              className="pointer-events-none absolute inset-y-0 left-0 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/20 to-transparent"
            />

            <div className="relative z-10 mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#22C55E] to-[#10B981] text-white shadow-lem-glow-sm">
                  <Sparkles className="h-4 w-4" />
                </div>
                <h2 className="text-base font-bold text-emerald-950 dark:text-white">
                  New Conversation
                </h2>
              </div>
              <motion.button
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 400, damping: 24 }}
                onClick={() => setOpen(false)}
                className="glass-pill rounded-full p-1.5 text-emerald-900/60 hover:text-emerald-950 dark:text-white/60 dark:hover:text-white"
              >
                <X className="h-4 w-4" />
              </motion.button>
            </div>

            {/* Morphing Liquid Glass Tab Switcher */}
            <div className="glass-pill relative z-10 mb-5 grid grid-cols-2 rounded-2xl p-1">
              <button
                type="button"
                onClick={() => setTab('channel')}
                className={`relative flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition-colors ${
                  tab === 'channel'
                    ? 'text-white'
                    : 'text-emerald-900/70 hover:text-emerald-950 dark:text-emerald-200/70 dark:hover:text-white'
                }`}
              >
                {tab === 'channel' && (
                  <motion.div
                    layoutId="new-conv-tab"
                    transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                    className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#22C55E] to-[#10B981] shadow-lem-glow-sm"
                  />
                )}
                <Hash className="relative z-10 h-3.5 w-3.5" />
                <span className="relative z-10">Create Channel</span>
              </button>

              <button
                type="button"
                onClick={() => setTab('dm')}
                className={`relative flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition-colors ${
                  tab === 'dm'
                    ? 'text-white'
                    : 'text-emerald-900/70 hover:text-emerald-950 dark:text-emerald-200/70 dark:hover:text-white'
                }`}
              >
                {tab === 'dm' && (
                  <motion.div
                    layoutId="new-conv-tab"
                    transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                    className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#22C55E] to-[#10B981] shadow-lem-glow-sm"
                  />
                )}
                <MessageSquarePlus className="relative z-10 h-3.5 w-3.5" />
                <span className="relative z-10">Direct Message</span>
              </button>
            </div>

            <AnimatePresence mode="wait">
              {tab === 'channel' ? (
                <motion.form
                  key="channel-tab"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                  onSubmit={handleCreateChannel}
                  className="relative z-10 space-y-3.5"
                >
                  <div>
                    <div className="mb-1 flex items-center justify-between">
                      <label className="text-[11px] font-semibold text-emerald-900/75 dark:text-emerald-200/75">
                        Channel Name
                      </label>
                      {slugPreview && (
                        <span className="rounded-full bg-[#22C55E]/15 px-2 py-0.5 font-mono text-[10px] text-emerald-700 dark:text-emerald-300">
                          #{slugPreview}
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      required
                      value={channelName}
                      onChange={(e) => setChannelName(e.target.value)}
                      placeholder="e.g. lemhand-design"
                      className="glass-pill w-full rounded-xl px-3.5 py-2.5 text-xs text-emerald-950 placeholder-emerald-800/45 outline-none transition focus:border-[#22C55E] focus:ring-2 focus:ring-[#22C55E]/20 dark:text-white dark:placeholder-emerald-100/35"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-emerald-900/75 dark:text-emerald-200/75">
                      Topic (optional)
                    </label>
                    <input
                      type="text"
                      value={channelTopic}
                      onChange={(e) => setChannelTopic(e.target.value)}
                      placeholder="What is this channel about?"
                      className="glass-pill w-full rounded-xl px-3.5 py-2.5 text-xs text-emerald-950 placeholder-emerald-800/45 outline-none transition focus:border-[#22C55E] focus:ring-2 focus:ring-[#22C55E]/20 dark:text-white dark:placeholder-emerald-100/35"
                    />
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.015 }}
                    whileTap={{ scale: 0.97 }}
                    type="submit"
                    disabled={submitting}
                    className="w-full rounded-xl bg-gradient-to-r from-[#22C55E] to-[#10B981] py-2.5 text-xs font-bold text-white shadow-lem-glow transition hover:brightness-110 disabled:opacity-60"
                  >
                    {submitting ? 'Creating Channel...' : 'Create Channel'}
                  </motion.button>
                </motion.form>
              ) : (
                <motion.div
                  key="dm-tab"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                  className="relative z-10 space-y-3"
                >
                  <div className="glass-pill flex items-center gap-2 rounded-xl px-3 py-2">
                    <Search className="h-3.5 w-3.5 text-emerald-700/60 dark:text-emerald-200/50" />
                    <input
                      type="text"
                      value={memberSearch}
                      onChange={(e) => setMemberSearch(e.target.value)}
                      placeholder="Filter teammates..."
                      className="w-full bg-transparent text-xs text-emerald-950 placeholder-emerald-800/45 outline-none dark:text-white dark:placeholder-emerald-100/35"
                    />
                  </div>

                  <div className="lem-scrollbar max-h-60 space-y-1.5 overflow-y-auto pr-1">
                    {otherUsers.length === 0 ? (
                      <p className="py-8 text-center text-xs text-emerald-900/60 dark:text-emerald-200/55">
                        {memberSearch
                          ? 'No matching teammates found.'
                          : 'No other team members have signed up yet.'}
                      </p>
                    ) : (
                      otherUsers.map((user, idx) => {
                        const isLive = onlineUserIds.has(user.id);
                        return (
                          <motion.button
                            key={user.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.03 }}
                            whileHover={{ x: 3, scale: 1.01 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => void handleStartDm(user.id)}
                            className="glass-pill flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition hover:border-[#22C55E]/45 hover:bg-[#22C55E]/10"
                          >
                            <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/30 to-teal-700/40 text-xs font-bold text-emerald-950 dark:text-white">
                              {user.avatarText}
                              <span
                                className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white dark:border-[#090F0C] ${
                                  isLive ? 'bg-[#22C55E]' : 'bg-slate-400'
                                }`}
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-semibold text-emerald-950 dark:text-white">
                                {user.displayName}
                              </p>
                              <p className="truncate text-[11px] text-emerald-800/60 dark:text-emerald-200/55">
                                {user.handle} · {user.role}
                              </p>
                            </div>
                          </motion.button>
                        );
                      })
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
