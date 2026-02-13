import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dataset: { DEFAULT: "#3b82f6", light: "#dbeafe", dark: "#1e40af" },
        schema: { DEFAULT: "#8b5cf6", light: "#ede9fe", dark: "#5b21b6" },
        fieldgroup: { DEFAULT: "#22c55e", light: "#dcfce7", dark: "#15803d" },
        flow: { DEFAULT: "#f97316", light: "#ffedd5", dark: "#c2410c" },
      },
    },
  },
  plugins: [],
};

export default config;
