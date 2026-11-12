import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { 950: "#04060c", 900: "#070b16", 850: "#0a1020", 800: "#0d1428", 700: "#141d36", 600: "#1d2947" },
        line: "#1b2643",
        fog: { 100: "#e8ecf5", 300: "#b8c1d6", 400: "#8d97ad", 500: "#6b7590" },
        cyan: { 300: "#7dd3fc", 400: "#38bdf8", 500: "#0ea5e9" },
        signal: { red: "#f87171", amber: "#fbbf24", green: "#4ade80", violet: "#a78bfa" },
      },
      fontFamily: {
        sans: ['"Inter Variable"', "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "SFMono-Regular", "monospace"],
      },
      maxWidth: { page: "76rem" },
    },
  },
  plugins: [],
};
export default config;
