export type PartOfSpeech = 'noun' | 'verb' | 'i-adj' | 'na-adj' | 'adverb' | 'expression';

export type Topic = 'daily-life' | 'travel' | 'relationships' | 'work-tech' | 'anime-games';

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

export type Language = 'en' | 'zh-TW';

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

export type TodayWord = {
  word: Word;
  /** new = not started yet, learning = in the deck, known = graduated from learning steps */
  status: 'new' | 'learning' | 'known';
};

export type WeakWord = {
  word: Word;
  /** Share of reviews answered without "Again"; null if never reviewed. */
  accuracy: number | null;
};
