/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{gjs,gts,hbs,html,js,ts}',
    './index.html',
  ],
  theme: {
    extend: {
      colors: {
        trakt: {
          red: '#ed1c24',
          dark: '#1c1c1c',
        },
        mal: {
          blue: '#2e51a2',
          lightblue: '#4065ba',
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
};
