import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      keyframes: {
        scaleIn: {
          "0%":   { transform: "scale(0.4)", opacity: "0" },
          "100%": { transform: "scale(1)",   opacity: "1" },
        },
        fadeIn: {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
      animation: {
        scaleIn: "scaleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
        fadeIn:  "fadeIn 0.3s ease forwards",
      },
      colors: {
        dataset: { DEFAULT: "#3b82f6", light: "#dbeafe", dark: "#1e40af" },
        schema: { DEFAULT: "#8b5cf6", light: "#ede9fe", dark: "#5b21b6" },
        fieldgroup: { DEFAULT: "#22c55e", light: "#dcfce7", dark: "#15803d" },
        flow: { DEFAULT: "#f97316", light: "#ffedd5", dark: "#c2410c" },
        identity: { DEFAULT: "#0ea5e9", light: "#e0f2fe", dark: "#0369a1" },
      },
    },
  },
  plugins: [],
};

export default config;
