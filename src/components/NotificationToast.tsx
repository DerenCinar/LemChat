import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, Sparkles, X } from 'lucide-react';
import { useChatStore } from '../store/useChatStore';
import { UserAvatar } from './UserAvatar';
import { LiquidGlassLayer } from './LiquidGlassLayer';

export const NotificationToast: React.FC = () => {
  const latestToast = useChatStore((s) => s.latestToast);
  const dismissToast = useChatStore((s) => s.dismissToast);
  const selectConversation = useChatStore((s) => s.selectConversation);
  const setActiveTab = useChatStore((s) => s.setActiveTab);
  const notificationReveal = useChatStore((s) => s.liquidGlass.notificationReveal);
  const reduceMotion = useChatStore((s) => s.liquidGlass.reduceMotion);

  const [isHovered, setIsHovered] = useState(false);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    setRevealed(false);
    setIsHovered(false);
  }, [latestToast?.id]);

  useEffect(() => {
    if (!latestToast || isHovered) return;
    const duration = latestToast.kind === 'update' ? 8000 : 5200;
    const timer = setTimeout(() => {
      dismissToast();
    }, duration);
    return () => clearTimeout(timer);
  }, [latestToast, isHovered, dismissToast]);

  const isLiquidReveal = notificationReveal === 'liquid-reveal' && !reduceMotion;
  const isPrivacyVeil = notificationReveal === 'liquid-privacy';
  const bodyVisible = !isPrivacyVeil || revealed || isHovered;
  const durationSec = latestToast?.kind === 'update' ? 8 : 5.2;

  return (
    <AnimatePresence>
      {latestToast && (
        <motion.div
          key={latestToast.id}
          initial={
            reduceMotion
              ? { opacity: 0 }
              : isLiquidReveal
                ? { opacity: 0, y: -26, scale: 0.76, filter: 'blur(14px)' }
                : { opacity: 0, y: -20, scale: 0.94 }
          }
          animate={
            reduceMotion
              ? { opacity: 1 }
              : { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }
          }
          exit={
            reduceMotion
              ? { opacity: 0 }
              : isLiquidReveal
                ? { opacity: 0, y: -18, scale: 0.86, filter: 'blur(10px)' }
                : { opacity: 0, y: -16, scale: 0.94 }
          }
          transition={
            reduceMotion
              ? { duration: 0.12 }
              : isLiquidReveal
                ? { type: 'spring', stiffness: 360, damping: 24, mass: 0.85 }
                : { type: 'spring', stiffness: 420, damping: 28 }
          }
          onMouseEnter={() => {
            setIsHovered(true);
            if (isPrivacyVeil) setRevealed(true);
          }}
          onMouseLeave={() => setIsHovered(false)}
          onClick={() => {
            if (isPrivacyVeil && !bodyVisible) {
              setRevealed(true);
              return;
            }
            if (latestToast.kind === 'update') {
              setActiveTab('settings');
            } else {
              void selectConversation(latestToast.conversationId);
            }
            dismissToast();
          }}
          className="glass-panel glass-surface fixed right-5 top-14 z-50 flex w-80 cursor-pointer items-start gap-3 overflow-hidden rounded-2xl p-3.5 ring-1 ring-[#22C55E]/40 transition hover:scale-[1.01]"
        >
          <LiquidGlassLayer variant="toast" interactive />

          {isLiquidReveal && (
            <motion.div
              key={`lens-${latestToast.id}`}
              aria-hidden
              initial={{ opacity: 0.95 }}
              animate={{ opacity: 0 }}
              transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
              className="pointer-events-none absolute inset-0 z-20 overflow-hidden rounded-[inherit] backdrop-blur-md"
            >
              <span className="liquid-reveal-wave absolute inset-y-0 left-0 w-2/3" />
            </motion.div>
          )}

          <UserAvatar
            avatar={latestToast.senderAvatar}
            name={latestToast.senderName}
            className="relative z-10 h-9 w-9 shrink-0 rounded-xl bg-gradient-to-br from-[#22C55E] to-[#10B981] text-white shadow-lem-glow-sm"
            textClassName="text-xs font-bold"
          />

          <div className="relative z-10 min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="truncate text-xs font-bold text-emerald-950 dark:text-white">
                {latestToast.senderName}
              </p>
              {isLiquidReveal && (
                <Sparkles className="h-3 w-3 shrink-0 text-[#22C55E]" aria-hidden />
              )}
            </div>

            <div className="relative mt-0.5">
              <motion.p
                animate={{
                  filter: bodyVisible ? 'blur(0px)' : 'blur(8px)',
                  opacity: bodyVisible ? 1 : 0.45,
                }}
                transition={{ duration: reduceMotion ? 0.05 : 0.32, ease: [0.22, 1, 0.36, 1] }}
                className="line-clamp-2 text-[11.5px] text-emerald-900/80 dark:text-emerald-100/75"
              >
                {latestToast.body}
              </motion.p>

              <AnimatePresence>
                {isPrivacyVeil && !bodyVisible && (
                  <motion.button
                    type="button"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, scale: 0.94 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setRevealed(true);
                    }}
                    className="liquid-privacy-shimmer absolute inset-0 flex items-center justify-center gap-1.5 rounded-lg border border-white/25 px-2 text-[10px] font-semibold text-emerald-950 backdrop-blur-md dark:text-white"
                  >
                    <Eye className="h-3 w-3 text-[#22C55E]" />
                    <span>Hover or tap to reveal</span>
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              dismissToast();
            }}
            aria-label="Dismiss notification"
            className="relative z-10 rounded-full p-1 text-emerald-900/50 hover:bg-black/5 dark:text-white/50 dark:hover:bg-white/10"
          >
            <X className="h-3 w-3" />
          </button>

          {!isHovered && !reduceMotion && (
            <motion.span
              key={`timer-${latestToast.id}`}
              aria-hidden
              initial={{ scaleX: 1 }}
              animate={{ scaleX: 0 }}
              transition={{ duration: durationSec, ease: 'linear' }}
              style={{ transformOrigin: 'left center' }}
              className="pointer-events-none absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#22C55E] via-[#10B981] to-transparent opacity-80"
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
