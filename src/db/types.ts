export type PartOfSpeech = 'noun' | 'verb' | 'i-adj' | 'na-adj' | 'adverb' | 'expression';

export type Topic = 'daily-life' | 'travel' | 'relationships' | 'work-tech' | 'anime-games';

/** A topic, or その他 (other): words without a topic, such as most words you add yourself. */
export type TopicFilter = Topic | 'other';

/** 5 = N5 (easiest) … 1 = N1 (hardest). null = not on the JLPT lists (e.g. anime words). */
export type JlptLevel = 5 | 4 | 3 | 2 | 1;

/**
 * How the Japanese word relates to the same characters in Chinese:
 * - same: the meaning carries over, so Chinese speakers get a head start
 * - nuance: related, but used differently
 * - false-friend: looks familiar, means something else
 */
export type ChineseLinkKind = 'same' | 'nuance' | 'false-friend';

export type RelationKind = 'synonym' | 'antonym' | 'confusing';

/** Languages for meanings and translations. */
export type Language = 'en' | 'zh-TW';

/** Languages for the app's interface. Japanese is the default, for immersion. */
export type UiLanguage = 'ja' | Language;

export type Word = {
  id: number;
  /** Written form, e.g. 勉強 */
  word: string;
  /** Furigana markup, e.g. 勉強[べんきょう] — see src/lib/furigana.ts */
  furigana: string;
  /** Kana reading, e.g. べんきょう */
  reading: string;
  meaningEn: string;
  meaningZh: string;
  pos: PartOfSpeech;
  jlpt: JlptLevel | null;
  topic: Topic | null;
  tags: string[];
  notes: string;
  zhLinkKind: ChineseLinkKind | null;
  zhNoteEn: string | null;
  zhNoteZh: string | null;
  /** When the word was added to the user's library; null = only in the catalog. */
  savedAt: string | null;
  /** When the word was ⭐ starred for review; null = not starred. */
  starredAt: string | null;
  /** true = typed in by the user, false = from the starter catalog. */
  isCustom: boolean;
  createdAt: string;
};

export type Sentence = {
  id: number;
  wordId: number;
  /** Furigana markup with the target word wrapped in {braces}. */
  ja: string;
  en: string;
  zh: string;
  favorite: boolean;
  seen: boolean;
};

export type RelatedWord = {
  kind: RelationKind | 'shared-kanji';
  word: Word;
};

/** How a word is going in review: known = usually right. */
export type ReviewStatus = 'known' | null;

/** A word as shown on a library card, with its first example and review history. */
export type LibraryWord = Word & {
  example: { ja: string; en: string; zh: string } | null;
  reviews: number;
  /** Share of reviews answered 覚えた; null if never reviewed. */
  accuracy: number | null;
  lastReviewedAt: string | null;
  status: ReviewStatus;
};

export type LibraryStats = {
  total: number;
  starred: number;
  known: number;
  /** Share of all reviews answered 覚えた; null if nothing reviewed yet. */
  accuracy: number | null;
};

/** Review status filter in the library. */
export type ReviewFilter = 'all' | 'starred';

export type LibraryFilters = {
  search: string;
  pos: PartOfSpeech | null;
  jlpt: JlptLevel | null;
  topic: TopicFilter | null;
  status: ReviewFilter;
};

/** What the add/edit form collects. Romaji and furigana are worked out automatically. */
export type WordInput = {
  word: string;
  reading: string;
  meaningEn: string;
  meaningZh: string;
  pos: PartOfSpeech;
  jlpt: JlptLevel | null;
  notes: string;
  starred: boolean;
  example: { ja: string; translation: string } | null;
};

/** Which catalog words belong to a collection in 発見. All set conditions must match. */
export type CollectionFilter = {
  topic?: TopicFilter;
  jlpt?: JlptLevel;
  /** Only this level or harder, e.g. 3 = N3, N2 and N1. */
  hardestFrom?: JlptLevel;
  zhLink?: ChineseLinkKind;
  /** Leave out words whose kanji mean something else in Chinese. */
  excludeFalseFriends?: boolean;
  /** Only words written entirely in kanji, with at least two (compounds like 観光). */
  kanjiCompound?: boolean;
  tag?: string;
};

/** A row of suggestions in 発見, with the reason it's suggested. */
export type Suggestion =
  | { kind: 'shared-kanji'; anchor: Word; words: Word[] }
  | { kind: 'same-topic'; topic: Topic; words: Word[] }
  | { kind: 'confusing'; anchor: Word; words: Word[] }
  | { kind: 'starter'; words: Word[] };
