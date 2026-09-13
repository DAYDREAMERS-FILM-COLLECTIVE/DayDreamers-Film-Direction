import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        void: "#060814",            // Midnight Blue
        "plum-deep": "#120E15",     // Deep Plum
        "bone-white": "#E8E3D9",    // Bone White
        "crimson-accent": "#C92A42",// Crimson
        "gold-muted": "#D4AF37",    // Muted Gold
        surface: "#0c0f1d",
        "surface-card": "rgba(18, 14, 21, 0.75)",
        "editorial-muted": "#85817a",
        "editorial-border": "rgba(232, 227, 217, 0.12)",
      },
      fontFamily: {
        serif: ["Instrument Serif", "Didot", "Georgia", "serif"],
        sans: ["var(--font-geist-sans)", "Space Grotesk", "-apple-system", "sans-serif"],
        mono: ["var(--font-geist-mono)", "JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
