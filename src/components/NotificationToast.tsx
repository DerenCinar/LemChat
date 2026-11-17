import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useChatStore } from '../store/useChatStore';

export const NotificationToast: React.FC = () => {
  const latestToast = useChatStore((s) => s.latestToast);
  const dismissToast = useChatStore((s) => s.dismissToast);
  const selectConversation = useChatStore((s) => s.selectConversation);

  useEffect(() => {
    if (!latestToast) return;
    const timer = setTimeout(() => {
      dismissToast();
    }, 4500);
    return () => clearTimeout(timer);
  }, [latestToast, dismissToast]);

  return (
    <AnimatePresence>
      {latestToast && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -16, scale: 0.94 }}
          transition={{ type: 'spring', stiffness: 420, damping: 28 }}
          onClick={() => {
            selectConversation(latestToast.conversationId);
            dismissToast();
          }}
          className="glass-panel glass-surface fixed right-5 top-14 z-50 flex w-80 cursor-pointer items-start gap-3 rounded-2xl p-3.5 ring-1 ring-[#22C55E]/40 transition hover:scale-[1.01]"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#22C55E] to-[#10B981] text-xs font-bold text-white shadow-lem-glow-sm">
            {latestToast.senderAvatar}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-emerald-950 dark:text-white">
              {latestToast.senderName}
            </p>
            <p className="mt-0.5 line-clamp-2 text-[11.5px] text-emerald-900/80 dark:text-emerald-100/75">
              {latestToast.body}
            </p>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              dismissToast();
            }}
            className="rounded-full p-1 text-emerald-900/50 hover:bg-black/5 dark:text-white/50 dark:hover:bg-white/10"
          >
            <X className="h-3 w-3" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
