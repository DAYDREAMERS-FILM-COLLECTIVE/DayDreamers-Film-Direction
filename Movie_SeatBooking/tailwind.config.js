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
          black: '#0e0d0c',
          surface: '#171513',
          border: '#2a2622',
          crimson: '#d83128',
          'crimson-hover': '#b8241c',
          paper: '#eee9df',
          muted: '#9f9b94',
          charcoal: '#22201d',
          'charcoal-border': '#3a3530',
          bronze: '#2d241e',
          'bronze-border': '#5c4738',
          sunken: '#131211',
        },
        rvu: {
          crimson: '#d83128',
          accent: '#d83128',
          dark: '#0e0d0c',
          surface: '#171513',
          card: '#171513',
          border: '#2a2622',
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
