import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Paperclip, Smile, Send, X, FileText, Code2, Reply, Film, Mic, Video, Square, Search } from 'lucide-react';
import { useChatStore } from '../store/useChatStore';
import type { GifAttachment, StagedUpload } from '../types/chat';

const EMOJI_GRID = [
  '💚', '🚀', '✨', '🔥', '👍', '🎉', '⚡', '👀',
  '😄', '🙌', '💡', '✅', '🌿', '💎', '🛠️', '📦',
  '😂', '🤣', '😍', '🥳', '😎', '🤔', '😭', '😤',
  '👏', '🙏', '💯', '❤️', '💜', '💙', '🧡', '💛',
  '🌈', '☀️', '🌙', '🍕', '🍔', '🍩', '☕', '🎂',
  '🎁', '🏆', '🎮', '🎵', '💻', '🐶', '🐱', '🦄',
  '😊', '😇', '😉', '🥰', '😋', '🤩', '🥹', '😏',
  '😴', '🤯', '🥲', '😮', '😢', '🤗', '👋', '🫶',
  '🎊', '🎈', '🥂', '🍀', '🌸', '🦋', '🐼', '🐸',
  '😆', '😅', '😂', '🤣', '😜', '🤪', '🫠', '🥸',
  '😌', '😔', '😐', '😑', '😬', '😳', '🥵', '🥶',
  '🤠', '🤡', '👻', '👽', '🤖', '👑', '💍', '🎩',
  '🦊', '🐯', '🦁', '🐵', '🐨', '🐻', '🐙', '🦑',
  '🌻', '🌺', '🌊', '🏖️', '⛰️', '🌍', '🪐', '⭐',
  '🫡', '🫣', '🫨', '🫢', '🫠', '🫥', '🫤', '🫶',
  '🫀', '🫁', '🧠', '🦾', '🦿', '🦄', '🪽', '🐝',
  '🥨', '🥯', '🧇', '🧋', '🧃', '🧉', '🥥', '🫒',
  '🪩', '🪄', '🪅', '🪆', '🪞', '🪟', '🪺', '🪴',
  '🛼', '🛹', '🛸', '🚁', '🚀', '🧑‍🚀', '🧚', '🧙',
  '🥺', '😈', '👿', '💀', '☠️', '👹', '👺', '👾',
  '👻', '🤝', '🫱', '🫲', '🫳', '🫴', '👊', '✊',
  '🤌', '🤏', '🤟', '🫰', '🫵', '🤙', '🖖', '✌️',
  '💪', '🦵', '🦶', '👂', '👃', '🧑', '👩', '👨',
  '👶', '👵', '🧓', '🧑‍💻', '🧑‍🎨', '🧑‍🚒', '🧑‍⚕️', '🧑‍🍳',
  '🪐', '🌠', '🌌', '🌅', '🌄', '🌁', '🏔️', '🌋',
  '🌲', '🌳', '🍁', '🍂', '🍃', '🌹', '🌷', '🌼',
  '🍎', '🍊', '🍋', '🍉', '🍓', '🫐', '🥑', '🥕',
  '🌽', '🥦', '🥬', '🥚', '🥞', '🥐', '🍝', '🍣',
  '🍜', '🍱', '🍦', '🍨', '🍪', '🍰', '🧁', '🍫',
  '🍿', '🧂', '🥤', '🍺', '🍻', '🥃', '🍾', '🧋',
  '🎸', '🎹', '🎺', '🎷', '🥁', '🎤', '🎧', '🎙️',
  '⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏓', '🏸',
  '🥋', '🥊', '🎯', '🎳', '🎣', '🪁', '🎲', '🧩',
];

