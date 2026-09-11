/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Colores del Anexo A de la propuesta
        primary: '#0439D9',
        secondary: '#011540',
        accent: '#5086F2',
        plasma: '#3daee9',
      },
      fontFamily: {
        sans: ['Noto Sans', 'Segoe UI', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
