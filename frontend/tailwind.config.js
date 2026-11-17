/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: {
          DEFAULT: '#F8F5EF',
          soft: '#FAF8F4',
          warm: '#F1ECE1',
        },
        surface: '#FFFFFF',
        ink: {
          DEFAULT: '#252722',
          muted: '#4A4944',
        },
        warmgray: {
          DEFAULT: '#77756F',
          light: '#9E9B93',
        },
        burnt: {
          DEFAULT: '#C56B3D',
          hover: '#AF5B30',
          light: '#F7EBE4',
        },
        coral: {
          DEFAULT: '#D9856C',
          light: '#F9EFEA',
        },
        terracotta: {
          DEFAULT: '#E9B29B',
          light: '#FBF4F0',
        },
        sage: {
          DEFAULT: '#537A60',
          light: '#EBF2ED',
        },
        crimson: {
          DEFAULT: '#B44C3B',
          light: '#F9ECEA',
        },
        sand: {
          DEFAULT: '#E8E2D8',
          strong: '#D6CFC2',
        },
      },
      fontFamily: {
        display: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
