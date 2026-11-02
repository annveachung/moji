import type { IconName } from '@/components/ui';

/**
 * Fixed categories, so organising stays consistent: a word's category says what it's about,
 * next to its level (how hard) and part of speech (how it works in a sentence). The AI must pick
 * from these lists and never invents new ones. Labels live in the translations (category.*, grammarFn.*).
 */
export const WORD_CATEGORIES = [
  'people',
  'feelings',
  'body',
  'nature',
  'food',
  'home',
  'clothing',
  'places',
  'transport',
  'society',
  'education',
  'business',
  'tech',
  'arts',
  'sports',
  'abstract',
] as const;
export type WordCategory = (typeof WORD_CATEGORIES)[number];

export const CATEGORY_ICON: Record<WordCategory | 'other', IconName> = {
  people: 'people',
  feelings: 'favorite',
  body: 'healing',
  nature: 'park',
  food: 'restaurant',
  home: 'home',
  clothing: 'checkroom',
  places: 'location-city',
  transport: 'train',
  society: 'gavel',
  education: 'school',
  business: 'work',
  tech: 'devices',
  arts: 'palette',
  sports: 'sports-soccer',
  abstract: 'schedule',
  other: 'more-horiz',
};

/** What a grammar pattern does. */
export const GRAMMAR_FUNCTIONS = [
  'condition',
  'reason',
  'contrast',
  'conjecture',
  'hearsay',
  'volition',
  'obligation',
  'time',
  'comparison',
  'purpose',
  'change',
  'giving',
  'voice',
  'honorific',
  'emphasis',
  'listing',
] as const;
export type GrammarFunction = (typeof GRAMMAR_FUNCTIONS)[number];

/** The topics moji used before categories, and where their words go now. */
export const LEGACY_TOPICS: Record<string, WordCategory> = {
  'daily-life': 'home',
  travel: 'transport',
  relationships: 'people',
  'work-tech': 'business',
  'anime-games': 'arts',
};

export const isWordCategory = (value: unknown): value is WordCategory =>
  typeof value === 'string' && (WORD_CATEGORIES as readonly string[]).includes(value);

export const isGrammarFunction = (value: unknown): value is GrammarFunction =>
  typeof value === 'string' && (GRAMMAR_FUNCTIONS as readonly string[]).includes(value);
