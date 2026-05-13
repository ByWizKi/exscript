import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        extia: {
          yellow: "#FFD500",
          "yellow-hover": "#E6C000",
          night: "#001441",
          blue: {
            light: "#9BAFD0",
            mid: "#4379B3",
            dark: "#1D578C",
          },
          green: "#8DBC6A",
          cyan: "#56C3C3",
        },
      },
      fontFamily: {
        sans: ["Montserrat", "sans-serif"],
        mont: ["Mont Heavy", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
