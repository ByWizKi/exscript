import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        extia: {
          yellow: "#FFD500",
          "yellow-hover": "#E6C000",
          "blue-light": "#9BAFD0",
          "blue-mid": "#4379B3",
          "blue-dark": "#1D578C",
          night: "#001441",
          green: "#8DBC6A",
          cyan: "#56C3C3",
        },
      },
      fontFamily: {
        heading: ["var(--font-heading)", "ui-sans-serif", "sans-serif"],
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
