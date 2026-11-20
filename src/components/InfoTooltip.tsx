import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Info } from 'lucide-react';
import { LiquidGlassLayer } from './LiquidGlassLayer';

interface InfoTooltipProps {
  title?: string;
  description: string;
}

interface TooltipCoords {
  left: number;
  top: number;
  below: boolean;
}

const TOOLTIP_MAX_WIDTH = 230;
const VIEWPORT_PADDING = 12;

/**
 * Compact frosted-glass (i) button that shows an explanation overlay on hover, focus, or tap.
 */
export const InfoTooltip: React.FC<InfoTooltipProps> = ({ title, description }) => {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<TooltipCoords>({ left: 0, top: 0, below: false });

  const updatePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const below = rect.top < 100;
    const halfWidth = TOOLTIP_MAX_WIDTH / 2;
    const center = rect.left + rect.width / 2;
    const left = Math.min(
      Math.max(VIEWPORT_PADDING + halfWidth, center),
      window.innerWidth - VIEWPORT_PADDING - halfWidth
    );
    const top = below ? rect.bottom + 8 : rect.top - 8;
    setCoords({ left, top, below });
  }, []);

  const show = () => {
    updatePosition();
    setOpen(true);
  };

  const hide = () => setOpen(false);

  useEffect(() => {
    if (!open) return;

    const handleScroll = () => setOpen(false);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const handlePointerDown = (e: PointerEvent) => {
      if (triggerRef.current && !triggerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('pointerdown', handlePointerDown);

    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [open, updatePosition]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={title ? `${title} info` : 'More information'}
        aria-expanded={open}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        onPointerDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (open) {
            hide();
          } else {
            show();
          }
        }}
        className="glass-pill inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-emerald-700/80 transition hover:scale-110 hover:border-[#22C55E]/60 hover:text-[#22C55E] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#22C55E]/60 dark:text-emerald-200/75 dark:hover:text-[#22C55E]"
      >
        <Info className="h-2.5 w-2.5" />
      </button>

      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {open && (
              <div
                role="tooltip"
                style={{
                  left: coords.left,
                  top: coords.top,
                  maxWidth: TOOLTIP_MAX_WIDTH,
                }}
                className={`pointer-events-none fixed z-[200] -translate-x-1/2 ${
                  coords.below ? '' : '-translate-y-full'
                }`}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.92, y: coords.below ? -4 : 4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.94, y: coords.below ? -3 : 3 }}
                  transition={{ type: 'spring', stiffness: 460, damping: 28, mass: 0.6 }}
                  className="liquid-tooltip-box relative rounded-2xl px-3 py-2 text-left"
                >
                  <LiquidGlassLayer variant="popover" />
                  {title && (
                    <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-[#22C55E]">
                      {title}
                    </p>
                  )}
                  <p className="text-[11px] leading-snug text-emerald-950/90 dark:text-emerald-50/95">
                    {description}
                  </p>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
};
