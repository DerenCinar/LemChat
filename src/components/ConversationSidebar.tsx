import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Pin, Hash, X, Plus } from 'lucide-react';
import { useChatStore } from '../store/useChatStore';
import { UserAvatar } from './UserAvatar';
import type { Conversation, UserPresence } from '../types/chat';

const PRESENCE_DOT: Record<UserPresence, string> = {
  online: 'bg-[#22C55E] shadow-[0_0_8px_rgba(34,197,94,0.85)]',
  away: 'bg-amber-400',
  busy: 'bg-rose-500',
  offline: 'bg-slate-400',
};

export const ConversationSidebar: React.FC = () => {
  const [width, setWidth] = useState(296);
  const isResizingRef = useRef(false);

  const conversations = useChatStore((s) => s.conversations);
  const activeConversationId = useChatStore((s) => s.activeConversationId);
  const activeTab = useChatStore((s) => s.activeTab);
  const searchQuery = useChatStore((s) => s.searchQuery);
  const typingConversations = useChatStore((s) => s.typingConversations);
  const onlineUserIds = useChatStore((s) => s.onlineUserIds);

  const setSearchQuery = useChatStore((s) => s.setSearchQuery);
  const selectConversation = useChatStore((s) => s.selectConversation);
  const setPendingMentionMessageId = useChatStore((s) => s.setPendingMentionMessageId);
  const togglePinConversation = useChatStore((s) => s.togglePinConversation);
  const setNewConvModalOpen = useChatStore((s) => s.setNewConvModalOpen);

  const startResize = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizingRef.current = true;
    const startX = e.clientX;
    const startWidth = width;

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!isResizingRef.current) return;
      const next = Math.max(240, Math.min(390, startWidth + (moveEvent.clientX - startX)));
      setWidth(next);
    };

    const onMouseUp = () => {
      isResizingRef.current = false;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const filtered = conversations.filter((conv) => {
    if (activeTab === 'channels' && conv.type !== 'channel') return false;
    if (activeTab === 'mentions' && !conv.messages.some((m) => m.isMention)) {
      return false;
    }
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      conv.name.toLowerCase().includes(q) ||
      conv.roleOrTopic.toLowerCase().includes(q) ||
      conv.messages.some((m) => m.content.toLowerCase().includes(q))
    );
  });

  const pinnedList = filtered.filter((c) => c.pinned);
  const regularList = filtered.filter((c) => !c.pinned);

  const headerLabel =
    activeTab === 'channels'
      ? 'Groups'
      : activeTab === 'mentions'
        ? 'Mentions'
        : 'Messages';

  const renderItem = (conv: Conversation) => {
    const isActive = conv.id === activeConversationId && activeTab !== 'settings';
    const msgs = conv.messages ?? [];
    const lastMessage = msgs[msgs.length - 1];
    const typing = typingConversations[conv.id];
    const peerPresence: UserPresence =
      conv.type === 'dm' && conv.peerUserId
        ? onlineUserIds.has(conv.peerUserId)
          ? conv.status ?? 'online'
          : 'offline'
        : 'offline';

    return (
      <motion.div
        key={conv.id}
        layout
        whileHover={{ x: 2 }}
        whileTap={{ scale: 0.985 }}
        transition={{ type: 'spring', stiffness: 440, damping: 30 }}
        onClick={() => {
          if (activeTab === 'mentions') {
            const mention = [...msgs].reverse().find((message) => message.isMention);
            if (mention) setPendingMentionMessageId(mention.id);
          }
          void selectConversation(conv.id);
        }}
        className={`group relative flex cursor-pointer items-center gap-3 overflow-hidden rounded-2xl px-3 py-2.5 transition-colors ${
          isActive
            ? ''
            : 'hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'
        }`}
      >
        {isActive && (
          <motion.div
            layoutId="sidebar-active-glass"
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-r from-[#22C55E]/22 via-[#10B981]/14 to-transparent ring-1 ring-[#22C55E]/40 dark:from-[#22C55E]/25 dark:via-[#10B981]/15"
          />
        )}
        <div className="relative z-10 shrink-0">
          {conv.type === 'channel' ? (
            conv.logoUrl ? (
              <img src={conv.logoUrl} alt="" className="h-10 w-10 rounded-2xl object-cover ring-1 ring-white/20 transition-transform group-hover:scale-105" />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/15 text-xs font-bold text-emerald-700 transition-transform group-hover:scale-105 dark:text-emerald-300">
                <Hash className="h-4 w-4" />
              </div>
            )
          ) : (
            <UserAvatar
              avatar={conv.avatar}
              name={conv.name}
              className="h-10 w-10 rounded-2xl bg-gradient-to-br from-emerald-500/30 to-teal-700/40 text-emerald-950 ring-1 ring-white/20 transition-transform group-hover:scale-105 dark:text-white"
              textClassName="text-xs font-bold"
            />
          )}

          {conv.type === 'dm' && (
            <span
              className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white dark:border-[#090F0C] ${PRESENCE_DOT[peerPresence]}`}
            />
          )}
        </div>

        <div className="relative z-10 min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-[13px] font-semibold text-emerald-950 dark:text-emerald-50">
              {conv.type === 'channel' ? `#${conv.name}` : conv.name}
            </span>
            <span className="shrink-0 text-[10px] text-emerald-800/55 dark:text-emerald-200/45">
              {lastMessage?.timestamp}
            </span>
          </div>

          <div className="mt-0.5 flex items-center justify-between gap-2">
            {typing ? (
              <span className="truncate text-xs font-medium text-[#22C55E]">
                {typing.senderName} is typing...
              </span>
            ) : (
              <p className="truncate text-xs text-emerald-900/65 dark:text-emerald-100/55">
                {lastMessage
                  ? `${lastMessage.isMe ? 'You: ' : ''}${
                      lastMessage.content ||
                      (lastMessage.attachments?.length
                        ? `Sent ${lastMessage.attachments[0].name}`
                        : 'Code snippet')
                    }`
                  : conv.roleOrTopic}
              </p>
            )}

            <div className="flex shrink-0 items-center gap-1.5">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  void togglePinConversation(conv.id);
                }}
                title={conv.pinned ? 'Unpin' : 'Pin conversation'}
                className={`rounded-md p-0.5 transition ${
                  conv.pinned
                    ? 'text-emerald-500 opacity-75 hover:opacity-100'
                    : 'text-emerald-900/40 opacity-0 group-hover:opacity-100 dark:text-white/40'
                }`}
              >
                <Pin className="h-3 w-3" />
              </button>

              {conv.unreadCount > 0 && (
                <motion.span
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-gradient-to-r from-[#22C55E] to-[#10B981] px-1.5 text-[10px] font-bold text-white shadow-lem-glow-sm"
                >
                  {conv.unreadCount}
                </motion.span>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <aside
      style={{ '--sidebar-w': `${width}px` } as React.CSSProperties}
      className="glass-panel glass-surface relative z-10 flex w-full flex-1 shrink-0 flex-col rounded-2xl transition-[box-shadow] duration-200 md:w-[var(--sidebar-w)] md:flex-initial"
    >
      <div className="px-3.5 pb-2 pt-3.5">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold tracking-tight text-emerald-950 dark:text-white">
              {headerLabel}
            </h2>
            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
              {filtered.length}
            </span>
          </div>

          <button
            onClick={() => setNewConvModalOpen(true)}
            title="New channel or direct message"
            className="glass-pill flex h-7 w-7 items-center justify-center rounded-full text-emerald-700 transition hover:scale-105 hover:border-[#22C55E]/60 hover:text-[#22C55E] dark:text-emerald-300"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="glass-pill flex items-center gap-2 rounded-full px-3 py-1.5 transition focus-within:border-[#22C55E]/60 focus-within:ring-2 focus-within:ring-[#22C55E]/20">
          <Search className="h-3.5 w-3.5 shrink-0 text-emerald-700/60 dark:text-emerald-200/50" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search SkellyTalk..."
            className="w-full bg-transparent text-xs text-emerald-950 placeholder-emerald-800/45 outline-none dark:text-white dark:placeholder-emerald-100/40"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-emerald-700/60 hover:text-emerald-950 dark:text-white/50 dark:hover:text-white"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      <div className="lem-scrollbar flex-1 space-y-4 overflow-y-auto px-2.5 pb-3 pt-1">
        {pinnedList.length > 0 && (
          <div>
            <div className="mb-1.5 flex items-center gap-1.5 px-2 text-[10px] font-semibold uppercase tracking-wider text-emerald-800/55 dark:text-emerald-200/45">
              <Pin className="h-2.5 w-2.5" />
              <span>Pinned</span>
            </div>
            <div className="space-y-1">{pinnedList.map(renderItem)}</div>
          </div>
        )}

        <div>
          <div className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-wider text-emerald-800/55 dark:text-emerald-200/45">
            {pinnedList.length > 0 ? 'All Conversations' : 'Conversations'}
          </div>
          <div className="space-y-1">
            {regularList.map(renderItem)}
            {filtered.length === 0 && (
              <div className="mx-1 flex min-h-40 flex-col items-center justify-center rounded-2xl border border-dashed border-emerald-500/20 px-4 text-center">
                <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10">
                  {searchQuery ? <Search className="h-4 w-4 text-emerald-600" /> : <Plus className="h-4 w-4 text-emerald-600" />}
                </div>
                <p className="text-xs font-semibold text-emerald-950 dark:text-white">
                  {searchQuery ? 'No matches found' : 'No conversations yet'}
                </p>
                <p className="mt-1 max-w-44 text-[11px] leading-relaxed text-emerald-800/55 dark:text-emerald-200/50">
                  {searchQuery ? 'Try a different name or keyword.' : 'Create a group or start a direct message.'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div
        onMouseDown={startResize}
        title="Drag to resize sidebar"
        className="absolute -right-1.5 top-4 bottom-4 z-20 hidden w-3 cursor-col-resize rounded-full transition-colors hover:bg-[#22C55E]/30 md:block"
      />
    </aside>
  );
};
