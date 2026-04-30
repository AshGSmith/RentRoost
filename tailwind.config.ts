import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef7ff",
          100: "#d9ecff",
          200: "#bbddff",
          300: "#8ec7ff",
          400: "#59a7ff",
          500: "#2f86f6",
          600: "#1d6be6",
          700: "#1856cd",
          800: "#1948a5",
          900: "#193f82",
          950: "#152851"
        }
      },
      boxShadow: {
        card: "0 10px 30px rgba(15, 23, 42, 0.08)"
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.5rem"
      }
    }
  },
  plugins: []
};

export default config;
