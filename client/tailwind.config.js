/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "rgb(var(--brand-50) / <alpha-value>)",
          100: "rgb(var(--brand-100) / <alpha-value>)",
          200: "rgb(var(--brand-200) / <alpha-value>)",
          400: "rgb(var(--brand-400) / <alpha-value>)",
          // 500/600 are the fixed "ink" accent used on buttons/active states.
          // They stay constant across themes so white text on them always reads.
          500: "#18181b",
          600: "#000000",
          900: "rgb(var(--brand-900) / <alpha-value>)",
        },
        surface: "rgb(var(--surface) / <alpha-value>)",
      },
    },
  },
  plugins: [],
};
