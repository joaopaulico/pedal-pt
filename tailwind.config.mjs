/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'pedal': {
          50: '#f0f7f4',
          100: '#daeee3',
          200: '#b8dcc9',
          300: '#88c3a7',
          400: '#5aa885',
          500: '#3a8d6a',
          600: '#2a7155',
          700: '#235b46',
          800: '#1f4939',
          900: '#1b3d30',
          950: '#0e221b',
        },
        'terra': {
          50: '#fdf6f0',
          100: '#faeadb',
          200: '#f4d2b5',
          300: '#ecb486',
          400: '#e38f55',
          500: '#dc7433',
          600: '#cd5c28',
          700: '#aa4623',
          800: '#883923',
          900: '#6e311f',
          950: '#3b170f',
        },
        'stone': {
          50: '#f8f7f4',
          100: '#efede6',
          200: '#dedad0',
          300: '#c9c2b2',
          400: '#b2a693',
          500: '#a1917c',
          600: '#948170',
          700: '#7c6b5e',
          800: '#665850',
          900: '#544943',
          950: '#2c2622',
        },
      },
      fontFamily: {
        'display': ['"Instrument Serif"', 'Georgia', 'serif'],
        'body': ['"Inter"', 'system-ui', 'sans-serif'],
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: '72ch',
            color: '#2c2622',
            a: {
              color: '#2a7155',
              textDecoration: 'underline',
              textUnderlineOffset: '3px',
              '&:hover': {
                color: '#235b46',
              },
            },
            h2: {
              fontFamily: '"Instrument Serif", Georgia, serif',
              fontWeight: '400',
              marginTop: '2.5em',
            },
            h3: {
              fontFamily: '"Instrument Serif", Georgia, serif',
              fontWeight: '400',
            },
          },
        },
      },
    },
  },
  plugins: [],
};
