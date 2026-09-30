import type { Config } from 'tailwindcss';

// Apple-style design tokens
export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#1d1d1f',
        mute: '#6e6e73',
        faint: '#707075', // ≥4.5:1 on #f5f5f7 (WCAG AA)
        paper: '#f5f5f7',
        line: '#d2d2d7',
        blue: { DEFAULT: '#0071e3', hover: '#0077ed', link: '#0066cc', soft: '#e8f2fd' },
        eyebrow: '#b64400',
        good: '#1a7f37',
        warn: '#b64400',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Text"', '"SF Pro Icons"', '"Helvetica Neue"', 'Helvetica', 'Arial', 'sans-serif'],
        display: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Display"', '"Helvetica Neue"', 'Helvetica', 'Arial', 'sans-serif'],
        mono: ['"SF Mono"', 'ui-monospace', 'Menlo', 'monospace'],
      },
      borderRadius: { apple: '18px' },
      boxShadow: {
        tile: '2px 4px 12px rgba(0,0,0,0.08)',
        tilehover: '2px 4px 16px rgba(0,0,0,0.16)',
      },
      letterSpacing: { tightest: '-0.03em', headline: '-0.015em' },
    },
  },
  plugins: [],
} satisfies Config;
