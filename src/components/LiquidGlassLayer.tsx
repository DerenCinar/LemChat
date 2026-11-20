import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
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
  alwaysRender?: boolean;
  className?: string;
}

const ZERO_POS = { x: 0, y: 0 };
const MINIMAL_VARIANTS = new Set<LiquidGlassVariant>(['popover', 'modal', 'toast', 'surface']);
const BALANCED_VARIANTS = new Set<LiquidGlassVariant>([
  'popover',
  'modal',
  'toast',
  'surface',
  'rail',
  'pill',
]);
const LAYER_HOST_STYLE: React.CSSProperties = { borderRadius: 'inherit', zIndex: -1 };
const LIQUID_GLASS_STYLE: React.CSSProperties = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  pointerEvents: 'none',
};

interface MeasuredSize {
  width: number;
  height: number;
  radius: number;
}

const LiquidGlassLayerInnerComponent: React.FC<LiquidGlassLayerProps> = ({
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
    const isShaderMode = realGlassMode === 'shader';

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
    let lastCommitted = initial;
    const hasInitialValidSize = initial.width >= 12 && initial.height >= 12;
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
    const needsResizeObserver = isShaderMode || !hasInitialValidSize;
    if (needsResizeObserver && typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => {
        const next = measure();
        const hadValidSize = lastCommitted.width >= 12 && lastCommitted.height >= 12;

        if (!hadValidSize) {
          if (next.width > 0 && next.height > 0) {
            lastCommitted = next;
            setSize(next);
            const nextEffectiveShader = isShaderMode && Math.max(next.width, next.height) <= 440;
            if (!nextEffectiveShader) {
              ro?.disconnect();
              ro = null;
            }
          }
          return;
        }

        // For non-shader modes, CSS 100% sizing handles growth without re-measuring or remounting
        if (!isShaderMode) {
          ro?.disconnect();
          ro = null;
          return;
        }

        if (
          Math.abs(next.width - lastCommitted.width) < 96 &&
          Math.abs(next.height - lastCommitted.height) < 96 &&
          next.radius === lastCommitted.radius
        ) {
          return;
        }

        if (resizeTimerRef.current !== null) {
          window.clearTimeout(resizeTimerRef.current);
        }
        resizeTimerRef.current = window.setTimeout(() => {
          resizeTimerRef.current = null;
          const settled = measure();
          if (
            settled.width > 0 &&
            settled.height > 0 &&
            (Math.abs(settled.width - lastCommitted.width) >= 96 ||
              Math.abs(settled.height - lastCommitted.height) >= 96 ||
              settled.radius !== lastCommitted.radius)
          ) {
            lastCommitted = settled;
            setSize(settled);
          }
        }, 250);
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
  }, [variant, realGlassMode]);

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
    let throttleTimer: number | null = null;
    let lastUpdateMs = 0;
    let lastClientX = -9999;
    let lastClientY = -9999;

    const flush = () => {
      rafRef.current = null;
      const ev = pendingEvent;
      if (!ev) return;

      const now = performance.now();
      const elapsed = now - lastUpdateMs;
      if (lastUpdateMs > 0 && elapsed < 32) {
        if (throttleTimer === null) {
          throttleTimer = window.setTimeout(() => {
            throttleTimer = null;
            if (pendingEvent && rafRef.current === null) {
              rafRef.current = window.requestAnimationFrame(flush);
            }
          }, 32 - elapsed);
        }
        return;
      }

      pendingEvent = null;
      lastUpdateMs = now;
      lastClientX = ev.clientX;
      lastClientY = ev.clientY;

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
      if (lastClientX !== -9999 && Math.hypot(ev.clientX - lastClientX, ev.clientY - lastClientY) < 4) {
        return;
      }
      pendingEvent = ev;
      if (rafRef.current === null) {
        rafRef.current = window.requestAnimationFrame(flush);
      }
    };

    const onMouseLeave = () => {
      pendingEvent = null;
      lastClientX = -9999;
      lastClientY = -9999;
      if (throttleTimer !== null) {
        window.clearTimeout(throttleTimer);
        throttleTimer = null;
      }
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
      if (throttleTimer !== null) {
        window.clearTimeout(throttleTimer);
        throttleTimer = null;
      }
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
  const effectiveMode =
    realGlassMode === 'shader' && Math.max(size.width, size.height) > 440
      ? 'standard'
      : realGlassMode;
  const glassKey =
    effectiveMode === 'shader'
      ? `shader-${Math.round(size.width / 256)}x${Math.round(size.height / 256)}`
      : effectiveMode;
  const spacerStyle = useMemo<React.CSSProperties>(
    () => ({ width: size.width, height: size.height, pointerEvents: 'none' }),
    [size.width, size.height]
  );

  return (
    <div
      ref={anchorRef}
      aria-hidden="true"
      data-variant={variant}
      className={`rdev-lg-layer pointer-events-none absolute inset-0 ${
        effectiveElasticity > 0 ? 'overflow-visible' : 'overflow-hidden'
      } ${className}`}
      style={LAYER_HOST_STYLE}
    >
      {isVisible && size.width >= 12 && size.height >= 12 && (
        <LiquidGlass
          key={glassKey}
          displacementScale={effectiveDisplacement}
          blurAmount={effectiveBlur}
          saturation={glassSaturation}
          aberrationIntensity={aberrationIntensity}
          elasticity={effectiveElasticity}
          cornerRadius={effectiveRadius}
          overLight={isLightTheme}
          mode={effectiveMode}
          padding="0px"
          globalMousePos={pointer.global}
          mouseOffset={pointer.offset}
          style={LIQUID_GLASS_STYLE}
        >
          <div style={spacerStyle} />
        </LiquidGlass>
      )}
    </div>
  );
};

const LiquidGlassLayerInner = React.memo(LiquidGlassLayerInnerComponent);

export const LiquidGlassLayer: React.FC<LiquidGlassLayerProps> = React.memo(
  ({ disabled = false, alwaysRender = false, ...props }) => {
    const useRealLiquidGlass = useChatStore((s) => s.liquidGlass.useRealLiquidGlass);
    const reduceTransparency = useChatStore((s) => s.liquidGlass.reduceTransparency);
    const realGlassQuality = useChatStore((s) => s.liquidGlass.realGlassQuality);

    if (!useRealLiquidGlass || reduceTransparency || disabled) {
      return null;
    }

    const variant = props.variant ?? 'surface';
    const variantAllowed =
      alwaysRender ||
      realGlassQuality === 'all' ||
      (realGlassQuality === 'balanced' && BALANCED_VARIANTS.has(variant)) ||
      MINIMAL_VARIANTS.has(variant);

    if (!variantAllowed) {
      return null;
    }

    return <LiquidGlassLayerInner {...props} />;
  }
);
