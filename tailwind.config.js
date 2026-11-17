/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        lem: {
          lime: '#22C55E',
          emerald: '#10B981',
          mint: '#F0FDF4',
          forest: '#090F0C',
          deepEmerald: '#064E3B',
          deepLime: '#14532D',
        },
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Display"',
          '"Inter"',
          '"Segoe UI"',
          'Roboto',
          'sans-serif',
        ],
        mono: [
          '"JetBrains Mono"',
          '"SF Mono"',
          'Consolas',
          'monospace',
        ],
      },
      boxShadow: {
        'glass-dark': '0 8px 32px 0 rgba(0, 0, 0, 0.45), inset 0 1px 0 0 rgba(255, 255, 255, 0.14)',
        'glass-light': '0 8px 32px 0 rgba(6, 78, 59, 0.10), inset 0 1px 0 0 rgba(255, 255, 255, 0.75)',
        'lem-glow': '0 0 24px -4px rgba(34, 197, 94, 0.45), 0 0 12px -2px rgba(16, 185, 129, 0.35)',
        'lem-glow-sm': '0 0 14px -2px rgba(34, 197, 94, 0.4)',
      },
      keyframes: {
        meshFloat: {
          '0%, 100%': { transform: 'translate(0px, 0px) scale(1)' },
          '33%': { transform: 'translate(28px, -22px) scale(1.06)' },
          '66%': { transform: 'translate(-20px, 18px) scale(0.96)' },
        },
        meshFloatReverse: {
          '0%, 100%': { transform: 'translate(0px, 0px) scale(1)' },
          '33%': { transform: 'translate(-24px, 20px) scale(1.04)' },
          '66%': { transform: 'translate(22px, -16px) scale(0.95)' },
        },
      },
      animation: {
        'mesh-slow': 'meshFloat 18s ease-in-out infinite',
        'mesh-slow-rev': 'meshFloatReverse 22s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
