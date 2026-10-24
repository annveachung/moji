/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: require('./src/theme/colors'),
      fontFamily: {
        // Plus Jakarta Sans for headings, labels and numbers. Japanese characters
        // automatically fall back to the iPhone's built-in Hiragino Sans.
        // (Each weight is its own font, so use these instead of font-bold.)
        display: ['PlusJakartaSans_700Bold'],
        'display-semibold': ['PlusJakartaSans_600SemiBold'],
        'display-medium': ['PlusJakartaSans_500Medium'],
      },
      borderRadius: {
        card: '20px',
      },
    },
  },
  plugins: [],
};
