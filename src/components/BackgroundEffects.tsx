import React, { useEffect, useRef } from 'react';
import { useChatStore } from '../store/useChatStore';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rot: number;
  vr: number;
  phase: number;
  color: string;
}

const LEAF_COLORS = ['#d97706', '#b45309', '#dc2626', '#ea580c', '#ca8a04', '#84cc16'];

const spawn = (kind: 'leaves' | 'snow' | 'rain', w: number, h: number, anywhere: boolean): Particle => {
  const y = anywhere ? Math.random() * h : -20;
  if (kind === 'rain') {
    return { x: Math.random() * (w + 100) - 50, y, vx: -2, vy: 14 + Math.random() * 8, size: 10 + Math.random() * 14, rot: 0, vr: 0, phase: 0, color: 'rgba(147,197,253,0.55)' };
  }
  if (kind === 'snow') {
    return { x: Math.random() * w, y, vx: 0, vy: 0.6 + Math.random() * 1.2, size: 1.5 + Math.random() * 3, rot: 0, vr: 0, phase: Math.random() * Math.PI * 2, color: 'rgba(255,255,255,0.85)' };
  }
  return {
    x: Math.random() * w, y, vx: 0, vy: 0.8 + Math.random() * 1.2, size: 6 + Math.random() * 8,
    rot: Math.random() * Math.PI * 2, vr: (Math.random() - 0.5) * 0.06, phase: Math.random() * Math.PI * 2,
    color: LEAF_COLORS[Math.floor(Math.random() * LEAF_COLORS.length)],
  };
};

export const BackgroundEffects: React.FC = React.memo(() => {
  const effect = useChatStore((s) => s.liquidGlass.backgroundEffect);
  const reduceMotion = useChatStore((s) => s.liquidGlass.reduceMotion);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !effect || effect === 'none' || reduceMotion) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0;
    let h = 0;
    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const count = effect === 'rain' ? 120 : effect === 'snow' ? 90 : 35;
    const parts: Particle[] = Array.from({ length: count }, () => spawn(effect, w, h, true));
    let raf = 0;
    let t = 0;

    const frame = () => {
      raf = requestAnimationFrame(frame);
      if (document.hidden) return;
      t += 0.016;
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        if (effect === 'rain') {
          p.x += p.vx;
          p.y += p.vy;
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x + p.vx * 1.2, p.y - p.size);
          ctx.stroke();
        } else if (effect === 'snow') {
          p.y += p.vy;
          p.x += Math.sin(t + p.phase) * 0.6;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        } else {
          p.y += p.vy;
          p.x += Math.sin(t * 1.4 + p.phase) * 1.1;
          p.rot += p.vr;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = 0.85;
          ctx.beginPath();
          ctx.moveTo(0, -p.size);
          ctx.bezierCurveTo(p.size, -p.size * 0.4, p.size * 0.7, p.size * 0.7, 0, p.size);
          ctx.bezierCurveTo(-p.size * 0.7, p.size * 0.7, -p.size, -p.size * 0.4, 0, -p.size);
          ctx.fill();
          ctx.restore();
        }
        if (p.y > h + 30 || p.x < -60 || p.x > w + 60) parts[i] = spawn(effect, w, h, false);
      }
    };
    frame();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      ctx.clearRect(0, 0, w, h);
    };
  }, [effect, reduceMotion]);

  if (!effect || effect === 'none' || reduceMotion) return null;
  return <canvas ref={canvasRef} aria-hidden className="pointer-events-none fixed inset-0 z-[1] h-full w-full" />;
});
BackgroundEffects.displayName = 'BackgroundEffects';
