/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#030610', // Sidebar almost-black blue
          900: '#060B19', // Main dark navy background
          850: '#0B1326', // Card deep blue-graphite
          800: '#101B33', // Card elevated surface
          700: '#1A2744', // Subtle borders & hover states
        },
        electric: {
          500: '#3B82F6',
          600: '#2563EB',
          400: '#60A5FA',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
