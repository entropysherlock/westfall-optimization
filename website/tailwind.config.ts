import type { Config } from "tailwindcss";

/**
 * Westfall Optimization design tokens.
 * Light, restrained palette: white and slate surfaces, navy/charcoal text, teal accents.
 * Legacy token names (ink = surfaces, fog = text, cyan = accent) are kept so that every existing
 * component adopts the design system consistently.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // surfaces (light → slightly darker)
        ink: { 950: "#ffffff", 900: "#f8fafc", 850: "#f3f6fa", 800: "#edf1f6", 700: "#e2e8f0", 600: "#cbd5e1" },
        line: "#e2e8f0",
        // text (strong → muted)
        fog: { 100: "#0b1526", 300: "#334155", 400: "#475569", 500: "#64748b" },
        // accent (teal)
        cyan: { 300: "#0f766e", 400: "#0d9488", 500: "#115e59" },
        navy: { 950: "#07111f", 900: "#0b1a2e", 850: "#0f2238", 800: "#14304d", 700: "#1d4063", 600: "#2c5680" },
        accent: { 50: "#effaf8", 100: "#d5f2ed", 300: "#5ccdbd", 400: "#2bb3a1", 500: "#0d9488", 600: "#0f766e", 700: "#115e59" },
        signal: { red: "#b42318", amber: "#b54708", green: "#067647", violet: "#5b3fb8" },
      },
      fontFamily: {
        sans: ['"Inter Variable"', "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "SFMono-Regular", "monospace"],
      },
      maxWidth: { page: "76rem" },
      boxShadow: {
        panel: "0 1px 2px rgba(15, 23, 42, .04), 0 1px 1px rgba(15, 23, 42, .03)",
        lift: "0 12px 32px -16px rgba(15, 23, 42, .18)",
      },
    },
  },
  plugins: [],
};
export default config;
