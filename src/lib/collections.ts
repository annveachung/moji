import type { IconName } from '@/components/ui';
import type { CollectionFilter, JlptLevel } from '@/db/types';

/**
 * Word lists you can browse in 発見, each defined by a filter so they grow
 * automatically with the catalog: one per JLPT level, plus "kanji advantage".
 */
export type Collection = {
  id: string;
  icon: IconName;
  /** i18n key for the title; the description lives at the same key + 'Body'. */
  titleKey: string;
  filter: CollectionFilter;
};

/** N5 (easiest) first. */
export const LEVELS: { level: JlptLevel; collection: Collection }[] = ([5, 4, 3, 2, 1] as const).map((level) => ({
  level,
  collection: {
    id: `level-${level}`,
    icon: 'school',
    titleKey: `levels.n${level}`,
    filter: { jlpt: level },
  },
}));

/**
 * Hard (N3–N1) words written entirely in kanji whose meaning a Chinese speaker can
 * usually guess, e.g. 観光, 経験, 冒険. False friends are left out, since there the
 * Chinese meaning misleads.
 */
export const KANJI_ADVANTAGE: Collection = {
  id: 'kanji-advantage',
  icon: 'auto-awesome',
  titleKey: 'explore.kanjiAdvantage',
  filter: { kanjiCompound: true, hardestFrom: 3, excludeFalseFriends: true },
};

/** Look up a list by the id in its URL. */
export function findCollection(id: string): Collection | null {
  if (id === KANJI_ADVANTAGE.id) return KANJI_ADVANTAGE;
  return LEVELS.find((l) => l.collection.id === id)?.collection ?? null;
}
