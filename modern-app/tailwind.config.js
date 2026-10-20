/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        forest: { 50: "#eff5ef", 100: "#dce9dc", 600: "#286143", 700: "#1e5037", 800: "#153d2d", 900: "#102f23" },
        cream: "#f5f3e9",
        gold: { 400: "#d8b66d", 500: "#c99b45", 600: "#a7792e" },
      },
      fontFamily: {
        sans: ["DM Sans", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["Playfair Display", "Georgia", "serif"],
      },
      boxShadow: {
        soft: "0 12px 35px rgba(21, 61, 45, 0.07)",
      },
    },
  },
  plugins: [],
};
