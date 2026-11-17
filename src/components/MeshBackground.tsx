import React from 'react';
import { useChatStore } from '../store/useChatStore';

export const MeshBackground: React.FC = () => {
  const theme = useChatStore((s) => s.theme);

  if (theme === 'mono') {
    return (
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 overflow-hidden bg-[#050507]/95 transition-colors duration-500"
      >
        <div
          className="animate-mesh-slow absolute -left-24 -top-24 h-[520px] w-[520px] rounded-full opacity-40 blur-[120px]"
          style={{
            background:
              'radial-gradient(circle, rgba(255, 255, 255, 0.24) 0%, rgba(161, 161, 170, 0.10) 45%, transparent 75%)',
          }}
        />
        <div
          className="animate-mesh-slow-rev absolute -bottom-32 right-[-60px] h-[560px] w-[560px] rounded-full opacity-35 blur-[130px]"
          style={{
            background:
              'radial-gradient(circle, rgba(212, 212, 216, 0.20) 0%, rgba(113, 113, 122, 0.10) 50%, transparent 75%)',
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
          className="animate-mesh-slow absolute -left-24 -top-24 h-[520px] w-[520px] rounded-full opacity-55 blur-[110px]"
          style={{
            background:
              'radial-gradient(circle, rgba(6, 78, 59, 0.95) 0%, rgba(16, 185, 129, 0.25) 45%, transparent 75%)',
          }}
        />
        {/* Deep Lime radial mesh orb */}
        <div
          className="animate-mesh-slow-rev absolute -bottom-32 right-[-60px] h-[560px] w-[560px] rounded-full opacity-50 blur-[120px]"
          style={{
            background:
              'radial-gradient(circle, rgba(20, 83, 45, 0.95) 0%, rgba(34, 197, 94, 0.22) 50%, transparent 75%)',
          }}
        />
        {/* Subtle center-right glow */}
        <div
          className="animate-mesh-slow absolute left-1/2 top-1/3 h-[380px] w-[380px] -translate-x-1/2 rounded-full opacity-25 blur-[120px]"
          style={{
            background:
              'radial-gradient(circle, rgba(16, 185, 129, 0.5) 0%, transparent 70%)',
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
        className="animate-mesh-slow absolute -left-20 -top-20 h-[500px] w-[500px] rounded-full opacity-55 blur-[100px]"
        style={{
          background:
            'radial-gradient(circle, rgba(167, 243, 208, 0.95) 0%, rgba(34, 197, 94, 0.22) 55%, transparent 75%)',
        }}
      />
      <div
        className="animate-mesh-slow-rev absolute -bottom-24 right-0 h-[520px] w-[520px] rounded-full opacity-50 blur-[110px]"
        style={{
          background:
            'radial-gradient(circle, rgba(187, 247, 208, 0.95) 0%, rgba(16, 185, 129, 0.2) 55%, transparent 75%)',
        }}
      />
    </div>
  );
};
