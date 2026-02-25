/** @type {import('tailwindcss').Config} */
const config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#080b0f",
        surface: "#0d1117",
        border: "#1a2332",
        "border-bright": "#243044",
        text: {
          primary: "#e8edf2",
          secondary: "#8895a7",
          muted: "#4a5568",
        },
        green: {
          DEFAULT: "#00d4a0",
          dim: "#00d4a015",
          bright: "#00ffbf",
        },
        amber: {
          DEFAULT: "#f5a623",
          dim: "#f5a62315",
          bright: "#ffc147",
        },
        red: {
          DEFAULT: "#ff4d6d",
          dim: "#ff4d6d15",
          bright: "#ff6b85",
        },
        blue: {
          DEFAULT: "#4d9eff",
          dim: "#4d9eff15",
        },
      },
      fontFamily: {
        mono: ["'JetBrains Mono'", "monospace"],
        display: ["'Space Grotesk'", "sans-serif"],
        body: ["'DM Sans'", "sans-serif"],
      },
      fontSize: {
        "2xs": "0.65rem",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-in": "fadeIn 0.5s ease-in-out",
        "slide-up": "slideUp 0.4s ease-out",
        "glow-green": "glowGreen 2s ease-in-out infinite alternate",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(8px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        glowGreen: {
          "0%": { boxShadow: "0 0 5px #00d4a030" },
          "100%": { boxShadow: "0 0 20px #00d4a060, 0 0 40px #00d4a020" },
        },
      },
      backgroundImage: {
        "grid-pattern":
          "linear-gradient(#1a233220 1px, transparent 1px), linear-gradient(90deg, #1a233220 1px, transparent 1px)",
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
      },
      backgroundSize: {
        grid: "32px 32px",
      },
    },
  },
  plugins: [],
};

export default config;
