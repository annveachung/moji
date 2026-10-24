/**
 * moji's palette, from the Stitch "Japanese Word Vault" design (Kotoba Washi Minimal).
 * Plain JS so tailwind.config.js and the TypeScript code can share one source.
 * In className use e.g. `bg-surface`, `bg-card`, `text-ink-soft`, `bg-primary-soft`.
 */
module.exports = {
  // Warm washi paper. DEFAULT is the page; the others are progressively darker blocks.
  surface: { DEFAULT: '#FEF8F4', low: '#F8F2EF', mid: '#F3EDE9', high: '#EDE7E3', highest: '#E7E1DE' },
  card: '#FFFFFF',
  // Text: DEFAULT for main text, soft for secondary, muted for hints and placeholders.
  ink: { DEFAULT: '#1D1B19', soft: '#59413C', muted: '#8C716B' },
  // Vermilion, like a hanko seal: main buttons, furigana, highlights.
  primary: { DEFAULT: '#A9311B', bright: '#CA4931', soft: '#FFDAD3', deep: '#8A1B07' },
  // Matcha green: things you know.
  matcha: { DEFAULT: '#326A38', soft: '#B1EFB0', ink: '#366E3C' },
  // Mustard: JLPT levels, stars, sticky notes.
  mustard: { DEFAULT: '#745800', soft: '#FFDF97', dim: '#EEC14D' },
  error: { DEFAULT: '#BA1A1A', soft: '#FFDAD6' },
};
