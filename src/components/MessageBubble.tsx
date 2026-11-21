import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Check,
  CheckCheck,
  Copy,
  FileText,
  SmilePlus,
  Reply,
  Pencil,
  Trash2,
  Pin,
  Forward,
} from 'lucide-react';
import { useChatStore } from '../store/useChatStore';
import { UserAvatar } from './UserAvatar';
import { InteractiveCard } from './InteractiveCard';
import { LiquidGlassLayer } from './LiquidGlassLayer';
import type { Message } from '../types/chat';
import { useT } from '../lib/i18n';

const SpoilerText: React.FC<{ text: string }> = ({ text }) => {
  const [revealed, setRevealed] = useState(false);
  return (
    <button
      type="button"
      onClick={() => setRevealed(true)}
      className={`rounded px-1 transition ${
        revealed
          ? 'bg-transparent'
          : 'select-none bg-black/35 text-transparent blur-[5px] hover:bg-black/45'
      }`}
    >
      {text}
    </button>
  );
};

interface MessageBubbleProps {
  message: Message;
  showHeader: boolean;
  isLastInGroup?: boolean;
  highlightQuery?: string;
  highlightMention?: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = React.memo(({
  message,
  showHeader,
  isLastInGroup = true,
  highlightQuery,
  highlightMention,
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const t = useT();
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.content);
  const pickerContainerRef = useRef<HTMLDivElement | null>(null);

  const toggleReaction = useChatStore((s) => s.toggleReaction);
  const setReplyingTo = useChatStore((s) => s.setReplyingTo);
  const editMessage = useChatStore((s) => s.editMessage);
  const deleteMessage = useChatStore((s) => s.deleteMessage);
  const togglePinMessage = useChatStore((s) => s.togglePinMessage);
  const setSelectedProfileId = useChatStore((s) => s.setSelectedProfileId);
  const openAttachment = useChatStore((s) => s.openAttachment);
  const self = useChatStore((s) => s.self);
  const quickReactions = useChatStore((s) => s.liquidGlass.quickReactions);
  const entranceEffect = useChatStore((s) => s.liquidGlass.entranceEffect);
  const bubbleStyle = useChatStore((s) => s.liquidGlass.bubbleStyle);
  const density = useChatStore((s) => s.liquidGlass.density);
  const pickerPopupId = `reaction:${message.id}`;
  const showPicker = useChatStore((s) => s.activePopupId === pickerPopupId);
  const forwardPopupId = `forward:${message.id}`;
  const showForward = useChatStore((s) => s.activePopupId === forwardPopupId);
  const conversationList = useChatStore((s) => (showForward ? s.conversations : null));
  const forwardMessage = useChatStore((s) => s.forwardMessage);
  const [forwardedTo, setForwardedTo] = useState<string | null>(null);
  const setActivePopupId = useChatStore((s) => s.setActivePopupId);
  const togglePopup = useChatStore((s) => s.togglePopup);
  const isTailedStyle =
    (bubbleStyle === 'imessage' || bubbleStyle === 'imessage-classic') &&
    density !== 'minimal';
  const showTail = isTailedStyle && isLastInGroup;

  useEffect(() => {
    if (!showPicker && !showForward) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (
        pickerContainerRef.current &&
        !pickerContainerRef.current.contains(event.target as Node)
      ) {
        setActivePopupId(null);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActivePopupId(null);
      }
    };
    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showPicker, showForward, setActivePopupId]);

  const entrance =
    entranceEffect === 'instant'
      ? { opacity: 1, y: 0, scale: 1 }
      : entranceEffect === 'slide'
        ? { opacity: 0, y: 24, scale: 1 }
        : entranceEffect === 'liquid'
          ? { opacity: 0, y: 8, scale: 0.96, filter: 'blur(8px)' }
          : { opacity: 0, y: 18, scale: 0.84 };
  const entranceTransition =
    entranceEffect === 'instant'
      ? { duration: 0 }
      : entranceEffect === 'liquid'
        ? { duration: 0.45, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }
        : entranceEffect === 'slide'
          ? { type: 'spring' as const, stiffness: 360, damping: 30 }
          : { type: 'spring' as const, stiffness: 460, damping: 25, mass: 0.78 };

  const handleCopyCode = () => {
    if (!message.codeBlock) return;
    navigator.clipboard.writeText(message.codeBlock.code).catch(() => {});
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 1600);
  };

