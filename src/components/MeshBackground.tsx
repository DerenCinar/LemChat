import React from 'react';
import { useChatStore } from '../store/useChatStore';

export const MeshBackground: React.FC = React.memo(() => {
  const theme = useChatStore((s) => s.theme);
  const wallpaper = useChatStore((s) => s.liquidGlass.wallpaper);
  const ambientMotion = useChatStore((s) => s.liquidGlass.ambientMotion);

  if (wallpaper) {
    return (
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 overflow-hidden transition-colors duration-500"
        style={{
          backgroundImage: `linear-gradient(rgba(3, 10, 7, 0.18), rgba(3, 10, 7, 0.18)), url("${wallpaper}")`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {ambientMotion && (
          <>
            <div
              className="animate-mesh-slow will-change-transform absolute -left-32 -top-32 h-[680px] w-[680px] rounded-full"
              style={{
                background:
                  'radial-gradient(circle, rgba(110, 231, 183, 0.22) 0%, rgba(110, 231, 183, 0.08) 38%, transparent 72%)',
              }}
            />
            <div
              className="animate-mesh-slow-rev will-change-transform absolute -bottom-32 -right-24 h-[700px] w-[700px] rounded-full"
              style={{
                background:
                  'radial-gradient(circle, rgba(103, 232, 249, 0.18) 0%, rgba(103, 232, 249, 0.06) 38%, transparent 72%)',
              }}
            />
          </>
        )}
      </div>
    );
  }

  if (theme === 'ocean') {
    return (
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden bg-[#07111F]/95 transition-colors duration-500">
        <div
          className="animate-mesh-slow will-change-transform absolute -left-36 -top-36 h-[740px] w-[740px] rounded-full opacity-60"
          style={{
            background:
              'radial-gradient(circle, rgba(14, 165, 233, 0.72) 0%, rgba(37, 99, 235, 0.26) 38%, transparent 72%)',
          }}
        />
        <div
          className="animate-mesh-slow-rev will-change-transform absolute -bottom-40 right-[-90px] h-[780px] w-[780px] rounded-full opacity-55"
          style={{
            background:
              'radial-gradient(circle, rgba(45, 212, 191, 0.65) 0%, rgba(8, 145, 178, 0.22) 38%, transparent 72%)',
          }}
        />
      </div>
    );
  }

  if (theme === 'sunset') {
    return (
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden bg-[#150B20]/95 transition-colors duration-500">
        <div
          className="animate-mesh-slow will-change-transform absolute -left-32 -top-32 h-[720px] w-[720px] rounded-full opacity-60"
          style={{
            background:
              'radial-gradient(circle, rgba(249, 115, 22, 0.7) 0%, rgba(236, 72, 153, 0.26) 38%, transparent 72%)',
          }}
        />
        <div
          className="animate-mesh-slow-rev will-change-transform absolute -bottom-36 right-[-70px] h-[760px] w-[760px] rounded-full opacity-55"
          style={{
            background:
              'radial-gradient(circle, rgba(168, 85, 247, 0.68) 0%, rgba(244, 63, 94, 0.22) 38%, transparent 72%)',
          }}
        />
      </div>
    );
  }

  if (theme === 'rose') {
    return (
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden bg-[#1A0B12]/95 transition-colors duration-500">
        <div
          className="animate-mesh-slow will-change-transform absolute -left-36 -top-36 h-[700px] w-[700px] rounded-full opacity-55"
          style={{
            background:
              'radial-gradient(circle, rgba(244, 63, 94, 0.66) 0%, rgba(190, 24, 93, 0.26) 38%, transparent 72%)',
          }}
        />
        <div
          className="animate-mesh-slow-rev will-change-transform absolute -bottom-40 right-[-90px] h-[780px] w-[780px] rounded-full opacity-50"
          style={{
            background:
              'radial-gradient(circle, rgba(251, 113, 133, 0.62) 0%, rgba(217, 70, 239, 0.18) 38%, transparent 72%)',
          }}
        />
      </div>
    );
  }

  if (theme === 'mono-dark') {
    return (
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 overflow-hidden bg-[#09090B]/95 transition-colors duration-500"
      >
        <div
          className="animate-mesh-slow will-change-transform absolute -left-32 -top-32 h-[700px] w-[700px] rounded-full opacity-45"
          style={{
            background:
              'radial-gradient(circle, rgba(63, 63, 70, 0.72) 0%, rgba(39, 39, 42, 0.26) 38%, transparent 72%)',
          }}
        />
        <div
          className="animate-mesh-slow-rev will-change-transform absolute -bottom-36 -right-20 h-[740px] w-[740px] rounded-full opacity-40"
          style={{
            background:
              'radial-gradient(circle, rgba(82, 82, 91, 0.62) 0%, rgba(24, 24, 27, 0.28) 38%, transparent 72%)',
          }}
        />
      </div>
    );
  }

  if (theme === 'mono') {
    return (
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 overflow-hidden bg-[#F4F4F5]/90 transition-colors duration-500"
      >
        <div
          className="animate-mesh-slow will-change-transform absolute -left-32 -top-32 h-[680px] w-[680px] rounded-full opacity-70"
          style={{
            background:
              'radial-gradient(circle, rgba(212, 212, 216, 0.85) 0%, rgba(161, 161, 170, 0.26) 38%, transparent 72%)',
          }}
        />
        <div
          className="animate-mesh-slow-rev will-change-transform absolute -bottom-36 -right-20 h-[700px] w-[700px] rounded-full opacity-60"
          style={{
            background:
              'radial-gradient(circle, rgba(228, 228, 231, 0.85) 0%, rgba(113, 113, 122, 0.2) 38%, transparent 72%)',
          }}
        />
      </div>
    );
  }

  if (theme === 'dark') {
    return (
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 overflow-hidden bg-[#090F0C]/90 transition-colors duration-500"
      >
        {/* Deep Emerald radial mesh orb */}
        <div
          className="animate-mesh-slow will-change-transform absolute -left-36 -top-36 h-[700px] w-[700px] rounded-full opacity-55"
          style={{
            background:
              'radial-gradient(circle, rgba(6, 78, 59, 0.88) 0%, rgba(16, 185, 129, 0.24) 38%, transparent 72%)',
          }}
        />
        {/* Deep Lime radial mesh orb */}
        <div
          className="animate-mesh-slow-rev will-change-transform absolute -bottom-44 right-[-100px] h-[740px] w-[740px] rounded-full opacity-50"
          style={{
            background:
              'radial-gradient(circle, rgba(20, 83, 45, 0.88) 0%, rgba(34, 197, 94, 0.2) 38%, transparent 72%)',
          }}
        />
        {/* Subtle center-right glow */}
        <div
          className="animate-mesh-slow will-change-transform absolute left-1/2 top-1/3 h-[560px] w-[560px] -translate-x-1/2 rounded-full opacity-25"
          style={{
            background:
              'radial-gradient(circle, rgba(16, 185, 129, 0.48) 0%, rgba(16, 185, 129, 0.12) 38%, transparent 72%)',
          }}
        />
      </div>
    );
  }

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 overflow-hidden bg-[#F0FDF4]/85 transition-colors duration-500"
    >
      <div
        className="animate-mesh-slow will-change-transform absolute -left-32 -top-32 h-[680px] w-[680px] rounded-full opacity-55"
        style={{
          background:
            'radial-gradient(circle, rgba(167, 243, 208, 0.88) 0%, rgba(34, 197, 94, 0.2) 38%, transparent 72%)',
        }}
      />
      <div
        className="animate-mesh-slow-rev will-change-transform absolute -bottom-36 -right-20 h-[700px] w-[700px] rounded-full opacity-50"
        style={{
          background:
            'radial-gradient(circle, rgba(187, 247, 208, 0.88) 0%, rgba(16, 185, 129, 0.18) 38%, transparent 72%)',
        }}
      />
    </div>
  );
});
