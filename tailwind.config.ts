import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          DEFAULT: "#E06030",
          50: "#FEF3ED",
          100: "#FDE0D2",
          200: "#F5C0A5",
          300: "#F0A080",
          400: "#E8804D",
          500: "#E06030",
          600: "#C44E22",
          700: "#A33D1A",
          800: "#822F14",
          900: "#61220E",
        },
        navy: {
          DEFAULT: "#1A1A4E",
          50: "#EDEDF4",
          100: "#D4D4E5",
          200: "#A9A9CB",
          300: "#7E7EB1",
          400: "#535397",
          500: "#1A1A4E",
          600: "#161643",
          700: "#121238",
          800: "#0E0E2D",
          900: "#0A0A22",
        },
      },
    },
  },
  plugins: [],
};
export default config;