  const handleSaveEdit = async () => {
    if (!editText.trim()) return;
    await editMessage(message.id, editText);
    setIsEditing(false);
  };

  const renderHighlightedContent = (text: string) => {
    const terms = highlightMention
      ? [self?.handle, self?.name].filter((term): term is string => Boolean(term?.trim()))
      : [];
    if (highlightQuery?.trim()) terms.unshift(highlightQuery.trim());
    const uniqueTerms = [...new Set(terms)].sort((a, b) => b.length - a.length);
    if (uniqueTerms.length === 0) return text;
    const escaped = uniqueTerms.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
    return parts.map((part, idx) =>
      uniqueTerms.some((term) => part.toLowerCase() === term.toLowerCase()) ? (
        <mark
          key={idx}
          className="rounded bg-amber-300/80 px-0.5 text-emerald-950"
        >
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  const renderFormattedContent = (text: string) => {
    const highlighted = renderHighlightedContent(text);
    const nodes = React.Children.toArray(highlighted);
    return nodes.flatMap((node, nodeIndex) => {
      if (typeof node !== 'string') return [node];
      const spoilerParts = node.split(/(\|\|[^|]+\|\|)/g);
      return spoilerParts.map((part, index) => {
        if (part.startsWith('||') && part.endsWith('||')) {
          const secret = part.slice(2, -2);
          return (
            <SpoilerText key={`${nodeIndex}-${index}`} text={secret} />
          );
        }
        const boldParts = part.split(/(\*\*[^*]+\*\*)/g);
        return boldParts.map((boldPart, boldIndex) =>
          boldPart.startsWith('**') && boldPart.endsWith('**') ? (
            <strong key={`${nodeIndex}-${index}-${boldIndex}`}>{boldPart.slice(2, -2)}</strong>
          ) : (
            boldPart
          )
        );
      });
    });
  };

  // Parse quoted reply prefix (`> Author: quote\n\nBody`)
  let quoteLine: string | null = null;
  let bodyContent = message.content;
  if (message.content.startsWith('> ')) {
    const splitIdx = message.content.indexOf('\n\n');
    if (splitIdx !== -1) {
      quoteLine = message.content.slice(2, splitIdx);
      bodyContent = message.content.slice(splitIdx + 2);
    }
  }

  // Parse forwarded prefix (first line: "↪ Forwarded from Name:", then the body)
  let forwardedFrom: string | null = null;
  const forwardMatch = /^↪ Forwarded from ([^\n]*?):?(?:\n|$)/.exec(message.content);
  if (forwardMatch) {
    forwardedFrom = forwardMatch[1] || null;
    bodyContent = message.content.slice(forwardMatch[0].length);
  }

  const actionToolbar = (
    <div
      ref={pickerContainerRef}
      className={`relative flex items-center transition-opacity ${
        showPicker || showForward ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
      }`}
    >
      <div className="glass-pill flex items-center gap-0.5 rounded-full p-0.5">
        <button
          onClick={() => setReplyingTo(message)}
          className="flex h-6 w-6 items-center justify-center rounded-full text-emerald-800 transition hover:bg-black/5 dark:text-emerald-200 dark:hover:bg-white/10"
          title={t('msg.reply')}
        >
          <Reply className="h-3.5 w-3.5" />
        </button>

        <button
          onClick={() => togglePopup(pickerPopupId)}
          className={`flex h-6 w-6 items-center justify-center rounded-full transition ${
            showPicker
              ? 'bg-[#22C55E]/20 text-[#22C55E]'
              : 'text-emerald-800 hover:bg-black/5 dark:text-emerald-200 dark:hover:bg-white/10'
          }`}
          title={t('msg.react')}
        >
          <SmilePlus className="h-3.5 w-3.5" />
        </button>

        {!message.deletedAt && !message.interactive && (
          <button
            onClick={() => togglePopup(forwardPopupId)}
            className={`flex h-6 w-6 items-center justify-center rounded-full transition ${
              showForward
                ? 'bg-[#22C55E]/20 text-[#22C55E]'
                : 'text-emerald-800 hover:bg-black/5 dark:text-emerald-200 dark:hover:bg-white/10'
            }`}
            title={t('msg.forward')}
            aria-label={t('msg.forward')}
          >
            <Forward className="h-3.5 w-3.5" />
          </button>
        )}

        <button
          onClick={() => void togglePinMessage(message.id)}
          className={`flex h-6 w-6 items-center justify-center rounded-full transition ${
            message.isPinned
              ? 'bg-[#22C55E]/25 text-[#22C55E]'
              : 'text-emerald-800 hover:bg-black/5 dark:text-emerald-200 dark:hover:bg-white/10'
          }`}
          title={message.isPinned ? t('msg.unpin') : t('msg.pin')}
        >
          <Pin className="h-3.5 w-3.5" />
        </button>

        {message.isMe && (
          <>
            <button
              onClick={() => {
                setEditText(message.content);
                setIsEditing((v) => !v);
              }}
              disabled={Boolean(message.deletedAt)}
              className="flex h-6 w-6 items-center justify-center rounded-full text-emerald-800 transition hover:bg-black/5 disabled:opacity-40 dark:text-emerald-200 dark:hover:bg-white/10"
              title={t('msg.edit')}
            >
              <Pencil className="h-3 w-3" />
            </button>
            <button
              onClick={() => void deleteMessage(message.id)}
              disabled={Boolean(message.deletedAt)}
              className="flex h-6 w-6 items-center justify-center rounded-full text-rose-500 transition hover:bg-rose-500/10 disabled:opacity-40"
              title={t('msg.delete')}
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </>
        )}
      </div>

      <AnimatePresence>
        {showForward && conversationList && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 460, damping: 28 }}
            role="menu"
            aria-label={t('msg.forwardTo')}
            className={`glass-panel glass-surface absolute bottom-8 z-30 w-56 rounded-2xl p-1.5 ${
              message.isMe ? 'right-0' : 'left-0'
            }`}
          >
            <LiquidGlassLayer variant="popover" interactive cornerRadius={16} />
            <p className="relative px-2 pb-1 pt-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-800/60 dark:text-emerald-200/50">
              {t('msg.forwardTo')}
            </p>
            <div className="lem-scrollbar relative max-h-48 overflow-y-auto">
              {conversationList.map((c) => (
                <button
                  key={c.id}
                  role="menuitem"
                  onClick={async () => {
                    const ok = await forwardMessage(message.id, c.id);
                    setForwardedTo(ok ? c.id : null);
                    setActivePopupId(null);
                    if (ok) window.setTimeout(() => setForwardedTo(null), 2000);
                  }}
                  className="flex w-full items-center truncate rounded-xl px-2 py-1.5 text-left text-xs text-emerald-950 transition hover:bg-black/5 dark:text-emerald-50 dark:hover:bg-white/10"
                >
                  <span className="truncate">{c.type === 'channel' ? `#${c.name}` : c.name}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
        {forwardedTo && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="status"
            className={`glass-pill absolute bottom-8 z-30 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] text-emerald-800 dark:text-emerald-200 ${
              message.isMe ? 'right-0' : 'left-0'
            }`}
          >
            {t('msg.forwarded')}
          </motion.span>
        )}
        {showPicker && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.92 }}
            transition={{ type: 'spring', stiffness: 460, damping: 28 }}
            className={`glass-panel glass-surface absolute bottom-8 z-30 flex items-center gap-1 rounded-full px-2 py-1 ${
              message.isMe ? 'right-0' : 'left-0'
            }`}
          >
            <LiquidGlassLayer variant="popover" interactive cornerRadius={999} />
            {quickReactions.map((emoji) => (
              <button
                key={emoji}
                onClick={() => {
                  void toggleReaction(message.conversationId, message.id, emoji);
                  setActivePopupId(null);
                }}
                className="rounded-full p-1 text-sm transition hover:scale-125"
              >
                {emoji}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  return (
    <motion.div
      id={`message-${message.id}`}
      data-message-id={message.id}
      data-message-row
      initial={entrance}
      animate={{
        opacity: 1,
        y: 0,
        scale: 1,
      }}
      transition={entranceTransition}
      style={{
        transformOrigin: message.isMe ? 'bottom right' : 'bottom left',
      }}
      className={`group flex gap-2.5 ${message.isMe ? 'flex-row-reverse' : 'flex-row'}`}
    >
      {!message.isMe && (
        <div className="w-8 shrink-0 pt-0.5">
          {showHeader ? (
            <button
              type="button"
              onClick={() => setSelectedProfileId(message.senderId)}
              title={`View ${message.senderName}'s profile`}
              className="transition hover:scale-105"
            >
              <UserAvatar
                avatar={message.senderAvatar}
                name={message.senderName}
                className="h-8 w-8 rounded-xl bg-gradient-to-br from-emerald-500/35 to-teal-700/45 text-emerald-950 ring-1 ring-white/25 dark:text-white"
                textClassName="text-[11px] font-bold"
              />
            </button>
          ) : null}
        </div>
      )}

      <div
        className={`relative flex max-w-[74%] flex-col ${
          message.isMe ? 'items-end' : 'items-start'
        }`}
      >
        {showHeader && !message.isMe && (
          <div className="mb-1 flex items-center gap-2 px-1">
            <button
              type="button"
              onClick={() => setSelectedProfileId(message.senderId)}
              className="text-xs font-semibold text-emerald-950 hover:underline dark:text-emerald-100"
            >
              {message.senderName}
            </button>
            {message.senderRole && (
              <span className="text-[10px] text-emerald-800/60 dark:text-emerald-200/45">
                {message.senderRole}
              </span>
            )}
          </div>
        )}

        <div className="relative flex items-center gap-2">
          {message.isMe && actionToolbar}

          <div
            data-message-bubble
            data-is-me={message.isMe ? 'true' : 'false'}
            data-tail={showTail ? 'true' : 'false'}
            data-grouped={!showHeader ? 'true' : 'false'}
            className={`glass-panel relative px-3.5 py-2.5 text-[13.5px] leading-relaxed select-text transition-transform duration-150 hover:scale-[1.01] ${
              isTailedStyle ? 'rounded-[20px]' : 'overflow-hidden rounded-2xl'
            } ${
              message.isMe
                ? `glass-bubble-sent ${isTailedStyle ? '' : 'rounded-tr-md'} text-white`
                : `glass-bubble-received ${isTailedStyle ? '' : 'rounded-tl-md'} text-emerald-950 dark:text-emerald-50/95`
            } ${highlightMention ? 'ring-2 ring-[#22C55E] ring-offset-4 ring-offset-transparent animate-pulse' : ''}`}
          >
            <LiquidGlassLayer
              variant="bubble"
              interactive
              disabled={bubbleStyle === 'imessage-classic' || density === 'minimal'}
            />
            {showTail && (
              <svg
                aria-hidden="true"
                viewBox="0 0 16 16"
                className={`pointer-events-none absolute bottom-0 h-4 w-4 ${
                  message.isMe
                    ? 'bubble-tail-sent -right-[5.8px]'
                    : 'bubble-tail-received -left-[5.8px] -scale-x-100'
                }`}
              >
                <path
                  d="M 9.8 2 C 9.8 9.2 12.1 13.5 15.8 15.7 C 11.2 16.1 6.9 14.9 3.8 13.3 A 14 14 0 0 0 9.8 2 Z"
                  fill="currentColor"
                />
              </svg>
            )}
            {entranceEffect === 'liquid' && (
              <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
                <motion.span
                  aria-hidden
                  initial={{ x: '-130%', opacity: 0.85 }}
                  animate={{ x: '220%', opacity: 0 }}
                  transition={{ duration: 0.95, ease: [0.22, 1, 0.36, 1] }}
                  className="pointer-events-none absolute inset-y-0 left-0 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/35 to-transparent"
                />
              </div>
            )}

            {message.isPinned && (
              <div className="mb-1 flex items-center gap-1 text-[9.5px] font-semibold uppercase tracking-wider text-[#22C55E]">
                <Pin className="h-3 w-3" />
                Pinned
              </div>
            )}

            {forwardedFrom && (
              <div
                className={`mb-2 flex items-center gap-2 rounded-xl border-l-2 px-2.5 py-1.5 text-[11.5px] ${
                  message.isMe
                    ? 'border-white/60 bg-black/15 text-white/90'
                    : 'border-[#22C55E] bg-black/5 text-emerald-900/80 dark:bg-white/5 dark:text-emerald-100/80'
                }`}
              >
                <Forward className="h-3.5 w-3.5 shrink-0 opacity-80" />
                <span className="min-w-0 truncate">
                  <span className="opacity-75">{t('msg.forwardedFrom')} </span>
                  <span className="font-semibold">{forwardedFrom}</span>
                </span>
              </div>
            )}
            {quoteLine && (
              <div
                className={`mb-2 rounded-xl border-l-2 px-2.5 py-1.5 text-[11.5px] ${
                  message.isMe
                    ? 'border-white/60 bg-black/15 text-white/90'
                    : 'border-[#22C55E] bg-black/5 text-emerald-900/80 dark:bg-white/5 dark:text-emerald-100/80'
                }`}
              >
                {quoteLine}
              </div>
            )}

            {isEditing ? (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest opacity-80">
                  <Pencil className="h-3 w-3" />
                  <span>Editing message</span>
                </div>
                <textarea
                  rows={Math.min(8, Math.max(2, editText.split('\n').length))}
                  value={editText}
                  autoFocus
                  onFocus={(e) => e.currentTarget.setSelectionRange(editText.length, editText.length)}
                  onChange={(e) => setEditText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') setIsEditing(false);
                    else if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      void handleSaveEdit();
                    }
                  }}
                  className="lem-scrollbar w-full min-w-[240px] resize-none rounded-xl border border-white/25 bg-black/25 px-3 py-2 text-[13px] leading-relaxed text-white outline-none transition placeholder:text-white/40 focus:border-white/60 focus:ring-2 focus:ring-white/20"
                />
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[10px] opacity-65">Enter to save · Esc to cancel</span>
                  <div className="flex gap-1.5 text-[11px]">
                    <button
                      onClick={() => setIsEditing(false)}
                      className="rounded-full bg-white/15 px-3 py-1 font-medium transition hover:bg-white/25"
                    >
                      {t('msg.cancel')}
                    </button>
                    <button
                      onClick={() => void handleSaveEdit()}
                      disabled={!editText.trim()}
                      className="rounded-full bg-white px-3.5 py-1 font-semibold text-emerald-900 shadow-sm transition hover:brightness-95 disabled:opacity-50"
                    >
                      {t('msg.save')}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              message.deletedAt ? (
                <p className="italic opacity-65">{t('msg.deleted')}</p>
              ) : bodyContent && (
                <p
                  className={`select-text whitespace-pre-wrap break-words ${
                    /^(?:\p{Extended_Pictographic}(?:️|‍|\p{Emoji_Modifier})*){1,3}$/u.test(
                      bodyContent.trim()
                    )
                      ? 'text-6xl leading-tight'
                      : ''
                  }`}
                >
                  {renderFormattedContent(bodyContent)}
                </p>
              )
            )}

            {message.interactive && !message.deletedAt && <InteractiveCard message={message} />}

            {message.codeBlock && (
              <div className="mt-2.5 overflow-hidden rounded-xl border border-white/15 bg-[#060C09]/85 text-xs text-emerald-100">
                <div className="flex items-center justify-between border-b border-white/10 px-3 py-1.5 text-[10px] text-emerald-300/80">
                  <span className="font-mono uppercase">{message.codeBlock.language}</span>
                  <button
                    onClick={handleCopyCode}
                    className="flex items-center gap-1 rounded px-1.5 py-0.5 transition hover:bg-white/10"
                  >
                    <Copy className="h-3 w-3" />
                    <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <pre className="lem-scrollbar overflow-x-auto p-3 font-mono text-[11.5px] leading-relaxed text-emerald-200">
                  <code>{message.codeBlock.code}</code>
                </pre>
              </div>
            )}

            {message.attachments && message.attachments.length > 0 && (
              <div className="mt-2.5 space-y-2">
                {message.attachments.map((att) => {
                  const mime = att.mimeLabel?.toLowerCase() ?? '';
                  const name = att.name.toLowerCase();
                  const isVideo = mime.startsWith('video/') || /\.(mp4|webm|mov|m4v)$/i.test(name);
                  const isAudio = mime.startsWith('audio/') || /\.(mp3|wav|m4a|ogg|webm)$/i.test(name);
                  return att.sticker && att.previewUrl ? (
                    <button
                      type="button"
                      key={att.id}
                      onClick={() => openAttachment(att)}
                      title={att.name}
                      className="block"
                    >
                      <img src={att.previewUrl} alt={att.name} className="h-36 w-36 object-contain" />
                    </button>
                  ) : att.previewUrl && isVideo ? (
                    <video
                      key={att.id}
                      src={att.previewUrl}
                      controls
                      preload="metadata"
                      className="max-h-72 w-full rounded-xl border border-white/20 bg-black"
                    />
                  ) : att.previewUrl && isAudio ? (
                    <audio
                      key={att.id}
                      src={att.previewUrl}
                      controls
                      preload="metadata"
                      className="w-full min-w-[220px]"
                    />
                  ) : att.type === 'image' && att.previewUrl ? (
                    <button
                      type="button"
                      key={att.id}
                      onClick={() => openAttachment(att)}
                      title={`Open ${att.name}`}
                      className="overflow-hidden rounded-xl border border-white/20 bg-black/20"
                    >
                      <img
                        src={att.previewUrl}
                        alt={att.name}
                        className="max-h-56 w-full object-cover"
                      />
                      <div className="flex items-center justify-between px-2.5 py-1.5 text-[11px] opacity-85">
                        <span className="truncate font-medium">{att.name}</span>
                        <span className="shrink-0 opacity-75">{att.size}</span>
                      </div>
                      </button>
                  ) : (
                    <button
                      key={att.id}
                      type="button"
                      onClick={() => openAttachment(att)}
                      disabled={!att.previewUrl}
                      title={`Open ${att.name}`}
                      className="flex items-center gap-2.5 rounded-xl border border-white/20 bg-black/15 px-3 py-2 text-xs transition hover:bg-black/25"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/25 text-emerald-200">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{att.name}</p>
                        <p className="text-[10px] opacity-70">
                          {att.mimeLabel ?? 'File'} · {att.size}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}

            <div
              className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${
                message.isMe
                  ? 'text-white/80'
                  : bubbleStyle === 'imessage-classic'
                    ? 'text-zinc-500 dark:text-zinc-400'
                    : 'text-emerald-900/50 dark:text-emerald-200/45'
              }`}
            >
              <span>{message.timestamp}</span>
              {(message.isEdited || message.editedAt) && !message.deletedAt && (
                <span className="opacity-75">edited</span>
              )}
              {message.isMe && (
                <span className="inline-flex items-center">
                  {message.status === 'read' ? (
                    <CheckCheck className="h-3.5 w-3.5 text-emerald-100" />
                  ) : (
                    <Check className="h-3.5 w-3.5 text-white/75" />
                  )}
                </span>
              )}
            </div>
          </div>

          {!message.isMe && actionToolbar}
        </div>

        {message.reactions.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1 px-1">
            {message.reactions.map((reaction) => (
              <motion.button
                key={reaction.emoji}
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                whileHover={{ scale: 1.12 }}
                whileTap={{ scale: 0.86 }}
                transition={{ type: 'spring', stiffness: 480, damping: 24 }}
                onClick={() =>
                  void toggleReaction(message.conversationId, message.id, reaction.emoji)
                }
                className={`glass-pill flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] transition-colors ${
                  reaction.reactedByMe
                    ? 'border-[#22C55E]/60 bg-[#22C55E]/20 font-semibold text-emerald-900 dark:text-emerald-200'
                    : 'text-emerald-900/75 dark:text-emerald-100/75'
                }`}
              >
                <span>{reaction.emoji}</span>
                <span>{reaction.count}</span>
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
});
