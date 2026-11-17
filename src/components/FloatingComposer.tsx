import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Paperclip, Smile, Send, X, FileText, Code2, Reply } from 'lucide-react';
import { useChatStore } from '../store/useChatStore';
import type { StagedUpload } from '../types/chat';

const EMOJI_GRID = [
  '💚', '🚀', '✨', '🔥', '👍', '🎉', '⚡', '👀',
  '😄', '🙌', '💡', '✅', '🌿', '💎', '🛠️', '📦',
];

interface FloatingComposerProps {
  conversationId: string;
  placeholder: string;
}

export const FloatingComposer: React.FC<FloatingComposerProps> = ({
  conversationId,
  placeholder,
}) => {
  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [showCodeEditor, setShowCodeEditor] = useState(false);
  const [codeLang, setCodeLang] = useState('typescript');
  const [codeText, setCodeText] = useState('');
  const [sending, setSending] = useState(false);
  const [sendPulseKey, setSendPulseKey] = useState(0);
  const [stagedUploads, setStagedUploads] = useState<StagedUpload[]>([]);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const lastTypingSentRef = useRef<number>(0);

  const sendMessage = useChatStore((s) => s.sendMessage);
  const broadcastTyping = useChatStore((s) => s.broadcastTyping);
  const replyingTo = useChatStore((s) => s.replyingTo);
  const setReplyingTo = useChatStore((s) => s.setReplyingTo);

  const resizeTextarea = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 130)}px`;
  };

  const handleTypingPing = (value: string) => {
    const now = Date.now();
    if (value.trim() && now - lastTypingSentRef.current > 1800) {
      lastTypingSentRef.current = now;
      broadcastTyping(conversationId, true);
    } else if (!value.trim()) {
      broadcastTyping(conversationId, false);
    }
  };

  const handleSend = async () => {
    if (sending) return;
    const hasCode = showCodeEditor && codeText.trim().length > 0;
    if (!text.trim() && stagedUploads.length === 0 && !hasCode) return;

    setSending(true);
    setSendPulseKey((k) => k + 1);
    await sendMessage(
      text,
      stagedUploads.length > 0 ? stagedUploads : undefined,
      hasCode ? { language: codeLang, code: codeText } : undefined
    );

    setText('');
    setStagedUploads([]);
    setCodeText('');
    setShowCodeEditor(false);
    setShowEmoji(false);
    setSending(false);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const isImage = file.type.startsWith('image/');
      const sizeKb = file.size / 1024;
      const sizeLabel =
        sizeKb > 1024
          ? `${(sizeKb / 1024).toFixed(1)} MB`
          : `${Math.max(1, Math.round(sizeKb))} KB`;

      if (isImage) {
        const previewUrl = URL.createObjectURL(file);
        setStagedUploads((prev) => [
          ...prev,
          {
            id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            file,
            name: file.name,
            type: 'image',
            size: sizeLabel,
            previewUrl,
          },
        ]);
      } else {
        setStagedUploads((prev) => [
          ...prev,
          {
            id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            file,
            name: file.name,
            type: 'file',
            size: sizeLabel,
            mimeLabel: file.type || 'Document',
          },
        ]);
      }
    });

    e.target.value = '';
  };

  const canSend =
    !sending &&
    (text.trim().length > 0 ||
      stagedUploads.length > 0 ||
      (showCodeEditor && codeText.trim().length > 0));

  return (
    <div className="relative px-4 pb-4 pt-2">
      {/* Reply Quote Preview */}
      <AnimatePresence>
        {replyingTo && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 420, damping: 28 }}
            className="glass-panel glass-pill mb-2 flex items-center justify-between gap-2 rounded-2xl border-l-2 border-l-[#22C55E] px-3 py-2 text-xs"
          >
            <div className="flex min-w-0 items-center gap-2">
              <Reply className="h-3.5 w-3.5 shrink-0 text-[#22C55E]" />
              <div className="min-w-0">
                <span className="font-semibold text-emerald-950 dark:text-white">
                  Replying to {replyingTo.senderName}
                </span>
                <p className="truncate text-[11px] text-emerald-800/70 dark:text-emerald-200/65">
                  {replyingTo.content || 'Attachment'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setReplyingTo(null)}
              className="rounded-full p-1 text-emerald-900/60 hover:bg-black/5 dark:text-white/60 dark:hover:bg-white/10"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Staged Attachments Preview */}
      <AnimatePresence>
        {stagedUploads.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="mb-2 flex flex-wrap gap-2 px-2"
          >
            {stagedUploads.map((att) => (
              <div
                key={att.id}
                className="glass-panel glass-pill flex items-center gap-2 rounded-2xl px-2.5 py-1.5 text-xs text-emerald-950 dark:text-emerald-100"
              >
                {att.type === 'image' && att.previewUrl ? (
                  <img
                    src={att.previewUrl}
                    alt={att.name}
                    className="h-7 w-7 rounded-lg object-cover"
                  />
                ) : (
                  <FileText className="h-4 w-4 text-[#22C55E]" />
                )}
                <span className="max-w-[140px] truncate font-medium">{att.name}</span>
                <button
                  onClick={() =>
                    setStagedUploads((prev) => prev.filter((a) => a.id !== att.id))
                  }
                  className="rounded-full p-0.5 hover:bg-black/10 dark:hover:bg-white/10"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Optional Code Block Input */}
      <AnimatePresence>
        {showCodeEditor && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="glass-panel glass-surface mb-2 overflow-hidden rounded-2xl p-3"
          >
            <div className="mb-2 flex items-center justify-between">
              <input
                type="text"
                value={codeLang}
                onChange={(e) => setCodeLang(e.target.value)}
                placeholder="language (e.g. typescript)"
                className="w-36 rounded-lg bg-black/10 px-2 py-1 font-mono text-[11px] text-emerald-950 outline-none dark:bg-white/10 dark:text-emerald-200"
              />
              <button
                onClick={() => setShowCodeEditor(false)}
                className="rounded-full p-1 text-emerald-900/60 hover:bg-black/5 dark:text-white/60 dark:hover:bg-white/10"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <textarea
              rows={3}
              value={codeText}
              onChange={(e) => setCodeText(e.target.value)}
              placeholder="Paste code snippet..."
              className="lem-scrollbar w-full resize-none rounded-xl bg-black/20 p-2.5 font-mono text-xs text-emerald-100 placeholder-emerald-200/40 outline-none"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Emoji Picker Popover */}
      <AnimatePresence>
        {showEmoji && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 420, damping: 28 }}
            className="glass-panel glass-surface absolute bottom-20 right-16 z-30 grid grid-cols-4 gap-1.5 rounded-2xl p-2.5"
          >
            {EMOJI_GRID.map((emoji) => (
              <button
                key={emoji}
                onClick={() => {
                  setText((prev) => prev + emoji);
                  setShowEmoji(false);
                  textareaRef.current?.focus();
                }}
                className="flex h-8 w-8 items-center justify-center rounded-xl text-base transition hover:scale-115 hover:bg-emerald-500/20"
              >
                {emoji}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pill-shaped Floating Glass Composer */}
      <motion.div
        animate={
          sendPulseKey > 0
            ? { scale: [1, 0.992, 1] }
            : undefined
        }
        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
        className="glass-panel glass-surface relative flex items-end gap-1.5 overflow-hidden rounded-[26px] px-3 py-2 transition focus-within:border-[#22C55E]/55 focus-within:ring-2 focus-within:ring-[#22C55E]/20"
      >
        {/* Liquid Glass Send Sweep across composer */}
        {sendPulseKey > 0 && (
          <motion.span
            key={`sweep-${sendPulseKey}`}
            aria-hidden
            initial={{ x: '-100%', opacity: 0.7 }}
            animate={{ x: '200%', opacity: 0 }}
            transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-none absolute inset-y-0 left-0 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-[#22C55E]/25 to-transparent"
          />
        )}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          title="Attach file or image (uploads to Supabase Storage)"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-emerald-800/70 transition hover:bg-emerald-500/15 hover:text-emerald-600 dark:text-emerald-200/70 dark:hover:text-emerald-300"
        >
          <Paperclip className="h-4 w-4" />
        </button>

        <button
          onClick={() => setShowCodeEditor((v) => !v)}
          title="Attach code snippet"
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition ${
            showCodeEditor
              ? 'bg-emerald-500/20 text-[#22C55E]'
              : 'text-emerald-800/70 hover:bg-emerald-500/15 hover:text-emerald-600 dark:text-emerald-200/70 dark:hover:text-emerald-300'
          }`}
        >
          <Code2 className="h-4 w-4" />
        </button>

        <textarea
          ref={textareaRef}
          rows={1}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            resizeTextarea();
            handleTypingPing(e.target.value);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="lem-scrollbar max-h-[130px] min-h-[24px] flex-1 resize-none bg-transparent py-1.5 text-[13.5px] leading-relaxed text-emerald-950 placeholder-emerald-800/45 outline-none dark:text-white dark:placeholder-emerald-100/40"
        />

        <button
          onClick={() => setShowEmoji((v) => !v)}
          title="Insert emoji"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-emerald-800/70 transition hover:bg-emerald-500/15 hover:text-emerald-600 dark:text-emerald-200/70 dark:hover:text-emerald-300"
        >
          <Smile className="h-4 w-4" />
        </button>

        <div className="relative shrink-0">
          {sendPulseKey > 0 && (
            <motion.span
              key={`ripple-${sendPulseKey}`}
              aria-hidden
              initial={{ scale: 0.85, opacity: 0.85 }}
              animate={{ scale: 2.1, opacity: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="pointer-events-none absolute inset-0 rounded-full border border-[#22C55E]"
            />
          )}
          <motion.button
            whileHover={canSend ? { scale: 1.07 } : undefined}
            whileTap={canSend ? { scale: 0.86 } : undefined}
            onClick={() => void handleSend()}
            disabled={!canSend}
            title="Send message"
            className={`relative flex h-9 w-9 items-center justify-center rounded-full transition-all ${
              canSend
                ? 'bg-gradient-to-br from-[#22C55E] to-[#10B981] text-white shadow-lem-glow hover:brightness-110'
                : 'bg-black/5 text-emerald-900/30 dark:bg-white/10 dark:text-white/25'
            }`}
          >
            <Send className="h-4 w-4 translate-x-[0.5px]" />
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
};
