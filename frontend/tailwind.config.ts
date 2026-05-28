import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    // Explicit paths — avoid globs that traverse (app) or [id] dirs,
    // which Tailwind v3 misinterprets as glob groups / character classes.
    "./src/app/layout.tsx",
    "./src/app/globals.css",
    "./src/app/login/**/*.{ts,tsx}",
    "./src/app/access-denied/**/*.{ts,tsx}",
    "./src/app/(app)/layout.tsx",
    "./src/app/(app)/page.tsx",
    "./src/app/(app)/settings/**/*.{ts,tsx}",
    "./src/app/(app)/scripts/page.tsx",
    "./src/app/(app)/scripts/components/**/*.{ts,tsx}",
    "./src/app/(app)/scripts/_detail/**/*.{ts,tsx}",
    "./src/app/(app)/scripts/[id]/page.tsx",
    "./src/shared/**/*.{ts,tsx}",
    "./src/hooks/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
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
        neutral: {
          50:  "#f8f9fb",
          100: "#f1f3f7",
          200: "#e2e7ef",
          300: "#c8d3e3",
          400: "#9BAFD0",
          500: "#6b82a4",
          600: "#4a5f7e",
          700: "#334260",
          800: "#1D578C",
          900: "#001441",
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
