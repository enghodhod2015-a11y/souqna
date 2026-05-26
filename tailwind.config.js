/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        'header-blue': '#02152d',
        'primary-card': '#06264D',
        'secondary-blue': '#0b2f5c',
        gold: '#D4AF37',
        danger: '#dc2626',
        'text-secondary': '#ddd',
      },
      fontFamily: { tajawal: ['Tajawal', 'sans-serif'] },
    },
  },
  plugins: [require('tailwindcss-rtl')],
}