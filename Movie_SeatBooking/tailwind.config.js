/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        fps: {
          ink: '#080706',
          slate: '#131110',
          border: '#26221f',
          crimson: '#d83128',
          'crimson-hover': '#b8241c',
          paper: '#eee9df',
          sepia: '#8c867e',
          mute: '#8c867e',
          line: '#26221f',
          black: '#080706',
          surface: '#131110',
          screenglow: '#fffbf0',
          charcoal: '#221f1d',
          'charcoal-border': '#332e2b',
          bronze: '#3a2c20',
          'bronze-border': '#5c4633',
          sunken: '#0d0c0b',
        },
        rvu: {
          crimson: '#d83128',
          accent: '#d83128',
          dark: '#080706',
          surface: '#131110',
          card: '#131110',
          border: '#26221f',
        }
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
        mono: ['"DM Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}
