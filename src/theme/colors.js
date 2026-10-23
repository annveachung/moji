/**
 * moji's palette, from the Stitch "cream washi" design.
 * Plain JS so tailwind.config.js and the TypeScript code can share one source.
 * In className use e.g. `bg-cream`, `bg-cream-light`, `text-sumi-muted`, `border-amber`.
 */
module.exports = {
  cream: { DEFAULT: '#FAEBCD', light: '#FCF5E8', dark: '#EED8B5' },
  amber: { DEFAULT: '#F7C873', hover: '#EDB95A', dark: '#B07A1A' },
  sumi: { DEFAULT: '#434343', light: '#616161', muted: '#6E6E6E' },
  // 朱 (shu): vermilion, the color of hanko seals. Used sparingly for warnings and "weak".
  shu: { DEFAULT: '#AB3425', light: '#FFDAD4' },
};
