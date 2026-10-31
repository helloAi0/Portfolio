/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        imperial: {
          950: '#07080a',
          900: '#0c0e12',
          850: '#11141a',
          800: '#161a22',
          700: '#222836',
          600: '#323a4d',
          500: '#48536c',
        },
        gold: {
          50: '#faf6eb',
          100: '#f3eacf',
          200: '#e8d59d',
          300: '#dbbe6b',
          400: '#cfa639',
          500: '#d4af37', // Macedonian imperial gold
          600: '#b89025',
          700: '#926e1c',
          800: '#75541c',
          900: '#61441c',
        },
        bronze: {
          300: '#c29b68',
          400: '#a77f48',
          500: '#8c6834',
          600: '#735227',
          700: '#583c1b',
        },
        marble: {
          light: '#f4f4f6',
          dark: '#1b1e25',
          border: 'rgba(212, 175, 55, 0.18)',
        }
      },
      fontFamily: {
        serif: ['var(--font-cinzel)', 'Cinzel', 'Trajan Pro', 'Georgia', 'serif'],
        sans: ['var(--font-plus-jakarta)', 'Plus Jakarta Sans', 'Inter', 'sans-serif'],
        mono: ['var(--font-jetbrains)', 'JetBrains Mono', 'monospace'],
      },
      backgroundImage: {
        'imperial-radial': 'radial-gradient(circle at 50% 20%, rgba(212, 175, 55, 0.08), transparent 70%)',
        'gold-gradient': 'linear-gradient(135deg, #d4af37 0%, #f3eacf 50%, #aa7c11 100%)',
        'bronze-gradient': 'linear-gradient(135deg, #c29b68 0%, #8c6834 100%)',
      },
      boxShadow: {
        'imperial-gold': '0 0 25px -5px rgba(212, 175, 55, 0.25)',
        'imperial-subtle': '0 10px 30px -10px rgba(0, 0, 0, 0.7)',
      },
      animation: {
        'pulse-subtle': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 2.5s linear infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        }
      }
    },
  },
  plugins: [],
};
