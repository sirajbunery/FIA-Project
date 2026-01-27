/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Pakistan flag colors
        'pk-green': '#01411C',
        'pk-white': '#FFFFFF',
        // Custom colors
        'beoe-primary': '#01411C',
        'beoe-secondary': '#1a5f2a',
        'beoe-accent': '#fbbf24',
      },
      fontFamily: {
        urdu: ['Noto Nastaliq Urdu', 'serif'],
      },
    },
  },
  plugins: [],
}
