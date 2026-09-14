/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        ink: {
          50: '#f7f7f8',
          100: '#eeeef0',
          200: '#d6d6da',
          300: '#b1b1b8',
          400: '#8287b',
          500: '#5b5d6e',
          600: '#3f4151',
          700: '#2a2c3a',
          800: '#191a26',
          900: '#0d0e17',
          950: '#070710',
        },
        haze: {
          50: '#f8f7f4',
          100: '#efece4',
          200: '#ddd7c9',
          300: '#c4bba5',
          400: '#a89a7c',
          500: '#897a5b',
          600: '#6a5d44',
        },
        amber: {
          DEFAULT: '#F1E05A',
          50: '#fbf8e3',
          100: '#f7f1c4',
          200: '#f3e98d',
          300: '#f0e266',
          400: '#eeda3f',
          500: '#F1E05A',
          600: '#c9b13a',
          700: '#9a872e',
          800: '#6b5d20',
        },
        accent: {
          violet: '#7c5cff',
          rose: '#ff7a8a',
          mint: '#5fe3a1',
          sky: '#5fc3ff',
        },
      },
      fontFamily: {
        sans: [
          '"Inter Variable"',
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'sans-serif',
        ],
        mono: [
          '"JetBrains Mono Variable"',
          '"JetBrains Mono"',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          'monospace',
        ],
        display: [
          '"Inter Variable"',
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'sans-serif',
        ],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.04em' }],
        'display-sm': ['clamp(2.5rem, 5vw + 1rem, 3.5rem)', { lineHeight: '1.04', letterSpacing: '-0.035em' }],
        'display-md': ['clamp(3rem, 6vw + 1rem, 4.5rem)', { lineHeight: '1.02', letterSpacing: '-0.04em' }],
        'display-lg': ['clamp(3.5rem, 7vw + 1rem, 6rem)', { lineHeight: '1.0', letterSpacing: '-0.045em' }],
      },
      letterSpacing: {
        tightest: '-0.05em',
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      boxShadow: {
        'glow-amber': '0 0 0 1px rgba(241, 224, 90, 0.16), 0 16px 48px -16px rgba(241, 224, 90, 0.4)',
        'soft': '0 1px 0 rgba(255,255,255,0.04), 0 24px 60px -20px rgba(0,0,0,0.6)',
        'panel': '0 1px 0 rgba(255,255,255,0.06) inset, 0 0 0 1px rgba(255,255,255,0.05), 0 24px 80px -24px rgba(0,0,0,0.5)',
      },
      backgroundImage: {
        'grid': 'linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px)',
        'radial-fade': 'radial-gradient(ellipse at top, rgba(241,224,90,0.10), transparent 60%)',
        'noise': "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.04 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
      },
      backgroundSize: {
        'grid-sm': '32px 32px',
      },
      animation: {
        'float-slow': 'float 14s ease-in-out infinite',
        'pulse-soft': 'pulse-soft 3.5s ease-in-out infinite',
        'shimmer': 'shimmer 8s linear infinite',
        'draw': 'draw 1.6s ease-out forwards',
        'fade-up': 'fade-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) both',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translate3d(0,0,0)' },
          '50%': { transform: 'translate3d(0,-12px,0)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '0.5' },
          '50%': { opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '0% 50%' },
          '100%': { backgroundPosition: '200% 50%' },
        },
        draw: {
          from: { strokeDashoffset: '300' },
          to: { strokeDashoffset: '0' },
        },
        'fade-up': {
          from: { opacity: '0', transform: 'translate3d(0, 18px, 0)' },
          to: { opacity: '1', transform: 'translate3d(0, 0, 0)' },
        },
      },
    },
  },
  plugins: [],
};