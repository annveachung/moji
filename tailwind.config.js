/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  // moji is light-only. 'class' = dark mode only if switched on by hand (never), which also avoids
  // a NativeWind error on the web dev server ("Cannot manually set color scheme").
  darkMode: 'class',
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
