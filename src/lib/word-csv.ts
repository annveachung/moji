import type { JlptLevel, PartOfSpeech, Topic, Word } from '@/db/types';
import en from '@/i18n/en';
import ja from '@/i18n/ja';
import zhTW from '@/i18n/zh-TW';

import { parseCsv, toCsv } from './csv';

/**
 * Library ⇄ spreadsheet. One row per word:
 *   word, reading, meaning_en, meaning_zh, part_of_speech, jlpt, topic, notes, starred
 */
export const CSV_COLUMNS = [
  'word',
  'reading',
  'meaning_en',
  'meaning_zh',
  'part_of_speech',
  'jlpt',
  'topic',
  'notes',
  'starred',
] as const;

/** A word read from a spreadsheet row, ready to add or merge. */
export type CsvWord = {
  line: number;
  word: string;
  reading: string;
  meaningEn: string;
  meaningZh: string;
  pos: PartOfSpeech;
  jlpt: JlptLevel | null;
  topic: Topic | null;
  notes: string;
  starred: boolean;
};

export type CsvProblem = { line: number; reason: 'missing-word' | 'bad-reading' | 'missing-meaning' };

const POS_CODES: PartOfSpeech[] = ['noun', 'verb', 'i-adj', 'na-adj', 'adverb', 'expression'];
const TOPICS: Topic[] = ['daily-life', 'travel', 'relationships', 'work-tech', 'anime-games'];
const KANA_ONLY = /^[぀-ゟ゠-ヿー・\s]+$/;

/** Accept a part of speech as its code ("noun") or its label in any app language ("名詞", "Noun"). */
function parsePos(value: string): PartOfSpeech {
  const v = value.trim().toLowerCase();
  for (const code of POS_CODES) {
    const labels = [code, en.pos[code], ja.pos[code], zhTW.pos[code]].map((l) => l.toLowerCase());
    if (labels.includes(v)) return code;
  }
  return 'noun';
}

/** "N3", "n3" or "3" → 3. */
function parseJlpt(value: string): JlptLevel | null {
  const n = Number(value.trim().replace(/^n/i, ''));
  return n >= 1 && n <= 5 ? (n as JlptLevel) : null;
}

/** A topic code ("travel") or its label in any app language ("旅行"). Anything else → none. */
function parseTopic(value: string): Topic | null {
  const v = value.trim().toLowerCase();
  if (!v) return null;
  return TOPICS.find((code) => [code, en.topic[code], ja.topic[code], zhTW.topic[code]].map((l) => l.toLowerCase()).includes(v)) ?? null;
}

function parseStarred(value: string): boolean {
  return ['1', 'yes', 'y', 'true', '⭐', '★', 'x', '✓'].includes(value.trim().toLowerCase());
}

/**
 * Read a spreadsheet. The first row may be a header (any order of the column names);
 * without one, columns are assumed to be in the standard order.
 */
export function csvToWords(text: string): { words: CsvWord[]; problems: CsvProblem[] } {
  const rows = parseCsv(text);
  if (rows.length === 0) return { words: [], problems: [] };

  const first = rows[0].map((c) => c.trim().toLowerCase());
  const hasHeader = first.includes('word');
  const index = (column: (typeof CSV_COLUMNS)[number]) =>
    hasHeader ? first.indexOf(column) : CSV_COLUMNS.indexOf(column);
  const cell = (row: string[], column: (typeof CSV_COLUMNS)[number]) => {
    const i = index(column);
    return i >= 0 ? (row[i] ?? '').trim() : '';
  };

  const words: CsvWord[] = [];
  const problems: CsvProblem[] = [];
  rows.slice(hasHeader ? 1 : 0).forEach((row, i) => {
    const line = i + (hasHeader ? 2 : 1);
    const word = cell(row, 'word');
    const reading = cell(row, 'reading');
    const meaningEn = cell(row, 'meaning_en');
    const meaningZh = cell(row, 'meaning_zh');
    if (!word) return problems.push({ line, reason: 'missing-word' });
    if (!KANA_ONLY.test(reading)) return problems.push({ line, reason: 'bad-reading' });
    if (!meaningEn && !meaningZh) return problems.push({ line, reason: 'missing-meaning' });
    words.push({
      line,
      word,
      reading,
      meaningEn,
      meaningZh,
      pos: parsePos(cell(row, 'part_of_speech')),
      jlpt: parseJlpt(cell(row, 'jlpt')),
      topic: parseTopic(cell(row, 'topic')),
      notes: cell(row, 'notes'),
      starred: parseStarred(cell(row, 'starred')),
    });
  });
  return { words, problems };
}

/** The whole library as a spreadsheet. */
export function wordsToCsv(words: Word[]): string {
  return toCsv([
    [...CSV_COLUMNS],
    ...words.map((w) => [
      w.word,
      w.reading,
      w.meaningEn,
      w.meaningZh,
      w.pos,
      w.jlpt ? `N${w.jlpt}` : '',
      w.topic ?? '',
      w.notes,
      w.starredAt ? 'yes' : '',
    ]),
  ]);
}
