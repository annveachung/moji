/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: require('./src/theme/colors'),
      fontFamily: {
        // Headings and numbers. Japanese text uses the iPhone's built-in Hiragino Sans.
        display: ['SpaceGrotesk_700Bold'],
        'display-medium': ['SpaceGrotesk_600SemiBold'],
      },
      borderRadius: {
        card: '20px',
      },
    },
  },
  plugins: [],
};
