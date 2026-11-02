import type { SQLiteDatabase } from 'expo-sqlite';

import { addTopic } from '@/db/queries';
import type { ChineseLinkKind, JlptLevel, PartOfSpeech, Topic, WordInput } from '@/db/types';

import { apiFetch } from './api';

/**
 * moji's AI features, all answered by moji-api (which talks to Gemini). The AI key
 * never leaves the server; the app only sends the word or rule it needs help with.
 */

export type TopicChoice = {
  choice: 'existing' | 'new' | 'other';
  id: string;
  labelJa: string;
  labelEn: string;
  labelZh: string;
};

export type FilledWord = {
  word: string;
  reading: string;
  meaningEn: string;
  meaningZh: string;
  pos: PartOfSpeech;
  /** 0 = not on the JLPT lists. */
  jlpt: 0 | JlptLevel;
  example: { ja: string; en: string; zh: string };
  zhLinkKind: ChineseLinkKind | 'none';
  zhNoteEn: string;
  zhNoteZh: string;
  topic: TopicChoice;
};

type TopicRef = { id: string; label: string };

/** Everything about a word from just what you typed or dictated. */
export function fillWord(text: string, topics: TopicRef[]): Promise<FilledWord> {
  return apiFetch<FilledWord>('/ai/word', { method: 'POST', body: { text, topics } });
}

/**
 * Where the AI put a word: an existing topic, a new one (created here, and synced),
 * or null for その他.
 */
export async function resolveTopic(db: SQLiteDatabase, topic: TopicChoice): Promise<Topic | null> {
  if (topic.choice === 'other' || !topic.id) return null;
  if (topic.choice === 'new') {
    await addTopic(db, { id: topic.id, labelJa: topic.labelJa, labelEn: topic.labelEn, labelZh: topic.labelZh });
  }
  return topic.id;
}

/** Turn the AI's answer into what the add-word form saves. */
export function toWordInput(filled: FilledWord, topic: Topic | null, starred = false): WordInput {
  return {
    word: filled.word,
    reading: filled.reading,
    meaningEn: filled.meaningEn,
    meaningZh: filled.meaningZh,
    pos: filled.pos,
    jlpt: filled.jlpt === 0 ? null : filled.jlpt,
    notes: '',
    starred,
    example: filled.example.ja ? { ja: filled.example.ja, translation: filled.example.en, en: filled.example.en, zh: filled.example.zh } : null,
    topic,
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

export function sortTopics(
  words: { uid: string; word: string; reading: string; meaning: string }[],
  topics: TopicRef[],
): Promise<{ assignments: { uid: string; topic: TopicChoice }[] }> {
  return apiFetch('/ai/sort-topics', { method: 'POST', body: { words, topics } });
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
