import React, { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { InfoTooltip } from './InfoTooltip';

interface LiquidGlassSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  info?: string;
  onChange: (value: number) => void;
}

/**
 * Custom watery Liquid Glass slider with flowing caustic fill, droplet spring squash/stretch,
 * ripple ring feedback, and floating glass value bubble.
 */
export const LiquidGlassSlider: React.FC<LiquidGlassSliderProps> = ({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  info,
  onChange,
}) => {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const lastPointerRef = useRef<{ x: number; time: number }>({ x: 0, time: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [velocity, setVelocity] = useState(0);
  const [rippleKey, setRippleKey] = useState(0);

  const range = Math.max(1, max - min);
  const clampedValue = Math.min(max, Math.max(min, value));
  const percent = ((clampedValue - min) / range) * 100;

  const snapValue = (rawRatio: number) => {
    const ratio = Math.min(1, Math.max(0, rawRatio));
    const stepped = min + Math.round((ratio * range) / step) * step;
    return Math.min(max, Math.max(min, Number(stepped.toFixed(4))));
  };

  const commitFromClientX = (clientX: number) => {
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    if (rect.width <= 0) return;
    const nextValue = snapValue((clientX - rect.left) / rect.width);
    if (nextValue !== value) {
      setRippleKey((k) => k + 1);
      onChange(nextValue);
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    e.currentTarget.setPointerCapture(e.pointerId);
    lastPointerRef.current = { x: e.clientX, time: performance.now() };
    setIsDragging(true);
    setVelocity(0);
    setRippleKey((k) => k + 1);
    commitFromClientX(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const now = performance.now();
    const dt = Math.max(1, now - lastPointerRef.current.time);
    const dx = e.clientX - lastPointerRef.current.x;
    const rawVelocity = (dx / dt) * 1.4;
    setVelocity(Math.max(-1, Math.min(1, rawVelocity)));
    lastPointerRef.current = { x: e.clientX, time: now };
    commitFromClientX(e.clientX);
  };

  const endDrag = () => {
    if (!isDragging) return;
    setIsDragging(false);
    setVelocity(0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    let next: number | null = null;
    const coarse = Math.max(step, Math.round(range / 10));
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      next = Math.min(max, value + step);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      next = Math.max(min, value - step);
    } else if (e.key === 'PageUp') {
      next = Math.min(max, value + coarse);
    } else if (e.key === 'PageDown') {
      next = Math.max(min, value - coarse);
    } else if (e.key === 'Home') {
      next = min;
    } else if (e.key === 'End') {
      next = max;
    }
    if (next !== null) {
      e.preventDefault();
      if (next !== value) {
        setRippleKey((k) => k + 1);
        onChange(next);
      }
    }
  };

  const stretchX = isDragging ? 1.18 + Math.min(0.12, Math.abs(velocity) * 0.14) : isHovered ? 1.07 : 1;
  const stretchY = isDragging ? 0.86 : isHovered ? 1.04 : 1;
  const skewX = isDragging ? velocity * -10 : 0;

  return (
    <div className="space-y-2 select-none">
      <div className="flex items-center justify-between gap-2 text-[11px] font-semibold text-emerald-950 dark:text-white">
        <span className="inline-flex min-w-0 items-center gap-1.5">
          <span className="truncate">{label}</span>
          {info && <InfoTooltip title={label} description={info} />}
        </span>
        <span className="shrink-0 tabular-nums text-[#22C55E]">
          {clampedValue}
          {unit}
        </span>
      </div>

      <div
        ref={trackRef}
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={clampedValue}
        aria-valuetext={`${clampedValue}${unit}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerEnter={() => setIsHovered(true)}
        onPointerLeave={() => setIsHovered(false)}
        onKeyDown={handleKeyDown}
        className="group relative flex h-8 cursor-pointer touch-none items-center px-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#22C55E]/60 focus-visible:rounded-full"
      >
        <div className="liquid-slider-track relative h-3 w-full overflow-hidden rounded-full">
          <motion.div
            className="liquid-slider-fill absolute inset-y-0 left-0 rounded-full"
            animate={{ width: `${percent}%` }}
            transition={
              isDragging
                ? { type: 'tween', duration: 0.04, ease: 'linear' }
                : { type: 'spring', stiffness: 360, damping: 28 }
            }
          >
            <div className="liquid-slider-flow pointer-events-none absolute inset-0 rounded-full" />
            <div className="liquid-slider-caustics pointer-events-none absolute inset-0 rounded-full" />
            <span className="pointer-events-none absolute inset-x-1 top-[1px] h-[2px] rounded-full bg-white/45 blur-[0.5px]" />
          </motion.div>
        </div>

        <div className="pointer-events-none absolute inset-x-2.5 inset-y-0">
          <motion.div
            className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
            animate={{ left: `${percent}%` }}
            transition={
              isDragging
                ? { type: 'tween', duration: 0.04, ease: 'linear' }
                : { type: 'spring', stiffness: 360, damping: 28 }
            }
          >
            <AnimatePresence>
              {(isDragging || isHovered) && (
                <motion.div
                  initial={{ opacity: 0, y: 4, scale: 0.85 }}
                  animate={{ opacity: 1, y: -26, scale: 1 }}
                  exit={{ opacity: 0, y: 2, scale: 0.85 }}
                  transition={{ type: 'spring', stiffness: 460, damping: 26 }}
                  className="liquid-tooltip-box absolute left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums text-emerald-950 dark:text-white"
                >
                  {clampedValue}
                  {unit}
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {rippleKey > 0 && (
                <motion.span
                  key={rippleKey}
                  initial={{ scale: 0.65, opacity: 0.7 }}
                  animate={{ scale: 2.05, opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.55, ease: 'easeOut' }}
                  className="liquid-slider-ripple absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full"
                />
              )}
            </AnimatePresence>

            <motion.div
              animate={{ scaleX: stretchX, scaleY: stretchY, skewX }}
              transition={{ type: 'spring', stiffness: 420, damping: 17, mass: 0.7 }}
              className="liquid-slider-thumb relative flex h-5 w-6 items-center justify-center rounded-full"
            >
              <span className="pointer-events-none absolute left-1.5 top-1 h-1.5 w-2.5 rounded-full bg-white/85 blur-[0.4px]" />
              <span className="pointer-events-none absolute bottom-0.5 h-1 w-3 rounded-full bg-white/30 blur-[0.5px]" />
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};