const GIF_GRID: GifAttachment[] = [
  { name: 'Cat blinking', url: 'https://upload.wikimedia.org/wikipedia/commons/a/a7/Cat_blinking.gif' },
  { name: 'Cat paws kneading', url: 'https://upload.wikimedia.org/wikipedia/commons/1/12/Cat_paws_kneading.gif' },
  { name: 'Cartoon cat running', url: 'https://upload.wikimedia.org/wikipedia/commons/7/74/Cartoon_Cat_Running.gif' },
  { name: 'Black cat', url: 'https://upload.wikimedia.org/wikipedia/commons/3/31/Black_Cat_1220032.gif' },
  { name: 'Cat falling', url: 'https://upload.wikimedia.org/wikipedia/commons/7/78/Cat_fall_150x300_6fps.gif' },
  { name: 'Orange cat behavior', url: 'https://upload.wikimedia.org/wikipedia/commons/1/1f/Typical_orange_cat_behavior..gif' },
  { name: 'Cat trotting to gallop', url: 'https://upload.wikimedia.org/wikipedia/commons/0/05/Cat_trotting%2C_changing_to_a_gallop.gif' },
  { name: 'Cat tail animation', url: 'https://upload.wikimedia.org/wikipedia/commons/b/b2/Cat_tail_ani.gif' },
  { name: 'Cat on laptop', url: 'https://upload.wikimedia.org/wikipedia/commons/d/d6/Cat_Laptop_-_Idil_Keysan_-_Wikimedia_Giphy_stickers_2019.gif' },
  { name: 'Funny cat', url: 'https://upload.wikimedia.org/wikipedia/commons/8/81/Cat_funny_gif.gif' },
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
  const [showGif, setShowGif] = useState(false);
  const [selectedGif, setSelectedGif] = useState<GifAttachment | null>(null);
  const [gifQuery, setGifQuery] = useState('');
  const [gifSearchResults, setGifSearchResults] = useState<GifAttachment[]>([]);
  const [gifSearchLoading, setGifSearchLoading] = useState(false);
  const [brokenGifUrls, setBrokenGifUrls] = useState<Set<string>>(new Set());
  const [showCodeEditor, setShowCodeEditor] = useState(false);
  const [codeLang, setCodeLang] = useState('typescript');
  const [codeText, setCodeText] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendPulseKey, setSendPulseKey] = useState(0);
  const [stagedUploads, setStagedUploads] = useState<StagedUpload[]>([]);
  const [recordingMode, setRecordingMode] = useState<'audio' | 'video' | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const lastTypingSentRef = useRef<number>(0);

  const sendMessage = useChatStore((s) => s.sendMessage);
  const broadcastTyping = useChatStore((s) => s.broadcastTyping);
  const replyingTo = useChatStore((s) => s.replyingTo);
  const setReplyingTo = useChatStore((s) => s.setReplyingTo);

  useEffect(() => {
    if (!showGif) return;

    const searchText = gifQuery.trim();
    const timer = window.setTimeout(async () => {
      setGifSearchLoading(true);
      const searchTerm = searchText ? `${searchText} gif` : 'animated reaction gif';
      const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(searchTerm)}&gsrnamespace=6&gsrlimit=50&prop=imageinfo&iiprop=url&format=json&origin=*`;

      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`GIF search failed (${response.status})`);
        const data = await response.json();
        const pages = data?.query?.pages ? Object.values(data.query.pages) as Array<{
          title: string;
          imageinfo?: Array<{ url?: string }>;
        }> : [];
        const gifs = pages
          .map((page) => {
            const rawUrl = page.imageinfo?.[0]?.url;
            if (!rawUrl || !rawUrl.toLowerCase().split('?')[0].endsWith('.gif')) return null;
            const name = page.title
              .replace(/^File:/, '')
              .replace(/\.gif$/i, '')
              .replace(/_/g, ' ')
              .replace(/\s+/g, ' ')
              .trim();
            return name ? { name, url: rawUrl } : null;
          })
          .filter((gif): gif is GifAttachment => gif !== null);
        setGifSearchResults(gifs);
      } catch {
        setGifSearchResults([]);
      } finally {
        setGifSearchLoading(false);
      }
    }, 250);

    return () => window.clearTimeout(timer);
  }, [gifQuery, showGif]);

  const visibleGifs = useMemo(() => {
    if (gifQuery.trim()) {
      const localMatches = GIF_GRID.filter((gif) =>
        gif.name.toLowerCase().includes(gifQuery.trim().toLowerCase())
      );
      return [...gifSearchResults, ...localMatches].filter((gif, index, gifs) =>
        gifs.findIndex((candidate) => candidate.url === gif.url) === index
      );
    }
    return gifSearchResults.length > 0 ? gifSearchResults : GIF_GRID;
  }, [gifQuery, gifSearchResults]);

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
    if (text.trim() === '/clear') {
      setText('');
      setStagedUploads([]);
      setCodeText('');
      setShowCodeEditor(false);
      setSelectedGif(null);
      return;
    }
    const hasCode = showCodeEditor && codeText.trim().length > 0;
    if (!text.trim() && stagedUploads.length === 0 && !hasCode && !selectedGif) return;
    const outgoingText = text.trim() === '/shrug'
      ? '¯\\_(ツ)_/¯'
      : text.trim().startsWith('/shrug ')
        ? `¯\\_(ツ)_/¯ ${text.trim().slice(7)}`
        : text;

    setSending(true);
    setSendError(null);
    setSendPulseKey((k) => k + 1);
    try {
      await sendMessage(
        outgoingText,
        stagedUploads.length > 0 ? stagedUploads : undefined,
        hasCode ? { language: codeLang, code: codeText } : undefined,
        selectedGif ?? undefined
      );

      setText('');
      setStagedUploads([]);
      setCodeText('');
      setShowCodeEditor(false);
      setShowEmoji(false);
      setShowGif(false);
      setSelectedGif(null);
      setGifQuery('');

      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (error) {
      setSendError(
        error instanceof Error ? error.message : 'The message could not be sent. Please try again.'
      );
    } finally {
      setSending(false);
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

  const startRecording = async (mode: 'audio' | 'video') => {
    if (!navigator.mediaDevices?.getUserMedia) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: mode === 'video',
      });
      mediaStreamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      recorder.onstop = () => {
        const type = mode === 'video' ? 'video/webm' : 'audio/webm';
        const blob = new Blob(chunks, { type });
        const extension = mode === 'video' ? 'webm' : 'webm';
        const file = new File([blob], `${mode}-recording.${extension}`, { type });
        const sizeKb = file.size / 1024;
        setStagedUploads((prev) => [
          ...prev,
          {
            id: `recording-${Date.now()}`,
            file,
            name: file.name,
            type: mode === 'video' ? 'file' : 'file',
            size: sizeKb > 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(sizeKb))} KB`,
            mimeLabel: type,
          },
        ]);
        stream.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecordingMode(mode);
    } catch (error) {
      console.error('[SkellyTalk] Recording failed:', error);
    }
  };

  const stopRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') recorder.stop();
    mediaRecorderRef.current = null;
    setRecordingMode(null);
  };

  const canSend =
    !sending &&
    (text.trim().length > 0 ||
      stagedUploads.length > 0 ||
      (showCodeEditor && codeText.trim().length > 0) ||
      selectedGif !== null);

  return (
    <div className="relative px-2.5 pb-2.5 pt-1.5 md:px-4 md:pb-4 md:pt-2">
      <AnimatePresence>
        {sendError && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            role="alert"
            className="mb-2 flex items-center justify-between gap-2 rounded-xl border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-xs text-rose-700 dark:text-rose-200"
          >
            <span className="min-w-0">{sendError}</span>
            <button
              type="button"
              onClick={() => setSendError(null)}
              className="shrink-0 rounded-full p-1 hover:bg-rose-500/10"
              aria-label="Dismiss send error"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

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

      <AnimatePresence>
        {selectedGif && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="mb-2 flex items-center gap-2 px-2"
          >
            <div className="glass-panel glass-pill flex items-center gap-2 rounded-2xl px-2.5 py-1.5 text-xs text-emerald-950 dark:text-emerald-100">
              <img src={selectedGif.url} alt={selectedGif.name} className="h-9 w-12 rounded-lg object-cover" />
              <span className="font-medium">{selectedGif.name}</span>
              <button
                onClick={() => setSelectedGif(null)}
                className="rounded-full p-0.5 hover:bg-black/10 dark:hover:bg-white/10"
                title="Remove GIF"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
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
            className="glass-panel glass-surface absolute bottom-20 left-2 right-2 z-30 grid max-h-64 grid-cols-6 gap-1.5 overflow-y-auto rounded-2xl p-2.5 sm:left-auto sm:right-16 sm:grid-cols-8"
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

      <AnimatePresence>
        {showGif && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 420, damping: 28 }}
            className="glass-panel glass-surface absolute bottom-20 left-2 right-2 z-30 rounded-2xl p-2.5 sm:left-auto sm:right-4 sm:w-[320px]"
          >
            <div className="relative mb-2">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-emerald-900/50 dark:text-emerald-100/50" />
              <input
                type="search"
                value={gifQuery}
                onChange={(event) => setGifQuery(event.target.value)}
                placeholder="Search GIFs..."
                aria-label="Search GIFs"
                className="w-full rounded-xl border border-white/10 bg-black/10 py-2 pl-8 pr-3 text-xs text-emerald-950 outline-none placeholder:text-emerald-900/45 focus:border-emerald-400/60 dark:bg-white/10 dark:text-emerald-100 dark:placeholder:text-emerald-100/45"
                autoFocus
              />
            </div>
            {gifSearchLoading && gifSearchResults.length === 0 && (
              <div className="py-6 text-center text-[11px] text-emerald-900/55 dark:text-emerald-100/55">
                Searching GIFs...
              </div>
            )}
            <div className="lem-scrollbar grid max-h-64 grid-cols-2 gap-2 overflow-y-auto pr-1">
              {visibleGifs
                .filter((gif) => !brokenGifUrls.has(gif.url))
                .map((gif) => (
                  <button
                    key={gif.url}
                    onClick={() => {
                      setSelectedGif(gif);
                      setShowGif(false);
                      textareaRef.current?.focus();
                    }}
                    className="group overflow-hidden rounded-xl border border-white/10 bg-black/10 text-left transition hover:scale-[1.03] hover:border-emerald-400/60"
                    title={`Use ${gif.name} GIF`}
                  >
                    <img
                      src={gif.url}
                      alt={gif.name}
                      className="h-20 w-full object-cover"
                      loading="lazy"
                      onError={() => setBrokenGifUrls((current) => new Set(current).add(gif.url))}
                    />
                    <span className="block truncate px-2 py-1 text-[10px] text-emerald-900/70 dark:text-emerald-100/70">
                      {gif.name}
                    </span>
                  </button>
                ))}
            </div>
            {!gifSearchLoading && visibleGifs.filter((gif) => !brokenGifUrls.has(gif.url)).length === 0 && (
              <div className="py-6 text-center text-[11px] text-emerald-900/55 dark:text-emerald-100/55">
                No GIFs found. Try another search.
              </div>
            )}
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
        className="glass-panel glass-surface relative flex items-end gap-1 overflow-hidden rounded-[26px] px-2 py-1.5 transition focus-within:border-[#22C55E]/55 focus-within:ring-2 focus-within:ring-[#22C55E]/20 md:gap-1.5 md:px-3 md:py-2"
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
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-emerald-800/70 transition hover:bg-emerald-500/15 hover:text-emerald-600 md:h-9 md:w-9 dark:text-emerald-200/70 dark:hover:text-emerald-300"
        >
          <Paperclip className="h-4 w-4" />
        </button>

        <button
          onClick={() => setShowCodeEditor((v) => !v)}
          title="Attach code snippet"
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition md:h-9 md:w-9 ${
            showCodeEditor
              ? 'bg-emerald-500/20 text-[#22C55E]'
              : 'text-emerald-800/70 hover:bg-emerald-500/15 hover:text-emerald-600 dark:text-emerald-200/70 dark:hover:text-emerald-300'
          }`}
        >
          <Code2 className="h-4 w-4" />
        </button>

        {recordingMode ? (
          <button
            onClick={stopRecording}
            title={`Stop ${recordingMode} recording`}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose-500/20 text-rose-500 md:h-9 md:w-9"
          >
            <Square className="h-3.5 w-3.5 fill-current" />
          </button>
        ) : (
          <>
            <button
              onClick={() => void startRecording('audio')}
              title="Record audio"
              className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-full text-emerald-800/70 transition hover:bg-emerald-500/15 hover:text-emerald-600 sm:flex md:h-9 md:w-9 dark:text-emerald-200/70"
            >
              <Mic className="h-4 w-4" />
            </button>
            <button
              onClick={() => void startRecording('video')}
              title="Record video"
              className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-full text-emerald-800/70 transition hover:bg-emerald-500/15 hover:text-emerald-600 sm:flex md:h-9 md:w-9 dark:text-emerald-200/70"
            >
              <Video className="h-4 w-4" />
            </button>
          </>
        )}

        <textarea
          ref={textareaRef}
          rows={1}
          maxLength={4000}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            resizeTextarea();
            handleTypingPing(e.target.value);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="lem-scrollbar max-h-[130px] min-h-[24px] min-w-0 flex-1 resize-none bg-transparent py-1.5 text-[13.5px] leading-relaxed text-emerald-950 placeholder-emerald-800/45 outline-none dark:text-white dark:placeholder-emerald-100/40"
        />

        <button
          onClick={() => setShowEmoji((v) => !v)}
          title="Insert emoji"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-emerald-800/70 transition hover:bg-emerald-500/15 hover:text-emerald-600 md:h-9 md:w-9 dark:text-emerald-200/70 dark:hover:text-emerald-300"
        >
          <Smile className="h-4 w-4" />
        </button>

        <button
          onClick={() => setShowGif((v) => !v)}
          title="Choose a GIF"
          className={`hidden h-8 w-8 shrink-0 items-center justify-center rounded-full transition sm:flex md:h-9 md:w-9 ${
            showGif
              ? 'bg-emerald-500/20 text-[#22C55E]'
              : 'text-emerald-800/70 hover:bg-emerald-500/15 hover:text-emerald-600 dark:text-emerald-200/70 dark:hover:text-emerald-300'
          }`}
        >
          <Film className="h-4 w-4" />
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
            className={`relative flex h-8 w-8 items-center justify-center rounded-full transition-all md:h-9 md:w-9 ${
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
