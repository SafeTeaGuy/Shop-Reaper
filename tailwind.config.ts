import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        reaper: {
          red:    "#D91A0F",
          red2:   "#FF2D20",
          orange: "#E07000",
          green:  "#00B85A",
          gold:   "#C9960A",
          bg:     "#080808",
          bg2:    "#0E0E0E",
          bg3:    "#141414",
          border: "#222222",
          border2:"#2A2724",
          text:   "#F0F0F0",
          muted:  "#999999",
          dim:    "#555555",
        },
      },
      fontFamily: {
        display: ["var(--font-bebas)", "sans-serif"],
        mono:    ["var(--font-dm-mono)", "monospace"],
        body:    ["var(--font-barlow)", "sans-serif"],
      },
      animation: {
        "pulse-red": "pulse-red 2s ease-in-out infinite",
        "float":     "float 4s ease-in-out infinite",
        "slide-up":  "slide-up 0.4s ease forwards",
        "fade-in":   "fade-in 0.3s ease forwards",
      },
      keyframes: {
        "pulse-red": {
          "0%,100%": { opacity: "1" },
          "50%":     { opacity: "0.4" },
        },
        float: {
          "0%,100%": { transform: "translateY(0)" },
          "50%":     { transform: "translateY(-6px)" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to:   { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
