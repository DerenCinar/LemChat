import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
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
  'panel',
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
  const resizeTimerRef = useRef<number | null>(null);

  const theme = useChatStore((s) => s.theme);
  const blur = useChatStore((s) => s.liquidGlass.blur);
  const realGlassMode = useChatStore((s) => s.liquidGlass.realGlassMode);
  const refractionScale = useChatStore((s) => s.liquidGlass.refractionScale);
  const aberrationIntensity = useChatStore((s) => s.liquidGlass.aberrationIntensity);
  const glassSaturation = useChatStore((s) => s.liquidGlass.glassSaturation);
  const reduceMotion = useChatStore((s) => s.liquidGlass.reduceMotion);

  const [size, setSize] = useState<MeasuredSize>({ width: 0, height: 0, radius: 20 });
  const [isVisible, setIsVisible] = useState(true);

  useLayoutEffect(() => {
    const host = anchorRef.current?.parentElement;
    if (!host) return;
    if (interactive && !reduceMotion) {
      host.setAttribute('data-glass-interactive', 'true');
    } else {
      host.removeAttribute('data-glass-interactive');
    }
    return () => {
      host.removeAttribute('data-glass-interactive');
    };
  }, [interactive, reduceMotion]);

  useLayoutEffect(() => {
    const anchor = anchorRef.current;
    const host = anchor?.parentElement;
    if (!host) return;

    host.setAttribute('data-real-glass-host', variant);
    const isShaderEligible = realGlassMode === 'shader' && variant !== 'panel';

    const measure = (): MeasuredSize => {
      // offsetWidth/offsetHeight ignores active CSS transform scales during modal/popover entrance springs
      let width = Math.round(host.offsetWidth);
      let height = Math.round(host.offsetHeight);
      if (width === 0 || height === 0) {
        const rect = host.getBoundingClientRect();
        width = Math.round(rect.width);
        height = Math.round(rect.height);
      }
      const computed = window.getComputedStyle(host);
      const parsedRadius = parseFloat(computed.borderTopLeftRadius);
      return {
        width,
        height,
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
    const needsResizeObserver = isShaderEligible || !hasInitialValidSize;
    if (needsResizeObserver && typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => {
        const next = measure();
        const hadValidSize = lastCommitted.width >= 12 && lastCommitted.height >= 12;

        if (!hadValidSize) {
          if (next.width > 0 && next.height > 0) {
            lastCommitted = next;
            setSize(next);
            const nextEffectiveShader = isShaderEligible && Math.max(next.width, next.height) <= 360;
            if (!nextEffectiveShader) {
              ro?.disconnect();
              ro = null;
            }
          }
          return;
        }

        // For non-shader modes, CSS 100% sizing handles growth without re-measuring or remounting
        if (!isShaderEligible) {
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

  const effectiveMode =
    realGlassMode === 'shader' && (variant === 'panel' || Math.max(size.width, size.height) > 360)
      ? 'standard'
      : realGlassMode;

  useLayoutEffect(() => {
    if (!isVisible || size.width < 12 || size.height < 12) return;
    // Shrink liquid-glass-react's default 170%x170% filter bounds to minimize GPU backdrop reads per frame
    const filterEl = anchorRef.current?.querySelector('filter');
    if (filterEl) {
      filterEl.setAttribute('x', '-4%');
      filterEl.setAttribute('y', '-4%');
      filterEl.setAttribute('width', '108%');
      filterEl.setAttribute('height', '108%');
    }
  }, [isVisible, size.width, size.height, effectiveMode]);

  const isLightTheme = theme === 'light' || theme === 'mono';
  const rawBlur = Math.min(1, Math.max(0, blur / 96));
  const effectiveBlur =
    variant === 'panel'
      ? Math.min(0.32, rawBlur)
      : variant === 'rail'
        ? Math.min(0.45, rawBlur)
        : rawBlur;
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
  const maxAllowedRadius =
    size.width > 0 && size.height > 0
      ? Math.floor(Math.min(size.width, size.height) / 2)
      : 24;
  const effectiveRadius = Math.max(
    0,
    Math.min(cornerRadius ?? size.radius, maxAllowedRadius)
  );
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
      className={`rdev-lg-layer pointer-events-none absolute -inset-[1px] overflow-hidden ${className}`}
      style={LAYER_HOST_STYLE}
    >
      {isVisible && size.width >= 12 && size.height >= 12 && (
        <LiquidGlass
          key={glassKey}
          displacementScale={effectiveDisplacement}
          blurAmount={effectiveBlur}
          saturation={glassSaturation}
          aberrationIntensity={aberrationIntensity}
          elasticity={0}
          cornerRadius={effectiveRadius}
          overLight={isLightTheme}
          mode={effectiveMode}
          padding="0px"
          globalMousePos={ZERO_POS}
          mouseOffset={ZERO_POS}
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
