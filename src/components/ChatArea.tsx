import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Hash,
  Search,
  Phone,
  Video,
  Info,
  X,
  Users,
  Pin,
  Sparkles,
  Plus,
} from 'lucide-react';
import { useChatStore } from '../store/useChatStore';
import { MessageBubble } from './MessageBubble';
import { FloatingComposer } from './FloatingComposer';
import type { UserPresence } from '../types/chat';

const STATUS_LABEL: Record<UserPresence, string> = {
  online: 'Active now',
  away: 'Away',
  busy: 'Busy · Do not disturb',
  offline: 'Offline',
};

const STATUS_DOT: Record<UserPresence, string> = {
  online: 'bg-[#22C55E]',
  away: 'bg-amber-400',
  busy: 'bg-rose-500',
  offline: 'bg-slate-400',
};

export const ChatArea: React.FC = () => {
  const feedEndRef = useRef<HTMLDivElement | null>(null);

  const conversations = useChatStore((s) => s.conversations);
  const activeConversationId = useChatStore((s) => s.activeConversationId);
  const isInChatSearchOpen = useChatStore((s) => s.isInChatSearchOpen);
  const inChatSearchQuery = useChatStore((s) => s.inChatSearchQuery);
  const isInfoPanelOpen = useChatStore((s) => s.isInfoPanelOpen);
  const typingConversations = useChatStore((s) => s.typingConversations);
  const onlineUserIds = useChatStore((s) => s.onlineUserIds);
  const workspaceLoading = useChatStore((s) => s.workspaceLoading);

  const toggleInChatSearch = useChatStore((s) => s.toggleInChatSearch);
  const setInChatSearchQuery = useChatStore((s) => s.setInChatSearchQuery);
  const toggleInfoPanel = useChatStore((s) => s.toggleInfoPanel);
  const togglePinConversation = useChatStore((s) => s.togglePinConversation);
  const setNewConvModalOpen = useChatStore((s) => s.setNewConvModalOpen);
  const startCall = useChatStore((s) => s.startCall);
  const activeCall = useChatStore((s) => s.activeCall);

  const activeConv =
    conversations.find((c) => c.id === activeConversationId) ?? conversations[0];
  const typingState = activeConv ? typingConversations[activeConv.id] : null;

  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConv?.messages.length, typingState, activeConversationId]);

  if (workspaceLoading) {
    return (
      <div className="glass-panel glass-surface flex flex-1 items-center justify-center rounded-2xl">
        <div className="flex items-center gap-2.5 text-xs font-medium text-emerald-800 dark:text-emerald-200">
          <Sparkles className="h-4 w-4 animate-spin text-[#22C55E]" />
          <span>Loading SkellyTalk...</span>
        </div>
      </div>
    );
  }

  if (!activeConv) {
    return (
      <div className="glass-panel glass-surface flex flex-1 flex-col items-center justify-center gap-3 rounded-2xl p-6 text-center">
        <p className="text-sm font-semibold text-emerald-950 dark:text-white">
          Welcome to SkellyTalk
        </p>
        <p className="max-w-xs text-xs text-emerald-800/65 dark:text-emerald-200/60">
          Create a channel or start a direct message with anyone to begin chatting in real time.
        </p>
        <button
          onClick={() => setNewConvModalOpen(true)}
          className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#22C55E] to-[#10B981] px-4 py-2 text-xs font-semibold text-white shadow-lem-glow-sm transition hover:brightness-110"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>New Conversation</span>
        </button>
      </div>
    );
  }

  const peerPresence: UserPresence =
    activeConv.type === 'dm' && activeConv.peerUserId
      ? onlineUserIds.has(activeConv.peerUserId)
        ? activeConv.status ?? 'online'
        : 'offline'
      : 'offline';

  const visibleMessages = inChatSearchQuery.trim()
    ? activeConv.messages.filter((m) =>
        m.content.toLowerCase().includes(inChatSearchQuery.toLowerCase())
      )
    : activeConv.messages;

  return (
    <div className="flex min-w-0 flex-1 gap-3">
      <section className="glass-panel glass-surface flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl">
        {/* Header */}
        <header className="flex shrink-0 items-center justify-between border-b border-black/[0.06] px-5 py-3.5 dark:border-white/[0.09]">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-xs font-bold ${
                activeConv.type === 'channel'
                  ? 'border border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                  : 'bg-gradient-to-br from-emerald-500/35 to-teal-700/45 text-emerald-950 ring-1 ring-white/25 dark:text-white'
              }`}
            >
              {activeConv.type === 'channel' ? (
                <Hash className="h-4 w-4" />
              ) : (
                activeConv.avatar
              )}
              {activeConv.type === 'dm' && (
                <span
                  className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white dark:border-[#090F0C] ${STATUS_DOT[peerPresence]}`}
                />
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-[15px] font-bold text-emerald-950 dark:text-white">
                  {activeConv.type === 'channel'
                    ? `#${activeConv.name}`
                    : activeConv.name}
                </h1>
                {activeConv.type === 'channel' && activeConv.membersCount && (
                  <span className="glass-pill inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium text-emerald-800 dark:text-emerald-200">
                    <Users className="h-2.5 w-2.5" />
                    {activeConv.membersCount}
                  </span>
                )}
              </div>
              <p className="truncate text-xs text-emerald-800/65 dark:text-emerald-200/55">
                {typingState
                  ? `${typingState.senderName} is typing...`
                  : activeConv.type === 'dm'
                    ? `${STATUS_LABEL[peerPresence]} · ${activeConv.roleOrTopic}`
                    : activeConv.roleOrTopic}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={toggleInChatSearch}
              title="Search in conversation"
              className={`glass-pill flex h-8 w-8 items-center justify-center rounded-full transition ${
                isInChatSearchOpen
                  ? 'border-[#22C55E]/60 bg-[#22C55E]/20 text-emerald-700 dark:text-emerald-300'
                  : 'text-emerald-800/75 hover:text-emerald-950 dark:text-emerald-100/75 dark:hover:text-white'
              }`}
            >
              <Search className="h-3.5 w-3.5" />
            </button>

            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => void startCall(activeConv.id, 'audio')}
              title="Start Voice Call"
              className={`glass-pill flex h-8 w-8 items-center justify-center rounded-full transition ${
                activeCall?.conversationId === activeConv.id &&
                activeCall.mode === 'audio'
                  ? 'bg-[#22C55E] text-white shadow-lem-glow-sm'
                  : 'text-emerald-800/75 hover:text-emerald-950 dark:text-emerald-100/75 dark:hover:text-white'
              }`}
            >
              <Phone className="h-3.5 w-3.5" />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => void startCall(activeConv.id, 'video')}
              title="Start Video Call"
              className={`glass-pill flex h-8 w-8 items-center justify-center rounded-full transition ${
                activeCall?.conversationId === activeConv.id &&
                activeCall.mode === 'video'
                  ? 'bg-[#22C55E] text-white shadow-lem-glow-sm'
                  : 'text-emerald-800/75 hover:text-emerald-950 dark:text-emerald-100/75 dark:hover:text-white'
              }`}
            >
              <Video className="h-3.5 w-3.5" />
            </motion.button>

            <button
              onClick={toggleInfoPanel}
              title="Conversation Info"
              className={`glass-pill flex h-8 w-8 items-center justify-center rounded-full transition ${
                isInfoPanelOpen
                  ? 'border-[#22C55E]/60 bg-[#22C55E]/20 text-emerald-700 dark:text-emerald-300'
                  : 'text-emerald-800/75 hover:text-emerald-950 dark:text-emerald-100/75 dark:hover:text-white'
              }`}
            >
              <Info className="h-3.5 w-3.5" />
            </button>
          </div>
        </header>

        <AnimatePresence>
          {isInChatSearchOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-b border-black/[0.06] px-5 dark:border-white/[0.08]"
            >
              <div className="flex items-center gap-2 py-2">
                <Search className="h-3.5 w-3.5 text-[#22C55E]" />
                <input
                  type="text"
                  autoFocus
                  value={inChatSearchQuery}
                  onChange={(e) => setInChatSearchQuery(e.target.value)}
                  placeholder="Filter messages in this thread..."
                  className="flex-1 bg-transparent text-xs text-emerald-950 placeholder-emerald-800/50 outline-none dark:text-white dark:placeholder-emerald-100/40"
                />
                {inChatSearchQuery && (
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-300">
                    {visibleMessages.length} match
                    {visibleMessages.length === 1 ? '' : 'es'}
                  </span>
                )}
                <button
                  onClick={toggleInChatSearch}
                  className="rounded-full p-1 text-emerald-800/60 hover:bg-black/5 dark:text-white/60 dark:hover:bg-white/10"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Expandable Search-in-Chat Bar */}

        <div className="lem-scrollbar flex-1 overflow-y-auto px-5 py-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeConv.id}
              initial={{ opacity: 0, y: 8, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.99 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              className="space-y-3"
            >
              {visibleMessages.length === 0 ? (
                <div className="flex min-h-[260px] flex-col items-center justify-center text-center">
                  <span className="glass-pill rounded-full px-3.5 py-1.5 text-xs text-emerald-800/70 dark:text-emerald-200/65">
                    {inChatSearchQuery
                      ? 'No messages match your search.'
                      : `This is the start of ${
                          activeConv.type === 'channel'
                            ? `#${activeConv.name}`
                            : activeConv.name
                        }. Say hello!`}
                  </span>
                </div>
              ) : (
                visibleMessages.map((msg, index) => {
                  const prev = visibleMessages[index - 1];
                  const showHeader = !prev || prev.senderId !== msg.senderId;
                  return (
                    <MessageBubble
                      key={msg.id}
                      message={msg}
                      showHeader={showHeader}
                      highlightQuery={inChatSearchQuery}
                    />
                  );
                })
              )}
            </motion.div>
          </AnimatePresence>

          <AnimatePresence>
            {typingState && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.94 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.94 }}
                transition={{ type: 'spring', stiffness: 400, damping: 26 }}
                className="flex items-center gap-2.5"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/20 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                  <Sparkles className="h-3.5 w-3.5 animate-pulse" />
                </div>
                <div className="glass-panel glass-bubble-received flex items-center gap-1.5 rounded-2xl rounded-tl-md px-3.5 py-2.5">
                  <span className="mr-1 text-xs font-medium text-emerald-800/75 dark:text-emerald-200/75">
                    {typingState.senderName}
                  </span>
                  {[0, 1, 2].map((dot) => (
                    <motion.span
                      key={dot}
                      animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
                      transition={{
                        duration: 0.85,
                        repeat: Infinity,
                        delay: dot * 0.16,
                      }}
                      className="h-1.5 w-1.5 rounded-full bg-[#22C55E]"
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div ref={feedEndRef} />
        </div>

        <FloatingComposer
          conversationId={activeConv.id}
          placeholder={
            activeConv.type === 'channel'
              ? `Message #${activeConv.name}...`
              : `Message ${activeConv.name}...`
          }
        />
      </section>

      <AnimatePresence>
        {isInfoPanelOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 270, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 360, damping: 32 }}
            className="glass-panel glass-surface flex shrink-0 flex-col overflow-hidden rounded-2xl"
          >
            <div className="flex items-center justify-between border-b border-black/[0.06] px-4 py-3.5 dark:border-white/[0.09]">
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-900/75 dark:text-emerald-200/75">
                Details
              </h3>
              <button
                onClick={toggleInfoPanel}
                className="rounded-full p-1 text-emerald-800/60 hover:bg-black/5 dark:text-white/60 dark:hover:bg-white/10"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="lem-scrollbar flex-1 space-y-4 overflow-y-auto p-4">
              <div className="flex flex-col items-center text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-[#22C55E] to-[#10B981] text-lg font-bold text-white shadow-lem-glow">
                  {activeConv.type === 'channel' ? '#' : activeConv.avatar}
                </div>
                <h4 className="mt-3 text-sm font-bold text-emerald-950 dark:text-white">
                  {activeConv.type === 'channel'
                    ? `#${activeConv.name}`
                    : activeConv.name}
                </h4>
                <p className="mt-1 text-xs text-emerald-800/65 dark:text-emerald-200/60">
                  {activeConv.roleOrTopic}
                </p>
              </div>

              <button
                onClick={() => void togglePinConversation(activeConv.id)}
                className="glass-pill flex w-full items-center justify-center gap-2 rounded-xl py-2 text-xs font-medium text-emerald-900 transition hover:border-emerald-400/50 dark:text-emerald-100"
              >
                <Pin className="h-3.5 w-3.5 text-[#22C55E]" />
                <span>
                  {activeConv.pinned ? 'Pinned to Sidebar' : 'Pin Conversation'}
                </span>
              </button>

              <div className="space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-800/55 dark:text-emerald-200/50">
                  Shared Media & Files
                </p>
                {activeConv.messages.some((m) => m.attachments?.length) ? (
                  activeConv.messages
                    .flatMap((m) => m.attachments ?? [])
                    .map((att) => (
                      <a
                        key={att.id}
                        href={att.previewUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="glass-pill block rounded-xl px-3 py-2 text-xs text-emerald-950 transition hover:border-[#22C55E]/50 dark:text-emerald-100"
                      >
                        <p className="truncate font-medium">{att.name}</p>
                        <p className="text-[10px] opacity-65">{att.size}</p>
                      </a>
                    ))
                ) : (
                  <p className="text-xs text-emerald-800/55 dark:text-emerald-200/45">
                    No files shared yet.
                  </p>
                )}
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
};
