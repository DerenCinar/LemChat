import React, { useLayoutEffect, useRef, useState } from 'react';
import { useChatStore } from '../store/useChatStore';
import {
  acquireGlassFilter,
  observeSize,
  observeVisibility,
  quantizeDimension,
  releaseGlassFilter,
} from '../lib/liquidGlassEngine';

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

const MINIMAL_VARIANTS = new Set<LiquidGlassVariant>([
  'popover',
  'modal',
  'toast',
  'surface',
]);
const BALANCED_VARIANTS = new Set<LiquidGlassVariant>([
  'popover',
  'modal',
  'toast',
  'surface',
  'rail',
  'pill',
  'panel',
]);
const LAYER_HOST_STYLE: React.CSSProperties = {
  borderRadius: 'inherit',
  zIndex: -1,
};

const IS_FIREFOX =
  typeof navigator !== 'undefined' &&
  navigator.userAgent.toLowerCase().includes('firefox');

const LiquidGlassLayerInnerComponent: React.FC<LiquidGlassLayerProps> = ({
  variant = 'surface',
  interactive = false,
  className = '',
}) => {
  const anchorRef = useRef<HTMLDivElement | null>(null);

  const blur = useChatStore((s) => s.liquidGlass.blur);
  const realGlassMode = useChatStore((s) => s.liquidGlass.realGlassMode);
  const refractionScale = useChatStore((s) => s.liquidGlass.refractionScale);
  const aberrationIntensity = useChatStore(
    (s) => s.liquidGlass.aberrationIntensity
  );
  const glassSaturation = useChatStore((s) => s.liquidGlass.glassSaturation);
  const reduceMotion = useChatStore((s) => s.liquidGlass.reduceMotion);

  const [size, setSize] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });
  const [isVisible, setIsVisible] = useState(true);
  const [filterId, setFilterId] = useState<string | null>(null);

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

    let lastBucketW = 0;
    let lastBucketH = 0;
    const updateSize = (rawW: number, rawH: number) => {
      if (rawW < 12 || rawH < 12) return;
      const bw = quantizeDimension(rawW);
      const bh = quantizeDimension(rawH);
      if (bw !== lastBucketW || bh !== lastBucketH) {
        lastBucketW = bw;
        lastBucketH = bh;
        setSize({ width: rawW, height: rawH });
      }
    };

    updateSize(host.offsetWidth, host.offsetHeight);

    const stopVis = observeVisibility(host, setIsVisible);
    const stopSize = observeSize(host, updateSize);

    return () => {
      host.removeAttribute('data-real-glass-host');
      stopVis();
      stopSize();
    };
  }, [variant]);

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

  useLayoutEffect(() => {
    if (IS_FIREFOX || !isVisible || size.width < 12 || size.height < 12) {
      setFilterId(null);
      return;
    }

    const acquired = acquireGlassFilter({
      mode: realGlassMode,
      variant,
      width: size.width,
      height: size.height,
      displacementScale: effectiveDisplacement,
      aberrationIntensity,
    });

    if (!acquired) {
      setFilterId(null);
      return;
    }

    setFilterId(acquired.id);
    return () => {
      releaseGlassFilter(acquired.key);
    };
  }, [
    isVisible,
    size.width,
    size.height,
    realGlassMode,
    variant,
    effectiveDisplacement,
    aberrationIntensity,
  ]);

  // Cap Gaussian blur smoothly so large panels & scrollable bubbles compose at 60+ FPS
  const isLargeOrScrolling =
    variant === 'panel' || variant === 'rail' || variant === 'bubble';
  const effectiveBlurPx = isLargeOrScrolling
    ? Math.max(3, Math.min(18, Math.round(blur * 0.45)))
    : Math.max(4, Math.min(22, Math.round(blur * 0.65)));

  const warpStyle: React.CSSProperties = {
    backdropFilter: `blur(${effectiveBlurPx}px) saturate(${glassSaturation}%)`,
    WebkitBackdropFilter: `blur(${effectiveBlurPx}px) saturate(${glassSaturation}%)`,
    filter: filterId ? `url(#${filterId})` : undefined,
  };

  return (
    <div
      ref={anchorRef}
      aria-hidden="true"
      data-variant={variant}
      className={`rdev-lg-layer pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      style={LAYER_HOST_STYLE}
    >
      {isVisible && size.width >= 12 && size.height >= 12 && (
        <>
          <span className="lg-warp" style={warpStyle} />
          <span className="lg-rim" />
        </>
      )}
    </div>
  );
};

const LiquidGlassLayerInner = React.memo(LiquidGlassLayerInnerComponent);

export const LiquidGlassLayer: React.FC<LiquidGlassLayerProps> = React.memo(
  ({ disabled = false, alwaysRender = false, ...props }) => {
    const useRealLiquidGlass = useChatStore(
      (s) => s.liquidGlass.useRealLiquidGlass
    );
    const reduceTransparency = useChatStore(
      (s) => s.liquidGlass.reduceTransparency
    );
    const realGlassQuality = useChatStore(
      (s) => s.liquidGlass.realGlassQuality
    );

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
