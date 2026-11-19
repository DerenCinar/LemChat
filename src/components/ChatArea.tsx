import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
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
  UserPlus,
  LogOut,
  Check,
  Shield,
  Crown,
  ArrowDown,
  Download,
} from 'lucide-react';
import { useChatStore } from '../store/useChatStore';
import { MessageBubble } from './MessageBubble';
import { FloatingComposer } from './FloatingComposer';
import { UserAvatar } from './UserAvatar';
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

const formatLastSeen = (iso: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Last seen unavailable';
  return `Last seen ${date.toLocaleString([], {
    dateStyle: 'medium',
    timeStyle: 'short',
  })}`;
};

export const ChatArea: React.FC = () => {
  const feedRef = useRef<HTMLDivElement | null>(null);
  const feedEndRef = useRef<HTMLDivElement | null>(null);
  const wasNearBottomRef = useRef(true);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [selectedInvites, setSelectedInvites] = useState<string[]>([]);
  const [inviting, setInviting] = useState(false);

  const conversations = useChatStore((s) => s.conversations);
  const profiles = useChatStore((s) => s.profiles);
  const self = useChatStore((s) => s.self);
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
  const inviteToGroup = useChatStore((s) => s.inviteToGroup);
  const leaveConversation = useChatStore((s) => s.leaveConversation);
  const removeMember = useChatStore((s) => s.removeMember);
  const setMemberRole = useChatStore((s) => s.setMemberRole);
  const setSelectedProfileId = useChatStore((s) => s.setSelectedProfileId);
  const openAttachment = useChatStore((s) => s.openAttachment);
  const setMobileChatOpen = useChatStore((s) => s.setMobileChatOpen);
  const pendingMentionMessageId = useChatStore((s) => s.pendingMentionMessageId);
  const setPendingMentionMessageId = useChatStore((s) => s.setPendingMentionMessageId);

  const activeConv =
    conversations.find((c) => c.id === activeConversationId) ?? conversations[0];
  const typingState = activeConv ? typingConversations[activeConv.id] : null;

  useEffect(() => {
    if (pendingMentionMessageId) return;
    const frame = window.requestAnimationFrame(() => {
      if (feedRef.current) {
        feedRef.current.scrollTop = feedRef.current.scrollHeight;
      }
      feedEndRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' });
      wasNearBottomRef.current = true;
      setShowScrollToBottom(false);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activeConversationId, activeConv?.messages.length, pendingMentionMessageId, workspaceLoading]);

  // Opening a chat: jump to the bottom, and keep doing so briefly while
  // images/animations settle and change the feed height.
  useEffect(() => {
    if (workspaceLoading || pendingMentionMessageId) return;
    const jump = () => {
      const feed = feedRef.current;
      if (feed) feed.scrollTop = feed.scrollHeight;
      wasNearBottomRef.current = true;
      setShowScrollToBottom(false);
    };
    jump();
    const timers = [40, 120, 300, 600, 1000].map((ms) => window.setTimeout(jump, ms));
    return () => timers.forEach((t) => window.clearTimeout(t));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConversationId, workspaceLoading]);

  useEffect(() => {
    if (pendingMentionMessageId) return;
    if (wasNearBottomRef.current) {
      feedEndRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' });
      setShowScrollToBottom(false);
    }
  }, [activeConv?.messages.length, typingState]);

  useEffect(() => {
    if (!pendingMentionMessageId) return;
    const frame = window.requestAnimationFrame(() => {
      const element = document.querySelector<HTMLElement>(
        `[data-message-id="${CSS.escape(pendingMentionMessageId)}"]`
      );
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        window.setTimeout(() => setPendingMentionMessageId(null), 2400);
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [pendingMentionMessageId, activeConversationId, setPendingMentionMessageId]);

  useEffect(() => {
    setInviteOpen(false);
    setSelectedInvites([]);
  }, [activeConversationId]);

  if (workspaceLoading) {
    return (
      <div className="glass-panel glass-surface flex flex-1 flex-col rounded-2xl p-4 md:p-5" aria-label="Loading conversation">
        <div className="flex items-center gap-3 border-b border-black/[0.06] pb-4 dark:border-white/[0.09]">
          <div className="h-10 w-10 animate-pulse rounded-2xl bg-emerald-500/15" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-32 animate-pulse rounded-full bg-emerald-500/15" />
            <div className="h-2.5 w-20 animate-pulse rounded-full bg-emerald-500/10" />
          </div>
        </div>
        <div className="flex flex-1 flex-col justify-end gap-3 py-5">
          {[52, 76, 42, 68].map((width, index) => (
            <div
              key={width}
              className={`h-12 animate-pulse rounded-2xl bg-emerald-500/10 ${index % 2 === 0 ? 'w-[52%]' : 'ml-auto w-[68%]'}`}
              style={{ width: `${index % 2 === 0 ? width : width + 12}%`, maxWidth: '82%' }}
            />
          ))}
        </div>
        <div className="h-12 animate-pulse rounded-[26px] bg-emerald-500/10" />
      </div>
    );
  }

  if (!activeConv) {
    return (
      <div className="glass-panel glass-surface flex flex-1 flex-col items-center justify-center gap-3 rounded-2xl p-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#22C55E]/25 to-[#10B981]/15 ring-1 ring-[#22C55E]/25">
          <Sparkles className="h-6 w-6 text-[#22C55E]" />
        </div>
        <div>
          <p className="text-sm font-semibold text-emerald-950 dark:text-white">
            Welcome to SkellyTalk
          </p>
          <p className="mt-1 max-w-xs text-xs leading-relaxed text-emerald-800/65 dark:text-emerald-200/60">
            Create a group and invite people, or start a direct message to begin chatting in real time.
          </p>
        </div>
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
  const peerProfile =
    activeConv.type === 'dm' && activeConv.peerUserId
      ? profiles[activeConv.peerUserId]
      : undefined;
  const peerStatusLabel =
    peerPresence === 'offline'
      ? peerProfile?.lastSeenAt
        ? formatLastSeen(peerProfile.lastSeenAt)
        : 'Last seen unavailable'
      : STATUS_LABEL[peerPresence];

  const convMembers = activeConv.members ?? [];
  const convMessages = activeConv.messages ?? [];
  const exportConversation = (format: 'json' | 'txt' | 'html') => {
    const title = activeConv.type === 'channel' ? `#${activeConv.name}` : activeConv.name;
    const transcript = convMessages.map((message) => ({
      sender: message.senderName,
      timestamp: message.createdAt,
      content: message.deletedAt ? '[deleted]' : message.content,
      attachments: message.attachments?.map((attachment) => attachment.name) ?? [],
    }));
    let content = '';
    let mime = 'text/plain';
    if (format === 'json') {
      content = JSON.stringify({ title, exportedAt: new Date().toISOString(), messages: transcript }, null, 2);
      mime = 'application/json';
    } else if (format === 'html') {
      content = `<!doctype html><html><body><h1>${title}</h1>${transcript.map((message) =>
        `<p><strong>${message.sender}</strong> <small>${message.timestamp}</small><br>${message.content.replace(/&/g,'&amp;').replace(/</g,'&lt;')}</p>`
      ).join('')}</body></html>`;
      mime = 'text/html';
    } else {
      content = transcript.map((message) => `[${message.timestamp}] ${message.sender}: ${message.content}`).join('\n');
    }
    const url = URL.createObjectURL(new Blob([content], { type: mime }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${title.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'chat'}.${format}`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const visibleMessages = inChatSearchQuery.trim()
    ? convMessages.filter((m) =>
        m.content.toLowerCase().includes(inChatSearchQuery.toLowerCase())
      )
    : convMessages;

  const existingMemberIds = new Set(convMembers.map((m) => m.id));
  const invitableUsers = Object.values(profiles).filter(
    (p) => p.id !== self?.id && !existingMemberIds.has(p.id)
  );

  const handleConfirmInvites = async () => {
    if (selectedInvites.length === 0 || inviting) return;
    setInviting(true);
    await inviteToGroup(activeConv.id, selectedInvites);
    setSelectedInvites([]);
    setInviting(false);
    setInviteOpen(false);
  };

  return (
    <div className="relative flex h-full max-h-full min-h-0 min-w-0 flex-1 items-stretch gap-3 overflow-hidden">
      <section className="glass-panel glass-surface flex h-full min-h-0 min-w-0 basis-0 flex-1 flex-col overflow-hidden rounded-2xl">
        {/* Header */}
        <header className="flex shrink-0 items-center justify-between border-b border-black/[0.06] px-3 py-2.5 md:px-5 md:py-3.5 dark:border-white/[0.09]">
          <div className="flex min-w-0 items-center gap-2 md:gap-3">
            <button
              type="button"
              onClick={() => setMobileChatOpen(false)}
              aria-label="Back to conversations"
              className="glass-pill flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-emerald-900 md:hidden dark:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              disabled={activeConv.type !== 'dm' || !activeConv.peerUserId}
              onClick={() => {
                if (activeConv.type === 'dm' && activeConv.peerUserId) {
                  setSelectedProfileId(activeConv.peerUserId);
                }
              }}
              className={`relative shrink-0 ${
                activeConv.type === 'dm' ? 'cursor-pointer transition hover:scale-105' : 'cursor-default'
              }`}
              title={activeConv.type === 'dm' ? `View ${activeConv.name}'s profile` : undefined}
            >
              {activeConv.type === 'channel' ? (
                activeConv.logoUrl ? (
                  <img src={activeConv.logoUrl} alt="" className="h-10 w-10 rounded-2xl object-cover ring-1 ring-white/25" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/15 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                    <Hash className="h-4 w-4" />
                  </div>
                )
              ) : (
                <UserAvatar
                  avatar={activeConv.avatar}
                  name={activeConv.name}
                  className="h-10 w-10 rounded-2xl bg-gradient-to-br from-emerald-500/35 to-teal-700/45 text-emerald-950 ring-1 ring-white/25 dark:text-white"
                  textClassName="text-xs font-bold"
                />
              )}
              {activeConv.type === 'dm' && (
                <span
                  className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white dark:border-[#090F0C] ${STATUS_DOT[peerPresence]}`}
                />
              )}
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1
                  onClick={() => {
                    if (activeConv.type === 'dm' && activeConv.peerUserId) {
                      setSelectedProfileId(activeConv.peerUserId);
                    }
                  }}
                  className={`truncate text-[15px] font-bold text-emerald-950 dark:text-white ${
                    activeConv.type === 'dm' ? 'cursor-pointer hover:underline' : ''
                  }`}
                >
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
                    ? `${peerStatusLabel} · ${activeConv.roleOrTopic}`
                    : activeConv.roleOrTopic}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {activeConv.type === 'channel' && (
              <motion.button
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                onClick={() => setInviteOpen((v) => !v)}
                title="Invite people to group"
                className={`glass-pill flex h-8 w-8 items-center justify-center rounded-full transition ${
                  inviteOpen
                    ? 'border-[#22C55E]/60 bg-[#22C55E]/20 text-emerald-700 dark:text-emerald-300'
                    : 'text-emerald-800/75 hover:text-emerald-950 dark:text-emerald-100/75 dark:hover:text-white'
                }`}
              >
                <UserPlus className="h-3.5 w-3.5" />
              </motion.button>
            )}

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

        {/* Inline Group Invite Popover */}
        <AnimatePresence>
          {inviteOpen && activeConv.type === 'channel' && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-b border-black/[0.06] px-5 dark:border-white/[0.08]"
            >
              <div className="space-y-2.5 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-emerald-950 dark:text-white">
                    Invite people to #{activeConv.name}
                  </span>
                  <button
                    onClick={() => setInviteOpen(false)}
                    className="rounded-full p-1 text-emerald-800/60 hover:bg-black/5 dark:text-white/60 dark:hover:bg-white/10"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                {invitableUsers.length === 0 ? (
                  <p className="text-xs text-emerald-800/65 dark:text-emerald-200/60">
                    Everyone registered is already in this group!
                  </p>
                ) : (
                  <>
                    <div className="flex flex-wrap gap-1.5">
                      {invitableUsers.map((u) => {
                        const selected = selectedInvites.includes(u.id);
                        return (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() =>
                              setSelectedInvites((prev) =>
                                prev.includes(u.id)
                                  ? prev.filter((id) => id !== u.id)
                                  : [...prev, u.id]
                              )
                            }
                            className={`glass-pill flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs transition ${
                              selected
                                ? 'border-[#22C55E] bg-[#22C55E]/20 font-semibold text-emerald-900 dark:text-emerald-200'
                                : 'text-emerald-950 dark:text-emerald-100'
                            }`}
                          >
                            <UserAvatar
                              avatar={u.avatarText}
                              name={u.displayName}
                              className="h-5 w-5 rounded-full bg-emerald-500/25"
                              textClassName="text-[9px] font-bold"
                            />
                            <span>{u.displayName}</span>
                            {selected && <Check className="h-3 w-3 text-[#22C55E]" />}
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="button"
                        disabled={selectedInvites.length === 0 || inviting}
                        onClick={() => void handleConfirmInvites()}
                        className="rounded-full bg-gradient-to-r from-[#22C55E] to-[#10B981] px-4 py-1.5 text-xs font-semibold text-white shadow-lem-glow-sm transition hover:brightness-110 disabled:opacity-50"
                      >
                        {inviting
                          ? 'Inviting...'
                          : `Send Invite${selectedInvites.length > 1 ? 's' : ''} (${selectedInvites.length})`}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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

        <div
          ref={feedRef}
          onScroll={() => {
            const feed = feedRef.current;
            if (!feed) return;
            const distanceFromBottom =
              feed.scrollHeight - feed.scrollTop - feed.clientHeight;
            const nearBottom = distanceFromBottom < 120;
            wasNearBottomRef.current = nearBottom;
            setShowScrollToBottom(!nearBottom);
          }}
          className="lem-scrollbar flex-1 overflow-y-auto px-3 py-3 md:px-5 md:py-4"
        >
          <div className="space-y-3">
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
                const lastReadTime = activeConv.lastReadAt
                  ? new Date(activeConv.lastReadAt).getTime()
                  : 0;
                const messageTime = new Date(msg.createdAt).getTime();
                const isFirstUnread =
                  Boolean(activeConv.lastReadAt) &&
                  !msg.isMe &&
                  messageTime > lastReadTime &&
                  (!prev ||
                    new Date(prev.createdAt).getTime() <= lastReadTime);
                return (
                  <React.Fragment key={msg.id}>
                    {isFirstUnread && (
                      <div
                        data-unread-divider
                        role="separator"
                        aria-label="New messages"
                        className="unread-divider"
                      >
                        <span className="unread-divider-label">New messages</span>
                      </div>
                    )}
                    <MessageBubble
                      message={msg}
                      showHeader={showHeader}
                      highlightQuery={inChatSearchQuery}
                      highlightMention={pendingMentionMessageId === msg.id}
                    />
                  </React.Fragment>
                );
              })
            )}
          </div>

          <AnimatePresence>
            {typingState && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.94 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.94 }}
                transition={{ type: 'spring', stiffness: 400, damping: 26 }}
                className="flex items-center gap-2.5 pt-2"
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

        <AnimatePresence>
          {showScrollToBottom && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 8 }}
              onClick={() => {
                feedEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
                wasNearBottomRef.current = true;
                setShowScrollToBottom(false);
              }}
              className="glass-panel glass-surface absolute bottom-[78px] right-5 z-20 flex h-10 w-10 items-center justify-center rounded-full text-emerald-950 shadow-lem-glow-sm transition hover:scale-105 dark:text-white"
              title="Scroll to bottom"
              aria-label="Scroll to bottom"
            >
              <ArrowDown className="h-4 w-4" />
            </motion.button>
          )}
        </AnimatePresence>

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
            animate={{ width: activeConv.type === 'channel' ? 320 : 270, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 360, damping: 32 }}
            className={`glass-panel glass-surface fixed bottom-2 left-2 right-2 top-12 z-40 flex min-h-0 !w-auto shrink-0 flex-col overflow-hidden rounded-2xl md:static md:bottom-auto md:left-auto md:right-auto md:top-auto md:h-auto md:max-h-full md:self-stretch ${
              activeConv.type === 'channel' ? 'md:!w-[260px] lg:!w-[280px]' : 'md:!w-[250px] lg:!w-[270px]'
            }`}
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

            <div className="lem-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
              <div className="flex flex-col items-center text-center">
                {activeConv.type === 'channel' ? (
                  activeConv.logoUrl ? (
                    <img src={activeConv.logoUrl} alt="" className="h-16 w-16 rounded-3xl object-cover shadow-lem-glow ring-1 ring-white/25" />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-[#22C55E] to-[#10B981] text-lg font-bold text-white shadow-lem-glow">
                      #
                    </div>
                  )
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (activeConv.peerUserId) {
                        setSelectedProfileId(activeConv.peerUserId);
                      }
                    }}
                    className="transition hover:scale-105"
                  >
                    <UserAvatar
                      avatar={activeConv.avatar}
                      name={activeConv.name}
                      className="h-16 w-16 rounded-3xl bg-gradient-to-br from-[#22C55E] to-[#10B981] text-white shadow-lem-glow"
                      textClassName="text-lg font-bold"
                    />
                  </button>
                )}
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

              <div className="grid grid-cols-3 gap-1.5">
                {(['json', 'txt', 'html'] as const).map((format) => (
                  <button
                    key={format}
                    type="button"
                    onClick={() => exportConversation(format)}
                    className="glass-pill flex items-center justify-center gap-1 rounded-xl py-2 text-[10px] font-semibold uppercase"
                  >
                    <Download className="h-3 w-3" />
                    {format}
                  </button>
                ))}
              </div>

              {activeConv.type === 'channel' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-800/55 dark:text-emerald-200/50">
                      Members ({convMembers.length})
                    </p>
                    <button
                      onClick={() => setInviteOpen(true)}
                      className="flex items-center gap-1 text-[10px] font-semibold text-[#22C55E] hover:underline"
                    >
                      <UserPlus className="h-3 w-3" />
                      <span>Invite</span>
                    </button>
                  </div>

                  <div className="space-y-1">
                    {convMembers.map((member) => {
                      const isOnline =
                        member.id === self?.id || onlineUserIds.has(member.id);
                      const selfRole = activeConv.memberRoles?.[self?.id ?? ''] ?? 'member';
                      const memberRole = activeConv.memberRoles?.[member.id] ?? 'member';
                      const canManage = selfRole === 'owner' || selfRole === 'admin';
                      return (
                        <div
                          key={member.id}
                          className="glass-pill flex w-full items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-left transition hover:border-[#22C55E]/40"
                        >
                          <button type="button" onClick={() => setSelectedProfileId(member.id)} className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
                          <div className="relative shrink-0">
                            <UserAvatar
                              avatar={member.avatarText}
                              name={member.displayName}
                              className="h-7 w-7 rounded-lg bg-emerald-500/20"
                              textClassName="text-[10px] font-bold"
                            />
                            <span
                              className={`absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-white dark:border-[#090F0C] ${
                                isOnline ? 'bg-[#22C55E]' : 'bg-slate-400'
                              }`}
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-semibold text-emerald-950 dark:text-white">
                              {member.displayName}
                            </p>
                            <p className="truncate text-[10px] text-emerald-800/60 dark:text-emerald-200/55">
                              {member.handle}
                            </p>
                          </div>
                          </button>
                          {canManage && member.id !== self?.id && (
                            <div className="flex shrink-0 items-center gap-1">
                              {selfRole === 'owner' && (
                                <button
                                  type="button"
                                  title={memberRole === 'admin' ? 'Make moderator' : 'Make admin'}
                                  onClick={() => void setMemberRole(activeConv.id, member.id, memberRole === 'admin' ? 'moderator' : 'admin')}
                                  className="rounded-full p-1 text-amber-500 hover:bg-amber-500/10"
                                >
                                  {memberRole === 'admin' ? <Shield className="h-3 w-3" /> : <Crown className="h-3 w-3" />}
                                </button>
                              )}
                              <button
                                type="button"
                                title={`Remove ${member.displayName}`}
                                onClick={() => void removeMember(activeConv.id, member.id)}
                                className="rounded-full p-1 text-rose-500 hover:bg-rose-500/10"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-800/55 dark:text-emerald-200/50">
                  Shared Media &amp; Files
                </p>
                {convMessages.some((m) => m.attachments?.length) ? (
                  convMessages
                    .flatMap((m) => m.attachments ?? [])
                    .map((att) => (
                      <button
                        type="button"
                        key={att.id}
                        onClick={() => openAttachment(att)}
                        disabled={!att.previewUrl}
                        className="glass-pill block w-full rounded-xl px-3 py-2 text-left text-xs text-emerald-950 transition hover:border-[#22C55E]/50 dark:text-emerald-100"
                      >
                        <p className="truncate font-medium">{att.name}</p>
                        <p className="text-[10px] opacity-65">{att.size}</p>
                      </button>
                    ))
                ) : (
                  <p className="text-xs text-emerald-800/55 dark:text-emerald-200/45">
                    No files shared yet.
                  </p>
                )}
              </div>

              {activeConv.type === 'channel' && (
                <button
                  onClick={() => void leaveConversation(activeConv.id)}
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-rose-500/15 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-500/25 dark:text-rose-300"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Leave Group</span>
                </button>
              )}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
};
