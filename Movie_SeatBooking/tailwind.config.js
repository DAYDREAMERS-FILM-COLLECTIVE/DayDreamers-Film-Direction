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
          ink: '#11100f',
          paper: '#eee9df',
          red: '#d83128',
          mute: '#9f9b94',
          line: '#c9c3b8',
          black: '#11100f',
          surface: '#171513',
          border: '#2a2622',
          crimson: '#d83128',
          'crimson-hover': '#b8241c',
          muted: '#9f9b94',
          charcoal: '#22201d',
          'charcoal-border': '#37342f',
          bronze: '#2d241e',
          'bronze-border': '#5c4738',
          sunken: '#13110f',
        },
        rvu: {
          crimson: '#d83128',
          accent: '#d83128',
          dark: '#11100f',
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
