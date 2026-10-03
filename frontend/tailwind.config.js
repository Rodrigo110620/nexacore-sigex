/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  // Los hover: solo aplican en dispositivos con puntero fino; evita hovers "pegados" al tocar en móvil.
  future: {
    hoverOnlyWhenSupported: true,
  },
  theme: {
    extend: {
      colors: {
        // Colores del Anexo A de la propuesta
        primary: '#0439D9',
        secondary: '#011540',
        accent: '#5086F2'
      },
      transitionTimingFunction: {
        // ease-out marcado para entradas y feedback de UI
        'out-strong': 'cubic-bezier(0.23, 1, 0.32, 1)',
      },
    },
  },
  plugins: [],
}
