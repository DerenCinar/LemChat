import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Download, ExternalLink, FileText, X } from 'lucide-react';
import { useChatStore } from '../store/useChatStore';
import { LiquidGlassLayer } from './LiquidGlassLayer';

export const AttachmentViewer: React.FC = () => {
  const attachment = useChatStore((s) => s.selectedAttachment);
  const closeAttachment = useChatStore((s) => s.closeAttachment);

  useEffect(() => {
    if (!attachment) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeAttachment();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [attachment, closeAttachment]);

  const mime = attachment?.mimeLabel?.toLowerCase() ?? '';
  const name = attachment?.name.toLowerCase() ?? '';
  const isGif = mime.includes('gif') || name.endsWith('.gif');
  const isImage = attachment?.type === 'image' || mime.startsWith('image/');
  const isPdf = mime.includes('pdf') || name.endsWith('.pdf');
  const isVideo = mime.startsWith('video/') || /\.(mp4|webm|mov|m4v)$/i.test(name);
  const isAudio = mime.startsWith('audio/') || /\.(mp3|wav|m4a|ogg|webm)$/i.test(name);

  return (
    <AnimatePresence>
      {attachment && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-12 z-[70] flex items-center justify-center"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeAttachment();
          }}
        >
          <motion.div
            initial={{ scale: 0.94, y: 14, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.94, y: 12, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            className="glass-panel glass-surface relative flex h-full w-full max-w-5xl flex-col overflow-hidden rounded-3xl"
          >
            <LiquidGlassLayer variant="modal" />
          <header className="flex items-center justify-between border-b border-black/10 px-4 py-3 dark:border-white/10">
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-emerald-950 dark:text-white">
                {attachment.name}
              </p>
              <p className="text-[10px] text-emerald-800/60 dark:text-emerald-200/60">
                {attachment.mimeLabel ?? 'Attachment'} · {attachment.size}
              </p>
            </div>
            <div className="flex items-center gap-1">
              {attachment.previewUrl && (
                <a
                  href={attachment.previewUrl}
                  download={attachment.name}
                  className="glass-pill flex h-8 w-8 items-center justify-center rounded-full text-emerald-800 dark:text-emerald-200"
                  title="Download"
                >
                  <Download className="h-3.5 w-3.5" />
                </a>
              )}
              <button
                onClick={closeAttachment}
                className="glass-pill flex h-8 w-8 items-center justify-center rounded-full text-emerald-800 dark:text-emerald-200"
                title="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </header>

          <div className="flex min-h-0 flex-1 items-center justify-center bg-black/20 p-4">
            {attachment.previewUrl && (isImage || isGif) ? (
              <img
                src={attachment.previewUrl}
                alt={attachment.name}
                className={`max-h-full max-w-full object-contain ${isGif ? 'rounded-xl' : ''}`}
              />
            ) : attachment.previewUrl && isVideo ? (
              <video
                src={attachment.previewUrl}
                controls
                autoPlay
                className="max-h-full max-w-full rounded-xl bg-black"
              />
            ) : attachment.previewUrl && isAudio ? (
              <audio
                src={attachment.previewUrl}
                controls
                autoPlay
                className="w-full max-w-xl"
              />
            ) : attachment.previewUrl && isPdf ? (
              <iframe
                src={attachment.previewUrl}
                title={attachment.name}
                className="h-full w-full rounded-xl border-0 bg-white"
              />
            ) : (
              <div className="flex flex-col items-center gap-3 text-emerald-800/70 dark:text-emerald-200/70">
                <FileText className="h-12 w-12" />
                <p className="text-xs">This file type cannot be previewed in the app.</p>
                {attachment.previewUrl && (
                  <a
                    href={attachment.previewUrl}
                    download={attachment.name}
                    className="glass-pill flex items-center gap-2 rounded-full px-3 py-2 text-xs"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Download file
                  </a>
                )}
              </div>
            )}
          </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
