import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import LiquidGlass from 'liquid-glass-react';
import { useChatStore } from '../store/useChatStore';

export type LiquidGlassVariant =
  | 'panel'
  | 'surface'
  | 'rail'
  | 'pill'
  | 'bubble'
  | 'popover'
  | 'modal'
  | 'toast';

export interface LiquidGlassLayerProps {
  variant?: LiquidGlassVariant;
  interactive?: boolean;
  cornerRadius?: number;
  disabled?: boolean;
  className?: string;
}

const ZERO_POS = { x: 0, y: 0 };

interface MeasuredSize {
  width: number;
  height: number;
  radius: number;
}

const LiquidGlassLayerInner: React.FC<LiquidGlassLayerProps> = ({
  variant = 'surface',
  interactive = false,
  cornerRadius,
  className = '',
}) => {
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const resizeTimerRef = useRef<number | null>(null);

  const theme = useChatStore((s) => s.theme);
  const blur = useChatStore((s) => s.liquidGlass.blur);
  const realGlassMode = useChatStore((s) => s.liquidGlass.realGlassMode);
  const refractionScale = useChatStore((s) => s.liquidGlass.refractionScale);
  const aberrationIntensity = useChatStore((s) => s.liquidGlass.aberrationIntensity);
  const glassElasticity = useChatStore((s) => s.liquidGlass.glassElasticity);
  const glassSaturation = useChatStore((s) => s.liquidGlass.glassSaturation);
  const reduceMotion = useChatStore((s) => s.liquidGlass.reduceMotion);

  const [size, setSize] = useState<MeasuredSize>({ width: 0, height: 0, radius: 20 });
  const [isVisible, setIsVisible] = useState(true);
  const [pointer, setPointer] = useState<{
    global: { x: number; y: number };
    offset: { x: number; y: number };
  }>({ global: ZERO_POS, offset: ZERO_POS });

  useLayoutEffect(() => {
    const anchor = anchorRef.current;
    const host = anchor?.parentElement;
    if (!host) return;

    host.setAttribute('data-real-glass-host', variant);

    const measure = (): MeasuredSize => {
      const rect = host.getBoundingClientRect();
      const computed = window.getComputedStyle(host);
      const parsedRadius = parseFloat(computed.borderTopLeftRadius);
      return {
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        radius: Number.isFinite(parsedRadius) ? Math.round(parsedRadius) : 20,
      };
    };

    const initial = measure();
    if (initial.width > 0 && initial.height > 0) {
      setSize(initial);
    }

    let io: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== 'undefined') {
      io = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          if (entry) setIsVisible(entry.isIntersecting);
        },
        { rootMargin: '140px' }
      );
      io.observe(host);
    }

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => {
        const next = measure();
        setSize((prev) => {
          if (prev.width === 0 || prev.height === 0) {
            return next;
          }
          if (
            Math.abs(next.width - prev.width) < 4 &&
            Math.abs(next.height - prev.height) < 4 &&
            next.radius === prev.radius
          ) {
            return prev;
          }
          if (resizeTimerRef.current !== null) {
            window.clearTimeout(resizeTimerRef.current);
          }
          resizeTimerRef.current = window.setTimeout(() => {
            resizeTimerRef.current = null;
            setSize(measure());
          }, 110);
          return prev;
        });
      });
      ro.observe(host);
    }

    return () => {
      host.removeAttribute('data-real-glass-host');
      io?.disconnect();
      ro?.disconnect();
      if (resizeTimerRef.current !== null) {
        window.clearTimeout(resizeTimerRef.current);
        resizeTimerRef.current = null;
      }
    };
  }, [variant]);

  const elasticityEnabled =
    interactive &&
    !reduceMotion &&
    glassElasticity > 0 &&
    variant !== 'panel' &&
    variant !== 'rail';

  useEffect(() => {
    const anchor = anchorRef.current;
    const host = anchor?.parentElement;
    if (!host || !elasticityEnabled) {
      setPointer({ global: ZERO_POS, offset: ZERO_POS });
      return;
    }

    let pendingEvent: MouseEvent | null = null;

    const flush = () => {
      rafRef.current = null;
      const ev = pendingEvent;
      pendingEvent = null;
      if (!ev) return;
      const rect = host.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      setPointer({
        global: { x: ev.clientX, y: ev.clientY },
        offset: {
          x: ((ev.clientX - centerX) / rect.width) * 100,
          y: ((ev.clientY - centerY) / rect.height) * 100,
        },
      });
    };

    const onMouseMove = (ev: MouseEvent) => {
      pendingEvent = ev;
      if (rafRef.current === null) {
        rafRef.current = window.requestAnimationFrame(flush);
      }
    };

    const onMouseLeave = () => {
      pendingEvent = null;
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      setPointer({ global: ZERO_POS, offset: ZERO_POS });
    };

    host.addEventListener('mousemove', onMouseMove, { passive: true });
    host.addEventListener('mouseleave', onMouseLeave);

    return () => {
      host.removeEventListener('mousemove', onMouseMove);
      host.removeEventListener('mouseleave', onMouseLeave);
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [elasticityEnabled]);

  const isLightTheme = theme === 'light' || theme === 'mono';
  const effectiveBlur = Math.min(1, Math.max(0, blur / 96));
  const sizeFactor =
    size.width > 0 && size.height > 0
      ? Math.min(1, Math.min(size.width, size.height) / 56)
      : 1;
  const variantMultiplier =
    variant === 'panel' || variant === 'rail'
      ? 0.55
      : variant === 'bubble'
        ? 0.65
        : 1;
  const effectiveDisplacement = Math.round(
    refractionScale * variantMultiplier * Math.max(0.3, sizeFactor)
  );
  const effectiveElasticity = elasticityEnabled
    ? (glassElasticity / 100) * (variant === 'modal' ? 0.35 : 0.85)
    : 0;
  const maxAllowedRadius =
    size.width > 0 && size.height > 0
      ? Math.floor(Math.min(size.width, size.height) / 2)
      : 24;
  const effectiveRadius = Math.max(
    0,
    Math.min(cornerRadius ?? size.radius, maxAllowedRadius)
  );

  return (
    <div
      ref={anchorRef}
      aria-hidden="true"
      data-variant={variant}
      className={`rdev-lg-layer pointer-events-none absolute inset-0 ${
        effectiveElasticity > 0 ? 'overflow-visible' : 'overflow-hidden'
      } ${className}`}
      style={{ borderRadius: 'inherit', zIndex: -1 }}
    >
      {isVisible && size.width >= 12 && size.height >= 12 && (
        <LiquidGlass
          key={`${Math.round(size.width / 10)}x${Math.round(size.height / 10)}-${realGlassMode}`}
          displacementScale={effectiveDisplacement}
          blurAmount={effectiveBlur}
          saturation={glassSaturation}
          aberrationIntensity={aberrationIntensity}
          elasticity={effectiveElasticity}
          cornerRadius={effectiveRadius}
          overLight={isLightTheme}
          mode={realGlassMode}
          padding="0px"
          globalMousePos={pointer.global}
          mouseOffset={pointer.offset}
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            pointerEvents: 'none',
          }}
        >
          <div style={{ width: size.width, height: size.height, pointerEvents: 'none' }} />
        </LiquidGlass>
      )}
    </div>
  );
};

export const LiquidGlassLayer: React.FC<LiquidGlassLayerProps> = ({
  disabled = false,
  ...props
}) => {
  const useRealLiquidGlass = useChatStore((s) => s.liquidGlass.useRealLiquidGlass);
  const reduceTransparency = useChatStore((s) => s.liquidGlass.reduceTransparency);

  if (!useRealLiquidGlass || reduceTransparency || disabled) {
    return null;
  }

  return <LiquidGlassLayerInner {...props} />;
};
