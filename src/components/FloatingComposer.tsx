import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Paperclip, Smile, Send, X, FileText, Code2, Reply, Film, Mic, Video, Square, BarChart3, Gamepad2, Plus, Hourglass, ChevronUp, Sticker as StickerIcon, Trash2 } from 'lucide-react';
import { useChatStore } from '../store/useChatStore';
import { useStickerPacks, stickerToFile, type Sticker } from '../store/useStickerPacks';
import { StickerCropper } from './StickerCropper';
import { LiquidGlassLayer } from './LiquidGlassLayer';
import type { GifAttachment, StagedUpload } from '../types/chat';
import { VOICE_FILTERS, applyVoiceFilter, type VoiceFilterId } from '../utils/voiceFilters';

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
  { name: 'Celebration', url: 'https://media.giphy.com/media/g9582DNuQppxC/giphy.gif' },
  { name: 'Happy dance', url: 'https://media.giphy.com/media/111ebonMs90YLu/giphy.gif' },
  { name: 'Mind blown', url: 'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif' },
  { name: 'Thumbs up', url: 'https://media.giphy.com/media/5GoVLqeAOo6PK/giphy.gif' },
  { name: 'High five', url: 'https://media.giphy.com/media/3oKIPwoeGErMmaI43S/giphy.gif' },
  { name: 'Cat hello', url: 'https://media.giphy.com/media/ICOgUNjpvO0PC/giphy.gif' },
  { name: 'Party', url: 'https://media.giphy.com/media/26BRrSvJUa0crqw4E/giphy.gif' },
  { name: 'Laughing', url: 'https://media.giphy.com/media/10tIjpzIu8fe0/giphy.gif' },
  { name: 'Clapping', url: 'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif' },
  { name: 'Dancing', url: 'https://media.giphy.com/media/l0HlvtIPzPdt2usKs/giphy.gif' },
  { name: 'Excited', url: 'https://media.giphy.com/media/3NtY188QaxDdC/giphy.gif' },
  { name: 'Woohoo', url: 'https://media.giphy.com/media/26tPplGWjN0xLybiU/giphy.gif' },
  { name: 'Amazing', url: 'https://media.giphy.com/media/26u4cqiYI30juCOGY/giphy.gif' },
  { name: 'So funny', url: 'https://media.giphy.com/media/26gsjCZpPolPr3sBy/giphy.gif' },
  { name: 'Dance party', url: 'https://media.giphy.com/media/GeimqsH0TLDt4tScGw/giphy.gif' },
  { name: 'Celebrate', url: 'https://media.giphy.com/media/g5R9dok94mrIvplmZd/giphy.gif' },
  { name: 'Hello', url: 'https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif' },
  { name: 'Success', url: 'https://media.giphy.com/media/XreQmk7ETCak0/giphy.gif' },
  { name: 'Great job', url: 'https://media.giphy.com/media/3o7abB06u9bNzA8lu8/giphy.gif' },
  { name: 'Slow clap', url: 'https://media.giphy.com/media/xT9IgG50Fb7Mi0prBC/giphy.gif' },
  { name: 'No way', url: 'https://media.giphy.com/media/3ohzdIuqJoo8QdKlnW/giphy.gif' },
  { name: 'Nodding', url: 'https://media.giphy.com/media/KmTnUKop0AfFm/giphy.gif' },
  { name: 'Let it out', url: 'https://media.giphy.com/media/ROF8OQvDmxytW/giphy.gif' },
  { name: 'You got this', url: 'https://media.giphy.com/media/3o6Zt6KHxJTbXCnSvu/giphy.gif' },
  { name: 'Facepalm', url: 'https://media.giphy.com/media/5ZhDfrDqEVmz6/giphy.gif' },
  { name: 'Surprise', url: 'https://media.giphy.com/media/gnJgBlackNBFSM/giphy.gif' },
  { name: 'Proud', url: 'https://media.giphy.com/media/l0HlBO7eyXzSZkJri/giphy.gif' },
  { name: 'On fire', url: 'https://media.giphy.com/media/Is1O1TWV0LEJi/giphy.gif' },
  { name: 'Working', url: 'https://media.giphy.com/media/3oKIPEqDGUULpEU0aQ/giphy.gif' },
  { name: 'Sleepy', url: 'https://media.giphy.com/media/Sgqi6MxpOe95A1sQeG/giphy.gif' },
  { name: 'Cheering', url: 'https://media.giphy.com/media/3o6Zt481isNVuQI1l6/giphy.gif' },
  { name: 'Confetti', url: 'https://media.giphy.com/media/26BRv0ThflsHCqDrG/giphy.gif' },
  { name: 'Big brain', url: 'https://media.giphy.com/media/ANbD1CCdA3iI8/giphy.gif' },
  { name: 'Okay', url: 'https://media.giphy.com/media/26uf0Y1JrI4oQ9g2I/giphy.gif' },
  { name: 'Welcome', url: 'https://media.giphy.com/media/xT0xeJpnrWC4XWblEk/giphy.gif' },
  { name: 'Nice', url: 'https://media.giphy.com/media/3ohhweiVB36rAlqVCE/giphy.gif' },
  { name: 'Good luck', url: 'https://media.giphy.com/media/kaq6GnxDlJaBq/giphy.gif' },
  { name: 'Deal with it', url: 'https://media.giphy.com/media/8dYWw3qK0iDzc/giphy.gif' },
  { name: 'Mic drop', url: 'https://media.giphy.com/media/l3q2K5jinAlChoCLS/giphy.gif' },
  { name: 'Applause', url: 'https://media.giphy.com/media/xT1XGRooUTkI7VbqUw/giphy.gif' },
  { name: 'Shocked', url: 'https://media.giphy.com/media/3o7btQqUmQq9Il7Ydm/giphy.gif' },
  { name: 'Thumbsup', url: 'https://media.giphy.com/media/111ebonMs90YLu/giphy.gif' },
  { name: 'Friday', url: 'https://media.giphy.com/media/5Yj4d8Q7dQYzS/giphy.gif' },
  { name: 'Hype', url: 'https://media.giphy.com/media/ckFQ45X5sAmgE/giphy.gif' },
  { name: 'Rock on', url: 'https://media.giphy.com/media/YoTZxxE8zdxhw/giphy.gif' },
  { name: 'High energy', url: 'https://media.giphy.com/media/26tOZ42Mg6pbTUPHW/giphy.gif' },
  { name: 'Victory', url: 'https://media.giphy.com/media/3o6Zt0hNC4DYlzYRUs/giphy.gif' },
  { name: 'Love it', url: 'https://media.giphy.com/media/xT5LMA7fi6v3oGZbKU/giphy.gif' },
  { name: 'Cool', url: 'https://media.giphy.com/media/3oEduXH4VwGMl6t27C/giphy.gif' },
  { name: 'Wink', url: 'https://media.giphy.com/media/1n90bclnAjUrvKYj4r/giphy.gif' },
  { name: 'Congrats', url: 'https://media.giphy.com/media/g9582DNuQppxC/giphy.gif' },
  { name: 'Morning', url: 'https://media.giphy.com/media/3oEdv2U3D8h6nV7WZa/giphy.gif' },
  { name: 'Goodnight', url: 'https://media.giphy.com/media/ANbD1CCdA3iI8/giphy.gif' },
];

