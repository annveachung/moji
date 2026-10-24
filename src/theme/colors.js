/**
 * moji's palette: ほうじ茶 (hojicha), warm cream with caramel brown.
 * Plain JS so tailwind.config.js and the TypeScript code can share one source.
 * In className use e.g. `bg-surface`, `bg-card`, `text-ink-soft`, `bg-primary-soft`.
 *
 * Roles:
 * - surface: the page (DEFAULT) and progressively darker blocks on it
 * - card:    cards and inputs
 * - ink:     text (DEFAULT), secondary text (soft), hints (muted)
 * - primary: main buttons, selected chips, furigana, highlights
 * - matcha:  things you know (習得)
 * - mustard: stars, JLPT levels, sticky notes
 * - error:   delete, false-friend warnings
 *
 * Keep text contrast at 4.5:1 or more when changing these.
 */
module.exports = {
  surface: { DEFAULT: '#FAF4EC', low: '#F4ECE2', mid: '#EFE5D9', high: '#E8DDCF', highest: '#E0D4C5' },
  card: '#FFFFFF',
  ink: { DEFAULT: '#2A2018', soft: '#5E4A3A', muted: '#776253' },
  primary: { DEFAULT: '#93552A', bright: '#B8743F', soft: '#F6DEC8', deep: '#723F1B' },
  matcha: { DEFAULT: '#4E7A45', soft: '#D3EBC8', ink: '#3E6936' },
  mustard: { DEFAULT: '#735A00', soft: '#FBE3A0', dim: '#E5BE4A' },
  error: { DEFAULT: '#B3261E', soft: '#FFDAD6' },
};
