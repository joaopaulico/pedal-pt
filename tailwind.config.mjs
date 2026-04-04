/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'accent': {
          50: '#f0faf5',
          100: '#d6f2e4',
          200: '#aee5cb',
          300: '#78d1ab',
          400: '#44b687',
          500: '#269b6c',
          600: '#1a7d57',
          700: '#166447',
          800: '#144f3a',
          900: '#124131',
          950: '#09251b',
        },
      },
      fontFamily: {
        'display': ['"Sora"', 'system-ui', 'sans-serif'],
        'body': ['"Inter"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