const toLocalInput = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

const capsulePresets = () => {
  const now = new Date();
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 9, 0);
  const week = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7, 9, 0);
  const newYear = new Date(now.getFullYear() + 1, 0, 1, 0, 0);
  return [
    { label: 'Tomorrow 9am', date: tomorrow },
    { label: 'In a week', date: week },
    { label: `New Year ${now.getFullYear() + 1}`, date: newYear },
  ];
};

interface FloatingComposerProps {
  conversationId: string;
  placeholder: string;
}

export const FloatingComposer: React.FC<FloatingComposerProps> = React.memo(({
  conversationId,
  placeholder,
}) => {
  const [text, setText] = useState('');
  const [jumboEmoji, setJumboEmoji] = useState(false);
  const [showCropper, setShowCropper] = useState(false);
  const [activePackId, setActivePackId] = useState<string | null>(null);
  const stickerPacks = useStickerPacks((s) => s.packs);
  const deletePack = useStickerPacks((s) => s.deletePack);
  const removeSticker = useStickerPacks((s) => s.removeSticker);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [selectedGif, setSelectedGif] = useState<GifAttachment | null>(null);
  const [showCodeEditor, setShowCodeEditor] = useState(false);
  const [codeLang, setCodeLang] = useState('typescript');
  const [codeText, setCodeText] = useState('');
  const [capsuleOpen, setCapsuleOpen] = useState(false);
  const [capsuleAt, setCapsuleAt] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendPulseKey, setSendPulseKey] = useState(0);
  const [stagedUploads, setStagedUploads] = useState<StagedUpload[]>([]);
  const [recordingMode, setRecordingMode] = useState<'audio' | 'video' | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [voiceFilter, setVoiceFilterState] = useState<VoiceFilterId>(() => {
    try {
      const saved = localStorage.getItem('lemchat-voice-filter') as VoiceFilterId | null;
      return VOICE_FILTERS.some((f) => f.id === saved) ? (saved as VoiceFilterId) : 'none';
    } catch {
      return 'none';
    }
  });
  const [processingVoice, setProcessingVoice] = useState(false);

  const activeComposerPopup = useChatStore((s) =>
    s.activePopupId?.startsWith('composer:') ? s.activePopupId : null
  );
  const setActivePopupId = useChatStore((s) => s.setActivePopupId);
  const togglePopup = useChatStore((s) => s.togglePopup);

  const showEmoji = activeComposerPopup === 'composer:emoji';
  const showGif = activeComposerPopup === 'composer:gif';
  const showStickers = activeComposerPopup === 'composer:stickers';
  const showPoll = activeComposerPopup === 'composer:poll';
  const showSendMenu = activeComposerPopup === 'composer:sendMenu';
  const showVoiceFilters = activeComposerPopup === 'composer:voiceFilters';

  const setVoiceFilter = (id: VoiceFilterId) => {
    setVoiceFilterState(id);
    setActivePopupId(null);
    try {
      localStorage.setItem('lemchat-voice-filter', id);
    } catch {
      /* ignore */
    }
  };
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const [liveStream, setLiveStream] = useState<MediaStream | null>(null);
  const [pendingRecording, setPendingRecording] = useState<{
    file: File;
    url: string;
    mode: 'audio' | 'video';
    size: string;
    mimeLabel: string;
  } | null>(null);
  const liveVideoRef = useRef<HTMLVideoElement | null>(null);

  React.useEffect(() => {
    if (liveVideoRef.current) liveVideoRef.current.srcObject = liveStream;
  }, [liveStream]);

  const pendingUrlRef = useRef<string | null>(null);
  pendingUrlRef.current = pendingRecording?.url ?? null;
  React.useEffect(
    () => () => {
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
      if (pendingUrlRef.current) URL.revokeObjectURL(pendingUrlRef.current);
    },
    [],
  );

  const discardPendingRecording = () => {
    setPendingRecording((prev) => {
      if (prev) URL.revokeObjectURL(prev.url);
      return null;
    });
  };

  const confirmPendingRecording = () => {
    if (!pendingRecording) return;
    const { file, size, mimeLabel } = pendingRecording;
    setStagedUploads((prev) => [
      ...prev,
      { id: `recording-${Date.now()}`, file, name: file.name, type: 'file', size, mimeLabel },
    ]);
    discardPendingRecording();
  };

  const composerRootRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const lastTypingSentRef = useRef<number>(0);

  const sendMessage = useChatStore((s) => s.sendMessage);
  const sendPoll = useChatStore((s) => s.sendPoll);
  const sendCapsule = useChatStore((s) => s.sendCapsule);
  const sendGame = useChatStore((s) => s.sendGame);
  const broadcastTyping = useChatStore((s) => s.broadcastTyping);
  const replyingTo = useChatStore((s) => s.replyingTo);
  const setReplyingTo = useChatStore((s) => s.setReplyingTo);
  const enterBehavior = useChatStore((s) => s.liquidGlass.enterBehavior);
  const snippets = useChatStore((s) => s.liquidGlass.snippets);
  const savedReplies = useChatStore((s) => s.liquidGlass.savedReplies);

  useEffect(() => {
    if (useChatStore.getState().activePopupId?.startsWith('composer:')) {
      setActivePopupId(null);
    }
  }, [conversationId, setActivePopupId]);

  useEffect(() => {
    if (!activeComposerPopup) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (
        composerRootRef.current &&
        !composerRootRef.current.contains(event.target as Node)
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
  }, [activeComposerPopup, setActivePopupId]);

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
    const savedReplyMatch = text.trim().match(/^\/(\d+)$/);
    const savedReplyText = savedReplyMatch
      ? savedReplies[Math.max(0, Number(savedReplyMatch[1]) - 1)]
      : undefined;
    const outgoingText = savedReplyText
      ?? (text.trim() === '/shrug'
        ? '¯\\_(ツ)_/¯'
        : text.trim().startsWith('/shrug ')
          ? `¯\\_(ツ)_/¯ ${text.trim().slice(7)}`
          : text);

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
      setActivePopupId(null);
      setSelectedGif(null);

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

  const handleSendSticker = async (sticker: Sticker) => {
    if (sending) return;
    setActivePopupId(null);
    setSendError(null);
    try {
      const file = await stickerToFile(sticker);
      await sendMessage('', [
        {
          id: `sticker-${Date.now()}`,
          file,
          name: sticker.name,
          type: 'image',
          size: 'Sticker',
          mimeLabel: 'image/png',
          sticker: true,
        },
      ]);
    } catch (error) {
      setSendError(error instanceof Error ? error.message : 'Could not send sticker.');
    }
  };

  const handleSendCapsule = async () => {
    if (sending) return;
    setSending(true);
    setSendError(null);
    try {
      await sendCapsule(text, new Date(capsuleAt));
      setText('');
      setCapsuleAt('');
      setCapsuleOpen(false);
      setActivePopupId(null);
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
    } catch (error) {
      setSendError(error instanceof Error ? error.message : 'Could not send time capsule.');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (enterBehavior === 'enter-send' && e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    } else if (enterBehavior === 'ctrl-send' && e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
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
      const activeFilter = mode === 'audio' ? voiceFilter : 'none';
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
        setLiveStream(null);
        let type = mode === 'video' ? 'video/webm' : 'audio/webm';
        let extension = 'webm';
        let blob: Blob = new Blob(chunks, { type });
        if (activeFilter !== 'none') {
          setProcessingVoice(true);
          const filtered = await applyVoiceFilter(blob, activeFilter);
          setProcessingVoice(false);
          if (filtered !== blob) {
            blob = filtered;
            type = 'audio/wav';
            extension = 'wav';
          }
        }
        const file = new File([blob], `${mode}-recording.${extension}`, { type });
        const sizeKb = file.size / 1024;
        setPendingRecording((prev) => {
          if (prev) URL.revokeObjectURL(prev.url);
          return {
            file,
            url: URL.createObjectURL(file),
            mode,
            size: sizeKb > 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(sizeKb))} KB`,
            mimeLabel: type,
          };
        });
      };
      mediaRecorderRef.current = recorder;
      discardPendingRecording();
      recorder.start();
      setRecordingMode(mode);
      if (mode === 'video') setLiveStream(stream);
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
    <div ref={composerRootRef} className="relative px-2.5 pb-2.5 pt-1.5 md:px-4 md:pb-4 md:pt-2">
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
            className="glass-panel glass-pill relative mb-2 flex items-center justify-between gap-2 rounded-2xl border-l-2 border-l-[#22C55E] px-3 py-2 text-xs"
          >
            <LiquidGlassLayer variant="pill" interactive />
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
            className="glass-panel glass-surface relative mb-2 overflow-hidden rounded-2xl p-3"
          >
            <LiquidGlassLayer variant="surface" />
            <div className="mb-2 flex items-center justify-between">
              <input
                type="text"
                value={codeLang}
                onChange={(e) => setCodeLang(e.target.value)}
                placeholder="language (e.g. typescript)"
                className="glass-pill w-36 rounded-lg px-2 py-1 font-mono text-[11px] text-emerald-950 outline-none transition focus:border-[#22C55E] focus:ring-2 focus:ring-[#22C55E]/20 dark:text-emerald-200"
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
              className="glass-pill lem-scrollbar w-full resize-none rounded-xl p-2.5 font-mono text-xs text-emerald-950 placeholder-emerald-800/45 outline-none transition focus:border-[#22C55E] focus:ring-2 focus:ring-[#22C55E]/20 dark:text-emerald-100 dark:placeholder-emerald-200/40"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Coordinated Composer Popovers (only one open at a time) */}
      <AnimatePresence mode="wait">
        {showEmoji && (
          <motion.div
            key="composer:emoji"
            initial={{ opacity: 0, y: 12, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.94 }}
            transition={{ type: 'spring', stiffness: 440, damping: 28 }}
            className="glass-panel glass-surface absolute bottom-20 left-2 right-2 z-30 overflow-hidden rounded-2xl sm:left-auto sm:right-16 sm:w-[300px]"
          >
            <LiquidGlassLayer variant="popover" />
            <div className="lem-scrollbar relative z-10 max-h-64 overflow-y-auto p-2.5">
              <label className="mb-2 flex cursor-pointer items-center gap-2 px-1 text-xs font-semibold text-emerald-950 dark:text-emerald-50">
                <input
                  type="checkbox"
                  checked={jumboEmoji}
                  onChange={(e) => setJumboEmoji(e.target.checked)}
                  className="accent-[#22C55E]"
                />
                Jumbo (send emoji big on its own)
              </label>
              <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-8">
                {EMOJI_GRID.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => {
                      setActivePopupId(null);
                      if (jumboEmoji) {
                        void sendMessage(emoji).catch((error) =>
                          setSendError(
                            error instanceof Error ? error.message : 'The message could not be sent.'
                          )
                        );
                        return;
                      }
                      setText((prev) => prev + emoji);
                      textareaRef.current?.focus();
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-xl text-base transition hover:scale-115 hover:bg-emerald-500/20"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {showGif && (
          <motion.div
            key="composer:gif"
            initial={{ opacity: 0, y: 12, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.94 }}
            transition={{ type: 'spring', stiffness: 440, damping: 28 }}
            className="glass-panel glass-surface absolute bottom-20 left-2 right-2 z-30 overflow-hidden rounded-2xl sm:left-auto sm:right-4 sm:w-[290px]"
          >
            <LiquidGlassLayer variant="popover" />
            <div className="lem-scrollbar relative z-10 grid max-h-72 grid-cols-2 gap-2 overflow-y-auto p-2.5">
              {GIF_GRID.map((gif) => (
                <button
                  key={gif.url}
                  onClick={() => {
                    setSelectedGif(gif);
                    setActivePopupId(null);
                    textareaRef.current?.focus();
                  }}
                  className="group overflow-hidden rounded-xl border border-white/10 bg-black/10 text-left transition hover:scale-[1.03] hover:border-emerald-400/60"
                  title={`Use ${gif.name} GIF`}
                >
                  <img src={gif.url} alt="" className="h-20 w-full object-cover" loading="lazy" />
                  <span className="block truncate px-2 py-1 text-[10px] text-emerald-950/80 dark:text-emerald-100/80">
                    {gif.name}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {showStickers && (
          <motion.div
            key="composer:stickers"
            initial={{ opacity: 0, y: 12, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.94 }}
            transition={{ type: 'spring', stiffness: 440, damping: 28 }}
            className="glass-panel glass-surface absolute bottom-20 left-2 right-2 z-30 overflow-hidden rounded-2xl sm:left-auto sm:right-4 sm:w-[300px]"
          >
            <LiquidGlassLayer variant="popover" />
            <div className="lem-scrollbar relative z-10 max-h-72 overflow-y-auto p-2.5">
              {(() => {
                const pack = stickerPacks.find((p) => p.id === activePackId) ?? stickerPacks[0];
                return (
                  <>
                    <div className="mb-2 flex items-center gap-1.5 overflow-x-auto">
                      {stickerPacks.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setActivePackId(p.id)}
                          className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                            pack?.id === p.id
                              ? 'bg-emerald-500/25 text-[#22C55E]'
                              : 'text-emerald-900/75 hover:bg-emerald-500/10 dark:text-emerald-100/75'
                          }`}
                        >
                          {p.name}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          setActivePopupId(null);
                          setShowCropper(true);
                        }}
                        title="Create a sticker"
                        className="ml-auto flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-500/25 dark:text-emerald-300"
                      >
                        <Plus className="h-3 w-3" /> New
                      </button>
                    </div>
                    {!pack ? (
                      <p className="px-2 py-6 text-center text-xs text-emerald-950/75 dark:text-emerald-100/75">
                        No stickers yet. Tap New to crop any image into your own sticker.
                      </p>
                    ) : pack.stickers.length === 0 ? (
                      <p className="px-2 py-6 text-center text-xs text-emerald-950/75 dark:text-emerald-100/75">
                        This pack is empty.
                      </p>
                    ) : (
                      <div className="grid grid-cols-4 gap-1.5">
                        {pack.stickers.map((s) => (
                          <div key={s.id} className="group relative">
                            <button
                              type="button"
                              onClick={() => void handleSendSticker(s)}
                              title={`Send ${s.name}`}
                              className="block w-full rounded-xl p-1 transition hover:scale-105 hover:bg-emerald-500/15"
                            >
                              <img src={s.dataUrl} alt={s.name} className="aspect-square w-full object-contain" />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeSticker(pack.id, s.id)}
                              aria-label={`Delete ${s.name}`}
                              className="absolute right-0 top-0 hidden rounded-full bg-black/60 p-0.5 text-white group-hover:block"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    {pack && (
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Delete the pack "${pack.name}" and all its stickers?`)) {
                            deletePack(pack.id);
                            setActivePackId(null);
                          }
                        }}
                        className="mt-2 flex items-center gap-1 text-[10px] text-rose-500/80 hover:text-rose-500"
                      >
                        <Trash2 className="h-3 w-3" /> Delete pack
                      </button>
                    )}
                  </>
                );
              })()}
            </div>
          </motion.div>
        )}

        {showPoll && (
          <motion.div
            key="composer:poll"
            initial={{ opacity: 0, y: 12, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.94 }}
            transition={{ type: 'spring', stiffness: 440, damping: 28 }}
            className="glass-panel glass-surface absolute bottom-20 left-2 right-2 z-30 overflow-hidden rounded-2xl sm:left-auto sm:right-4 sm:w-[340px]"
          >
            <LiquidGlassLayer variant="popover" />
            <div className="lem-scrollbar relative z-10 max-h-[70vh] overflow-y-auto p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/15 text-[#22C55E]">
                    <BarChart3 className="h-4 w-4" />
                  </span>
                  <span className="text-sm font-bold text-emerald-950 dark:text-white">Create poll</span>
                </div>
                <button
                  type="button"
                  onClick={() => setActivePopupId(null)}
                  className="rounded-full p-1 text-emerald-900/60 hover:bg-black/5 dark:text-white/60 dark:hover:bg-white/10"
                  aria-label="Close poll"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-emerald-800/60 dark:text-emerald-200/55">
                Question
              </label>
              <input
                value={pollQuestion}
                onChange={(e) => setPollQuestion(e.target.value)}
                maxLength={200}
                placeholder="What do you want to ask?"
                className="glass-pill mb-3 w-full rounded-xl px-3 py-2.5 text-[13px] font-medium text-emerald-950 placeholder-emerald-800/40 outline-none transition focus:border-[#22C55E] focus:ring-2 focus:ring-[#22C55E]/20 dark:text-white dark:placeholder-emerald-100/40"
              />
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-emerald-800/60 dark:text-emerald-200/55">
                Options
              </label>
              <div className="space-y-1.5">
                {pollOptions.map((opt, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                      {i + 1}
                    </span>
                    <input
                      value={opt}
                      onChange={(e) =>
                        setPollOptions((prev) => prev.map((o, j) => (j === i ? e.target.value : o)))
                      }
                      maxLength={100}
                      placeholder={`Option ${i + 1}`}
                      className="glass-pill min-w-0 flex-1 rounded-xl px-3 py-2 text-xs text-emerald-950 placeholder-emerald-800/40 outline-none transition focus:border-[#22C55E] focus:ring-2 focus:ring-[#22C55E]/20 dark:text-white dark:placeholder-emerald-100/40"
                    />
                    {pollOptions.length > 2 && (
                      <button
                        type="button"
                        onClick={() => setPollOptions((prev) => prev.filter((_, j) => j !== i))}
                        className="rounded-full p-1 text-rose-500/80 hover:bg-rose-500/10"
                        aria-label={`Remove option ${i + 1}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between">
                <button
                  type="button"
                  disabled={pollOptions.length >= 8}
                  onClick={() => setPollOptions((prev) => [...prev, ''])}
                  className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-emerald-600 transition hover:bg-emerald-500/10 disabled:opacity-40 dark:text-emerald-300"
                >
                  <Plus className="h-3 w-3" /> Add option
                </button>
                <button
                  type="button"
                  disabled={!pollQuestion.trim() || pollOptions.filter((o) => o.trim()).length < 2}
                  onClick={() => {
                    setSendError(null);
                    const q = pollQuestion;
                    const opts = pollOptions;
                    setActivePopupId(null);
                    setPollQuestion('');
                    setPollOptions(['', '']);
                    sendPoll(q, opts).catch((err: unknown) => {
                      setPollQuestion(q);
                      setPollOptions(opts);
                      setSendError(err instanceof Error ? err.message : 'Could not send poll.');
                    });
                  }}
                  className="rounded-full bg-gradient-to-r from-[#22C55E] to-[#10B981] px-4 py-1.5 text-xs font-semibold text-white shadow-lem-glow-sm transition hover:brightness-110 disabled:opacity-40"
                >
                  Send poll
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Live video recording view */}
      {recordingMode === 'video' && (
        <div className="mb-2 overflow-hidden rounded-2xl border border-rose-500/30 bg-black shadow-lg">
          <div className="relative">
            <video
              ref={(el) => {
                liveVideoRef.current = el;
                if (el && el.srcObject !== liveStream) el.srcObject = liveStream;
              }}
              autoPlay
              muted
              playsInline
              className="mx-auto max-h-64 w-full -scale-x-100 object-contain"
            />
            <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-semibold text-white">
              <span className="h-2 w-2 animate-pulse rounded-full bg-rose-500" /> REC
            </span>
          </div>
        </div>
      )}

      {/* Recording preview before attaching */}
      {pendingRecording && !recordingMode && (
        <div className="mb-2 rounded-2xl border border-emerald-500/25 bg-white/70 p-2.5 shadow-lg backdrop-blur dark:bg-zinc-900/70">
          {pendingRecording.mode === 'video' ? (
            <video src={pendingRecording.url} controls playsInline className="max-h-64 w-full rounded-xl bg-black object-contain" />
          ) : (
            <audio src={pendingRecording.url} controls className="w-full" />
          )}
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="text-[11px] text-emerald-800/70 dark:text-emerald-200/70">
              {pendingRecording.mode === 'video' ? 'Video' : 'Audio'} recording · {pendingRecording.size}
            </span>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={discardPendingRecording}
                className="flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold text-rose-500 transition hover:bg-rose-500/10"
              >
                <Trash2 className="h-3 w-3" /> Discard
              </button>
              <button
                type="button"
                onClick={confirmPendingRecording}
                className="rounded-full bg-gradient-to-r from-[#22C55E] to-[#10B981] px-4 py-1 text-xs font-semibold text-white transition hover:brightness-110"
              >
                Attach
              </button>
            </div>
          </div>
        </div>
      )}

      <StickerCropper
        isOpen={showCropper}
        initialPackId={activePackId}
        onClose={() => setShowCropper(false)}
      />

      {/* Pill-shaped Floating Glass Composer */}
      <motion.div
        animate={
          sendPulseKey > 0
            ? { scale: [1, 0.992, 1] }
            : undefined
        }
        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
        data-input-shell
        className="glass-panel glass-surface relative flex items-end gap-1 overflow-visible rounded-[26px] px-2 py-1.5 transition focus-within:border-[#22C55E]/55 focus-within:ring-2 focus-within:ring-[#22C55E]/20 md:gap-1.5 md:px-3 md:py-2"
      >
        <LiquidGlassLayer variant="surface" cornerRadius={26} />
        {/* Liquid Glass Send Sweep across composer */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
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
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />

        <motion.button
          data-composer-btn
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => fileInputRef.current?.click()}
          title="Attach file or image (uploads to Supabase Storage)"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-emerald-800/70 transition hover:bg-emerald-500/15 hover:text-emerald-600 md:h-9 md:w-9 dark:text-emerald-200/70 dark:hover:text-emerald-300"
        >
          <Paperclip className="h-4 w-4" />
        </motion.button>

        <motion.button
          data-composer-btn
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowCodeEditor((v) => !v)}
          title="Attach code snippet"
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition md:h-9 md:w-9 ${
            showCodeEditor
              ? 'bg-emerald-500/20 text-[#22C55E]'
              : 'text-emerald-800/70 hover:bg-emerald-500/15 hover:text-emerald-600 dark:text-emerald-200/70 dark:hover:text-emerald-300'
          }`}
        >
          <Code2 className="h-4 w-4" />
        </motion.button>

        {recordingMode ? (
          <div className="flex shrink-0 items-center gap-1.5">
            <motion.button
              data-composer-btn
              whileTap={{ scale: 0.9 }}
              onClick={stopRecording}
              title={`Stop ${recordingMode} recording`}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose-500/20 text-rose-500 md:h-9 md:w-9"
            >
              <Square className="h-3.5 w-3.5 fill-current" />
            </motion.button>
            <span className="flex items-center gap-0.5 pr-1" aria-hidden>
              {[0, 1, 2].map((bar) => (
                <motion.span
                  key={bar}
                  animate={{ scaleY: [0.4, 1.15, 0.4] }}
                  transition={{ duration: 0.65, repeat: Infinity, delay: bar * 0.14 }}
                  className="h-3 w-0.5 rounded-full bg-rose-500"
                />
              ))}
            </span>
          </div>
        ) : (
          <>
            <div className="relative hidden shrink-0 sm:flex">
              <motion.button
                data-composer-btn
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => void startRecording('audio')}
                disabled={processingVoice}
                title={processingVoice ? 'Applying voice filter…' : 'Record audio'}
                className="flex h-8 w-8 items-center justify-center rounded-full text-emerald-800/70 transition hover:bg-emerald-500/15 hover:text-emerald-600 disabled:opacity-50 md:h-9 md:w-9 dark:text-emerald-200/70"
              >
                <Mic className={`h-4 w-4 ${processingVoice ? 'animate-pulse' : ''}`} />
              </motion.button>
              <button
                type="button"
                data-compact-target
                onClick={() => togglePopup('composer:voiceFilters')}
                title={`Voice filter: ${VOICE_FILTERS.find((f) => f.id === voiceFilter)?.label}`}
                className={`absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[9px] ring-1 ring-black/10 transition ${
                  showVoiceFilters
                    ? 'scale-110 bg-[#22C55E] text-white'
                    : voiceFilter === 'none'
                      ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-200'
                      : 'bg-emerald-500 text-white'
                }`}
              >
                {voiceFilter === 'none' ? '♪' : VOICE_FILTERS.find((f) => f.id === voiceFilter)?.emoji}
              </button>
              <AnimatePresence>
                {showVoiceFilters && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.94 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.94 }}
                    transition={{ type: 'spring', stiffness: 440, damping: 28 }}
                    className="glass-panel glass-surface absolute bottom-12 left-0 z-50 w-56 overflow-hidden rounded-2xl p-1.5"
                  >
                    <LiquidGlassLayer variant="popover" />
                    <p className="px-2 pb-1 pt-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700/80 dark:text-emerald-300/80">
                      Voice filter
                    </p>
                    {VOICE_FILTERS.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setVoiceFilter(f.id)}
                        className={`flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left text-sm text-emerald-950 transition hover:bg-emerald-500/10 dark:text-emerald-50 ${
                          voiceFilter === f.id ? 'bg-emerald-500/15 font-semibold' : ''
                        }`}
                      >
                        <span className="text-base">{f.emoji}</span>
                        <span className="flex flex-col leading-tight">
                          <span>{f.label}</span>
                          <span className="text-[11px] font-normal opacity-60">{f.hint}</span>
                        </span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <motion.button
              data-composer-btn
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => void startRecording('video')}
              title="Record video"
              className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-full text-emerald-800/70 transition hover:bg-emerald-500/15 hover:text-emerald-600 sm:flex md:h-9 md:w-9 dark:text-emerald-200/70"
            >
              <Video className="h-4 w-4" />
            </motion.button>
          </>
        )}

        <textarea
          ref={textareaRef}
          rows={1}
          maxLength={4000}
          value={text}
          onChange={(e) => {
            let next = e.target.value;
            for (const [shortcut, expansion] of Object.entries(snippets)) {
              if (next.endsWith(shortcut)) {
                next = `${next.slice(0, -shortcut.length)}${expansion}`;
              }
            }
            setText(next);
            resizeTextarea();
            handleTypingPing(next);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="lem-scrollbar max-h-[130px] min-h-[24px] min-w-0 flex-1 resize-none bg-transparent py-1.5 text-[13.5px] leading-relaxed text-emerald-950 placeholder-emerald-800/45 outline-none dark:text-white dark:placeholder-emerald-100/40"
        />

        <motion.button
          data-composer-btn
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => togglePopup('composer:emoji')}
          title="Insert emoji"
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition md:h-9 md:w-9 ${
            showEmoji
              ? 'bg-emerald-500/20 text-[#22C55E]'
              : 'text-emerald-800/70 hover:bg-emerald-500/15 hover:text-emerald-600 dark:text-emerald-200/70 dark:hover:text-emerald-300'
          }`}
        >
          <Smile className="h-4 w-4" />
        </motion.button>

        <motion.button
          data-composer-btn
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => togglePopup('composer:gif')}
          title="Choose a GIF"
          className={`hidden h-8 w-8 shrink-0 items-center justify-center rounded-full transition sm:flex md:h-9 md:w-9 ${
            showGif
              ? 'bg-emerald-500/20 text-[#22C55E]'
              : 'text-emerald-800/70 hover:bg-emerald-500/15 hover:text-emerald-600 dark:text-emerald-200/70 dark:hover:text-emerald-300'
          }`}
        >
          <Film className="h-4 w-4" />
        </motion.button>

        <motion.button
          data-composer-btn
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => togglePopup('composer:stickers')}
          title="Stickers"
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition md:h-9 md:w-9 ${
            showStickers
              ? 'bg-emerald-500/20 text-[#22C55E]'
              : 'text-emerald-800/70 hover:bg-emerald-500/15 hover:text-emerald-600 dark:text-emerald-200/70 dark:hover:text-emerald-300'
          }`}
        >
          <StickerIcon className="h-4 w-4" />
        </motion.button>

        <motion.button
          data-composer-btn
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => togglePopup('composer:poll')}
          title="Create a poll"
          className={`hidden h-8 w-8 shrink-0 items-center justify-center rounded-full transition sm:flex md:h-9 md:w-9 ${
            showPoll
              ? 'bg-emerald-500/20 text-[#22C55E]'
              : 'text-emerald-800/70 hover:bg-emerald-500/15 hover:text-emerald-600 dark:text-emerald-200/70 dark:hover:text-emerald-300'
          }`}
        >
          <BarChart3 className="h-4 w-4" />
        </motion.button>

        <motion.button
          data-composer-btn
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => {
            setSendError(null);
            setActivePopupId(null);
            sendGame().catch((err: unknown) =>
              setSendError(err instanceof Error ? err.message : 'Could not start game.')
            );
          }}
          title="Start a Tic-Tac-Toe game"
          className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-full text-emerald-800/70 transition hover:bg-emerald-500/15 hover:text-emerald-600 sm:flex md:h-9 md:w-9 dark:text-emerald-200/70 dark:hover:text-emerald-300"
        >
          <Gamepad2 className="h-4 w-4" />
        </motion.button>

        <div className="relative flex shrink-0 items-center">
          <AnimatePresence>
            {showSendMenu && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.94 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.94 }}
                transition={{ type: 'spring', stiffness: 440, damping: 28 }}
                className="glass-panel glass-surface absolute bottom-12 right-0 z-30 w-[270px] overflow-hidden rounded-2xl p-3"
              >
                <LiquidGlassLayer variant="popover" />
                {!capsuleOpen ? (
                  <button
                    type="button"
                    onClick={() => setCapsuleOpen(true)}
                    className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-xs font-semibold text-emerald-950 hover:bg-emerald-500/10 dark:text-white"
                  >
                    <Hourglass className="h-4 w-4 text-[#22C55E]" />
                    <span>
                      Send as time capsule
                      <span className="block text-[10px] font-normal opacity-60">
                        Locked until a date you choose
                      </span>
                    </span>
                  </button>
                ) : (
                  <div>
                    <div className="mb-2 flex items-center gap-1.5 text-xs font-bold text-emerald-950 dark:text-white">
                      <Hourglass className="h-4 w-4 text-[#22C55E]" /> Time capsule
                    </div>
                    <div className="mb-2 flex flex-wrap gap-1.5">
                      {capsulePresets().map((p) => (
                        <button
                          key={p.label}
                          type="button"
                          onClick={() => setCapsuleAt(toLocalInput(p.date))}
                          className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-semibold text-emerald-700 hover:bg-emerald-500/25 dark:text-emerald-300"
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                    <input
                      type="datetime-local"
                      value={capsuleAt}
                      min={toLocalInput(new Date(Date.now() + 120_000))}
                      onChange={(e) => setCapsuleAt(e.target.value)}
                      className="glass-pill mb-2 w-full rounded-xl px-2.5 py-2 text-xs text-emerald-950 outline-none transition focus:border-[#22C55E] focus:ring-2 focus:ring-[#22C55E]/20 dark:text-white"
                    />
                    <p className="mb-2 text-[10px] opacity-60 text-emerald-900 dark:text-emerald-100">
                      {text.trim()
                        ? 'Your typed message is sealed. Nobody can open it before then.'
                        : 'Type your message first, then seal it.'}
                    </p>
                    <button
                      type="button"
                      disabled={
                        sending ||
                        !text.trim() ||
                        !capsuleAt ||
                        new Date(capsuleAt).getTime() <= Date.now() + 60_000
                      }
                      onClick={() => void handleSendCapsule()}
                      className="w-full rounded-full bg-gradient-to-r from-[#22C55E] to-[#10B981] px-4 py-1.5 text-xs font-semibold text-white transition hover:brightness-110 disabled:opacity-40"
                    >
                      Seal capsule
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
          <button
            type="button"
            data-composer-btn
            onClick={() => {
              togglePopup('composer:sendMenu');
              setCapsuleOpen(false);
            }}
            title="More send options"
            aria-label="More send options"
            className={`mr-0.5 flex h-8 w-5 items-center justify-center rounded-full transition md:h-9 ${
              showSendMenu
                ? 'bg-emerald-500/20 text-[#22C55E]'
                : 'text-emerald-800/70 hover:bg-emerald-500/15 dark:text-emerald-200/70'
            }`}
          >
            <ChevronUp className={`h-3.5 w-3.5 transition-transform duration-200 ${showSendMenu ? 'rotate-180' : ''}`} />
          </button>
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
});
