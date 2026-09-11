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
        plasma: {
          void: '#010617',
          deep: '#01102E',
          panel: '#071A48',
          glow: '#3D7EFF',
          mist: '#9EC4FF',
          line: 'rgba(80, 134, 242, 0.35)',
        },
      },
      fontFamily: {
        sans: ['"Noto Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Outfit', '"Noto Sans"', 'ui-sans-serif', 'sans-serif'],
      },
      boxShadow: {
        plasma: '0 0 40px rgba(4, 57, 217, 0.28), 0 18px 50px rgba(1, 6, 23, 0.55)',
        'plasma-sm': '0 0 18px rgba(80, 134, 242, 0.22)',
      },
      backgroundImage: {
        'plasma-panel':
          'linear-gradient(180deg, rgba(12, 42, 110, 0.92) 0%, rgba(4, 18, 58, 0.88) 100%)',
      },
      keyframes: {
        'plasma-drift': {
          '0%, 100%': { transform: 'translate3d(0, 0, 0) scale(1)' },
          '33%': { transform: 'translate3d(6%, -8%, 0) scale(1.08)' },
          '66%': { transform: 'translate3d(-8%, 6%, 0) scale(0.94)' },
        },
        'plasma-pulse': {
          '0%, 100%': { opacity: '0.45' },
          '50%': { opacity: '0.85' },
        },
        'scan-line': {
          '0%': { transform: 'translateY(-10%)' },
          '100%': { transform: 'translateY(110%)' },
        },
      },
      animation: {
        'plasma-drift': 'plasma-drift 18s ease-in-out infinite',
        'plasma-drift-slow': 'plasma-drift 26s ease-in-out infinite reverse',
        'plasma-pulse': 'plasma-pulse 5s ease-in-out infinite',
        'scan-line': 'scan-line 2.4s linear infinite',
      },
    },
  },
  plugins: [],
}
