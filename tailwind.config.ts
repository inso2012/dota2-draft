import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'game-bg': '#0a0e17',
        'game-panel': '#111827',
        'game-border': '#1f2937',
        'game-gold': '#c89b3c',
        'game-gold-light': '#f0c060',
        'radiant': '#3b82f6',
        'radiant-dark': '#1d4ed8',
        'radiant-glow': '#60a5fa',
        'dire': '#ef4444',
        'dire-dark': '#b91c1c',
        'dire-glow': '#f87171',
        'hero-hover': '#1e293b',
        'banned': '#1a1a1a',
        'picked': '#0f172a',
      },
      fontFamily: {
        game: ['var(--font-game)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'radiant': '0 0 12px rgba(59, 130, 246, 0.5)',
        'dire': '0 0 12px rgba(239, 68, 68, 0.5)',
        'gold': '0 0 12px rgba(200, 155, 60, 0.4)',
      },
    },
  },
  plugins: [],
};

export default config;
