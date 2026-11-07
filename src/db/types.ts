import type { GrammarFunction, WordCategory } from '@/lib/categories';

export type PartOfSpeech = 'noun' | 'verb' | 'i-adj' | 'na-adj' | 'adverb' | 'expression';

/**
 * The three verb groups (see lib/verb.ts): 五段 godan (Group 1), 一段 ichidan (Group 2),
 * 不規則 irregular (Group 3: する, 来る). Stored separately from conjugation forms (活用形).
 */
export type VerbGroup = 'godan' | 'ichidan' | 'irregular';

/**
 * A word's category: one of the fixed list in lib/categories.ts (people, food, transport…).
 * Stored in the words.topic column. null = その他 (not sorted yet, or fits nowhere).
 */
export type Topic = WordCategory;

/** A category, or その他 (other): words without one. */
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
  /** Verbs only; null for every other part of speech. */
  verbGroup: VerbGroup | null;
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

/** Review status filter in the library. */
export type ReviewFilter = 'all' | 'starred';

export type LibraryFilters = {
  search: string;
  pos: PartOfSpeech | null;
  /** Narrows 動詞 to one group. */
  verbGroup: VerbGroup | null;
  jlpt: JlptLevel | null;
  topic: TopicFilter | null;
  status: ReviewFilter;
};

/** What the add/edit form collects. Furigana is worked out automatically. */
export type WordInput = {
  word: string;
  reading: string;
  meaningEn: string;
  meaningZh: string;
  pos: PartOfSpeech;
  /** For verbs; worked out from the reading when left out. */
  verbGroup?: VerbGroup | null;
  jlpt: JlptLevel | null;
  notes: string;
  starred: boolean;
  /** translation is typed by hand; the AI gives en and zh separately instead. */
  example: { ja: string; translation: string; en?: string; zh?: string } | null;
  /** Usually left empty (その他); imports and the AI may carry one. */
  topic?: Topic | null;
  /** From the AI: how the kanji relate to Chinese. */
  zhLinkKind?: ChineseLinkKind | null;
  zhNoteEn?: string;
  zhNoteZh?: string;
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
  /** Only words new to you: not saved and not marked as seen. */
  unseenOnly?: boolean;
};

/** A grammar rule in 文法, e.g. 〜ても "even if". */
export type GrammarRule = {
  id: number;
  pattern: string;
  /** What the pattern does (条件, 理由…); null = not sorted yet. */
  category: GrammarFunction | null;
  meaningEn: string;
  meaningZh: string;
  jlpt: JlptLevel | null;
  /** How it attaches (接続), e.g. "Verb て-form + も". */
  formation: string;
  explanation: string;
  /** When you ⭐ starred it for 復習; null = not starred. */
  starredAt: string | null;
  /** Number of example sentences saved for it. */
  sentenceCount: number;
};

export type GrammarSentence = {
  id: number;
  grammarId: number;
  ja: string;
  en: string;
  zh: string;
  source: 'import' | 'ai';
};
