import React from 'react';
import { useChatStore } from '../store/useChatStore';

export const MeshBackground: React.FC = () => {
  const theme = useChatStore((s) => s.theme);

  if (theme === 'ocean') {
    return (
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden bg-[#07111F]/95 transition-colors duration-500">
        <div className="animate-mesh-slow absolute -left-24 -top-24 h-[560px] w-[560px] rounded-full opacity-60 blur-[120px]" style={{ background: 'radial-gradient(circle, rgba(14,165,233,.85) 0%, rgba(37,99,235,.28) 48%, transparent 72%)' }} />
        <div className="animate-mesh-slow-rev absolute -bottom-28 right-[-40px] h-[600px] w-[600px] rounded-full opacity-55 blur-[130px]" style={{ background: 'radial-gradient(circle, rgba(45,212,191,.75) 0%, rgba(8,145,178,.25) 52%, transparent 75%)' }} />
      </div>
    );
  }

  if (theme === 'sunset') {
    return (
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden bg-[#150B20]/95 transition-colors duration-500">
        <div className="animate-mesh-slow absolute -left-20 -top-20 h-[540px] w-[540px] rounded-full opacity-60 blur-[120px]" style={{ background: 'radial-gradient(circle, rgba(249,115,22,.82) 0%, rgba(236,72,153,.28) 48%, transparent 72%)' }} />
        <div className="animate-mesh-slow-rev absolute -bottom-24 right-[-20px] h-[580px] w-[580px] rounded-full opacity-55 blur-[130px]" style={{ background: 'radial-gradient(circle, rgba(168,85,247,.78) 0%, rgba(244,63,94,.24) 52%, transparent 75%)' }} />
      </div>
    );
  }

  if (theme === 'rose') {
    return (
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden bg-[#1A0B12]/95 transition-colors duration-500">
        <div className="animate-mesh-slow absolute -left-24 -top-24 h-[520px] w-[520px] rounded-full opacity-55 blur-[120px]" style={{ background: 'radial-gradient(circle, rgba(244,63,94,.78) 0%, rgba(190,24,93,.28) 48%, transparent 72%)' }} />
        <div className="animate-mesh-slow-rev absolute -bottom-28 right-[-40px] h-[600px] w-[600px] rounded-full opacity-50 blur-[130px]" style={{ background: 'radial-gradient(circle, rgba(251,113,133,.72) 0%, rgba(217,70,239,.20) 52%, transparent 75%)' }} />
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
          className="animate-mesh-slow absolute -left-20 -top-20 h-[520px] w-[520px] rounded-full opacity-45 blur-[110px]"
          style={{
            background:
              'radial-gradient(circle, rgba(63, 63, 70, 0.75) 0%, rgba(39, 39, 42, 0.28) 55%, transparent 75%)',
          }}
        />
        <div
          className="animate-mesh-slow-rev absolute -bottom-24 right-0 h-[560px] w-[560px] rounded-full opacity-40 blur-[120px]"
          style={{
            background:
              'radial-gradient(circle, rgba(82, 82, 91, 0.65) 0%, rgba(24, 24, 27, 0.32) 55%, transparent 75%)',
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
          className="animate-mesh-slow absolute -left-20 -top-20 h-[500px] w-[500px] rounded-full opacity-70 blur-[110px]"
          style={{
            background:
              'radial-gradient(circle, rgba(212, 212, 216, 0.9) 0%, rgba(161, 161, 170, 0.28) 55%, transparent 75%)',
          }}
        />
        <div
          className="animate-mesh-slow-rev absolute -bottom-24 right-0 h-[520px] w-[520px] rounded-full opacity-60 blur-[120px]"
          style={{
            background:
              'radial-gradient(circle, rgba(228, 228, 231, 0.9) 0%, rgba(113, 113, 122, 0.22) 55%, transparent 75%)',
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
