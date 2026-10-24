/**
 * moji's palette: your three theme colors (cream, amber, sumi) in the Kotoba washi style:
 * white paper cards on cream, amber accents, vermilion only for warnings.
 * Plain JS so tailwind.config.js and the TypeScript code can share one source.
 * In className use e.g. `bg-cream`, `bg-cream-light`, `text-sumi-muted`, `border-amber`.
 */
module.exports = {
  cream: { DEFAULT: '#FAEBCD', light: '#FCF5E8', dark: '#EED8B5' },
  // Card surface: near-white paper that sits on the cream background.
  paper: '#FFFCF6',
  // deep: readable amber for small text like furigana.
  amber: { DEFAULT: '#F7C873', hover: '#EDB95A', dark: '#B07A1A', deep: '#8C5A0B' },
  sumi: { DEFAULT: '#434343', light: '#616161', muted: '#6E6E6E' },
  // 朱 (shu): vermilion, the color of hanko seals. Used sparingly for warnings and "weak".
  shu: { DEFAULT: '#AB3425', light: '#FFDAD4' },
};
