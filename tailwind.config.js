/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#041C3A',
        header: '#02152d',
        gold: '#D4AF37',
        card: '#06264D',
        secondary: '#0b2f5c',
      },
      fontFamily: {
        tajawal: ['Tajawal', 'sans-serif'],
      },
    },
  },
  plugins: [],
  corePlugins: {
    textAlign: true,
  },
}