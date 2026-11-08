import type { DictionaryEntry } from '@/db/dictionary';
import type { ChineseLinkKind, JlptLevel, PartOfSpeech, Topic, VerbGroup, WordInput } from '@/db/types';

import { apiFetch } from './api';
import { isGrammarFunction, isWordCategory, type GrammarFunction } from './categories';

/**
 * moji's AI features, all answered by moji-api (which talks to Gemini). The AI key
 * never leaves the server; the app only sends the word or rule it needs help with.
 */

export type FilledWord = {
  word: string;
  reading: string;
  meaningEn: string;
  meaningZh: string;
  pos: PartOfSpeech;
  verbGroup: VerbGroup | 'none';
  /** 0 = not on the JLPT lists. */
  jlpt: 0 | JlptLevel;
  example: { ja: string; en: string; zh: string };
  zhLinkKind: ChineseLinkKind | 'none';
  zhNoteEn: string;
  zhNoteZh: string;
  /** One of the fixed categories (lib/categories.ts), or "other". */
  category: string;
};

/** Everything about a word, including its category, from just what you typed or dictated. */
export function fillWord(text: string): Promise<FilledWord> {
  return apiFetch<FilledWord>('/ai/word', { method: 'POST', body: { text } });
}

/** The AI's category for a word, if it's one of ours; null = その他. */
export function categoryOf(filled: { category?: string }): Topic | null {
  return isWordCategory(filled.category) ? filled.category : null;
}

/** Turn the AI's answer into what the add-word form saves. */
export function toWordInput(filled: FilledWord, starred = false): WordInput {
  return {
    word: filled.word,
    reading: filled.reading,
    meaningEn: filled.meaningEn,
    meaningZh: filled.meaningZh,
    pos: filled.pos,
    // Older servers don't send it; then the app works it out from the reading.
    verbGroup: filled.verbGroup && filled.verbGroup !== 'none' ? filled.verbGroup : null,
    jlpt: filled.jlpt === 0 ? null : filled.jlpt,
    notes: '',
    starred,
    example: filled.example.ja ? { ja: filled.example.ja, translation: filled.example.en, en: filled.example.en, zh: filled.example.zh } : null,
    topic: categoryOf(filled),
    zhLinkKind: filled.zhLinkKind === 'none' ? null : filled.zhLinkKind,
    zhNoteEn: filled.zhNoteEn,
    zhNoteZh: filled.zhNoteZh,
  };
}

export type AiSentence = { ja: string; en: string; zh: string };

export function generateGrammarSentence(rule: {
  pattern: string;
  meaning: string;
  formation: string;
  jlpt: number | null;
  avoid: string[];
}): Promise<AiSentence> {
  return apiFetch<AiSentence>('/ai/grammar-sentence', { method: 'POST', body: rule });
}

/** Three example sentences for a word (furigana markup, the word in {braces}). */
export async function generateWordSentences(word: {
  word: string;
  reading: string;
  meaning: string;
  avoid: string[];
}): Promise<AiSentence[]> {
  const { sentences } = await apiFetch<{ sentences: AiSentence[] }>('/ai/word-sentences', { method: 'POST', body: word });
  return sentences;
}

/** Five words related in meaning (dictionary entries; new ones may have just been added). */
export async function fetchRelated(word: {
  word: string;
  reading: string;
  meaning: string;
  jlpt: number | null;
}): Promise<DictionaryEntry[]> {
  const { entries } = await apiFetch<{ entries: DictionaryEntry[] }>('/ai/related', { method: 'POST', body: word });
  return entries;
}

/** Categories for words still in その他. */
export async function sortCategories(
  words: { uid: string; word: string; reading: string; meaning: string }[],
): Promise<{ uid: string; category: Topic | null }[]> {
  const { assignments } = await apiFetch<{ assignments: { uid: string; category: string }[] }>('/ai/sort-categories', {
    method: 'POST',
    body: { words },
  });
  return assignments.map((a) => ({ uid: a.uid, category: categoryOf(a) }));
}

/** What each grammar rule does (条件, 理由…). */
export async function categorizeGrammar(
  rules: { uid: string; pattern: string; meaning: string }[],
): Promise<{ uid: string; category: GrammarFunction | null }[]> {
  const { assignments } = await apiFetch<{ assignments: { uid: string; category: string }[] }>('/ai/grammar-categories', {
    method: 'POST',
    body: { rules },
  });
  return assignments.map((a) => ({ uid: a.uid, category: isGrammarFunction(a.category) ? a.category : null }));
}

export type ReadingItem = {
  kind: 'nhk' | 'daily';
  /** Furigana markup. */
  title: string;
  /** Furigana markup. */
  body: string;
  en: string;
  zh: string;
  vocab: { word: string; reading: string; meaningEn: string; meaningZh: string }[];
  sourceTitle?: string;
  sourceUrl?: string;
};

export function getDailyReading(): Promise<{ day: string; items: ReadingItem[] }> {
  return apiFetch('/reading/today');
}

/** A word the AI suggests for ことば, with why it's suggested. */
export type SuggestedWord = {
  word: string;
  reading: string;
  meaningEn: string;
  meaningZh: string;
  /** 0 = not on the JLPT lists. */
  jlpt: number;
  reason: string;
};

export type SuggestionKind = 'forYou' | 'kanji';

export function suggestWords(
  kind: SuggestionKind,
  library: { word: string; meaning: string; jlpt: number | null }[],
  exclude: string[],
): Promise<{ words: SuggestedWord[] }> {
  return apiFetch('/ai/suggest', { method: 'POST', body: { kind, library, exclude } });
}
