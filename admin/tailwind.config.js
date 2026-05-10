/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        pgn: {
          green: '#1a3a2a',
          'green-light': '#2a5a42',
          'green-dark': '#0f2018',
          gold: '#c9a84c',
          'gold-light': '#e0c070',
        }
      }
    },
  },
  plugins: [],
}
