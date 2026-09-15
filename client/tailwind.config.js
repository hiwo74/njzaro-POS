/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f6f5f2",
          100: "#e8e6e0",
          200: "#d3d0c8",
          400: "#84817a",
          500: "#18181b",
          600: "#000000",
          900: "#131211",
        },
      },
    },
  },
  plugins: [],
};
