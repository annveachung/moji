import type { SQLiteDatabase } from 'expo-sqlite';

import { addDays, toLocalDay } from '@/lib/date';
import { kanjiIn } from '@/lib/furigana';

import type { CardRow } from '@/lib/srs';

import type { RelatedWord, RelationKind, Sentence, TodayWord, WeakWord, Word } from './types';

type WordRow = {
  id: number;
  word: string;
  furigana: string;
  reading: string;
  meaning_en: string;
  meaning_zh: string;
  pos: Word['pos'];
  jlpt: Word['jlpt'];
  topic: Word['topic'];
  tags: string;
  notes: string;
  zh_link_kind: Word['zhLinkKind'];
  zh_note_en: string | null;
  zh_note_zh: string | null;
  saved_at: string | null;
  created_at: string;
};

type SentenceRow = {
  id: number;
  word_id: number;
  ja: string;
  en: string;
  zh: string;
  favorite: number;
  seen: number;
};

function toWord(row: WordRow): Word {
  return {
    id: row.id,
    word: row.word,
    furigana: row.furigana,
    reading: row.reading,
    meaningEn: row.meaning_en,
    meaningZh: row.meaning_zh,
    pos: row.pos,
    jlpt: row.jlpt,
    topic: row.topic,
    tags: JSON.parse(row.tags),
    notes: row.notes,
    zhLinkKind: row.zh_link_kind,
    zhNoteEn: row.zh_note_en,
    zhNoteZh: row.zh_note_zh,
    savedAt: row.saved_at,
    createdAt: row.created_at,
  };
}

function toSentence(row: SentenceRow): Sentence {
  return {
    id: row.id,
    wordId: row.word_id,
    ja: row.ja,
    en: row.en,
    zh: row.zh,
    favorite: row.favorite === 1,
    seen: row.seen === 1,
  };
}

// ── Words ────────────────────────────────────────────────────

export async function getWord(db: SQLiteDatabase, id: number): Promise<Word | null> {
  const row = await db.getFirstAsync<WordRow>('SELECT * FROM words WHERE id = ?', id);
  return row ? toWord(row) : null;
}

export async function setWordSaved(db: SQLiteDatabase, id: number, saved: boolean) {
  await db.runAsync(
    'UPDATE words SET saved_at = ? WHERE id = ?',
    saved ? new Date().toISOString() : null, id,
  );
}

export async function updateWordNotes(db: SQLiteDatabase, id: number, notes: string) {
  await db.runAsync('UPDATE words SET notes = ? WHERE id = ?', notes, id);
}

/**
 * Words connected to this one: hand-picked relations (in either direction),
 * then other words that share a kanji with it.
 */
export async function getRelatedWords(db: SQLiteDatabase, word: Word): Promise<RelatedWord[]> {
  const relations = await db.getAllAsync<WordRow & { kind: RelationKind }>(
    `SELECT w.*, r.kind FROM word_relations r
       JOIN words w ON w.id = CASE WHEN r.word_id = ? THEN r.other_id ELSE r.word_id END
      WHERE r.word_id = ? OR r.other_id = ?`,
    word.id, word.id, word.id,
  );
  const related: RelatedWord[] = relations.map((row) => ({ kind: row.kind, word: toWord(row) }));

  const kanji = kanjiIn(word.word);
  if (kanji.length > 0) {
    const shared = await db.getAllAsync<WordRow>(
      `SELECT * FROM words WHERE id != ? AND (${kanji.map(() => 'word LIKE ?').join(' OR ')})`,
      word.id, ...kanji.map((k) => `%${k}%`),
    );
    const alreadyListed = new Set(related.map((r) => r.word.id));
    for (const row of shared) {
      if (!alreadyListed.has(row.id)) related.push({ kind: 'shared-kanji', word: toWord(row) });
    }
  }
  return related;
}

// ── Sentences ────────────────────────────────────────────────

/** Sentences already shown for this word, favorites first. */
export async function getShownSentences(db: SQLiteDatabase, wordId: number): Promise<Sentence[]> {
  const rows = await db.getAllAsync<SentenceRow>(
    'SELECT * FROM sentences WHERE word_id = ? AND (seen = 1 OR favorite = 1) ORDER BY favorite DESC, id',
    wordId,
  );
  return rows.map(toSentence);
}

/**
 * "Generate another example": reveal the next unseen sentence from the bank.
 * Returns null when the bank for this word is used up.
 */
export async function revealNextSentence(db: SQLiteDatabase, wordId: number): Promise<Sentence | null> {
  const row = await db.getFirstAsync<SentenceRow>(
    'SELECT * FROM sentences WHERE word_id = ? AND seen = 0 ORDER BY id LIMIT 1',
    wordId,
  );
  if (!row) return null;
  await db.runAsync('UPDATE sentences SET seen = 1 WHERE id = ?', row.id);
  return toSentence({ ...row, seen: 1 });
}

export async function countUnseenSentences(db: SQLiteDatabase, wordId: number): Promise<number> {
  const row = await db.getFirstAsync<{ n: number }>(
    'SELECT COUNT(*) AS n FROM sentences WHERE word_id = ? AND seen = 0',
    wordId,
  );
  return row?.n ?? 0;
}

export async function setSentenceFavorite(db: SQLiteDatabase, id: number, favorite: boolean) {
  await db.runAsync('UPDATE sentences SET favorite = ? WHERE id = ?', favorite ? 1 : 0, id);
}

// ── Dashboard ────────────────────────────────────────────────

/** How many new words were started today, for the daily goal ring. */
export async function countLearnedToday(db: SQLiteDatabase, now = new Date()): Promise<number> {
  const row = await db.getFirstAsync<{ n: number }>(
    'SELECT COUNT(*) AS n FROM cards WHERE learned_day = ?',
    toLocalDay(now),
  );
  return row?.n ?? 0;
}

export async function countDueReviews(db: SQLiteDatabase, now = new Date()): Promise<number> {
  const row = await db.getFirstAsync<{ n: number }>(
    'SELECT COUNT(*) AS n FROM cards WHERE due <= ?',
    now.toISOString(),
  );
  return row?.n ?? 0;
}

/**
 * Consecutive days with any study (learning or reviewing), counting back from today.
 * If you haven't studied yet today, the streak from yesterday still counts.
 */
export async function getStreak(db: SQLiteDatabase, now = new Date()): Promise<number> {
  const rows = await db.getAllAsync<{ day: string }>(
    'SELECT day FROM review_logs UNION SELECT learned_day AS day FROM cards',
  );
  const days = new Set(rows.map((r) => r.day));
  let cursor = days.has(toLocalDay(now)) ? now : addDays(now, -1);
  let streak = 0;
  while (days.has(toLocalDay(cursor))) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/** Suggested new words: ones you saved but haven't learned, then easiest JLPT level first. */
export async function getRecommendedWords(db: SQLiteDatabase, limit: number): Promise<Word[]> {
  const rows = await db.getAllAsync<WordRow>(
    `SELECT w.* FROM words w
      WHERE NOT EXISTS (SELECT 1 FROM cards c WHERE c.word_id = w.id)
      ORDER BY w.saved_at IS NULL, w.jlpt IS NULL, w.jlpt DESC, w.id
      LIMIT ?`,
    limit,
  );
  return rows.map(toWord);
}

/** Words you keep forgetting: lapsed at least once, or that FSRS rates as hard. */
export async function getWeakWords(db: SQLiteDatabase, limit: number): Promise<WeakWord[]> {
  const rows = await db.getAllAsync<WordRow & { correct: number; total: number }>(
    `SELECT w.*,
            (SELECT COUNT(*) FROM review_logs l WHERE l.word_id = w.id AND l.rating > 1) AS correct,
            (SELECT COUNT(*) FROM review_logs l WHERE l.word_id = w.id) AS total
       FROM words w JOIN cards c ON c.word_id = w.id
      WHERE c.lapses > 0 OR c.difficulty >= 7
      ORDER BY c.lapses DESC, c.difficulty DESC
      LIMIT ?`,
    limit,
  );
  return rows.map((row) => ({
    word: toWord(row),
    accuracy: row.total > 0 ? row.correct / row.total : null,
  }));
}

export async function getRecentlyLearned(db: SQLiteDatabase, limit: number): Promise<Word[]> {
  const rows = await db.getAllAsync<WordRow>(
    `SELECT w.* FROM words w JOIN cards c ON c.word_id = w.id
      ORDER BY c.learned_at DESC
      LIMIT ?`,
    limit,
  );
  return rows.map(toWord);
}

/**
 * Today's vocabulary: words started today, topped up with recommendations
 * until there are as many cards as the daily goal.
 */
export async function getTodayWords(
  db: SQLiteDatabase,
  goal: number,
  now = new Date(),
): Promise<TodayWord[]> {
  const learned = await db.getAllAsync<WordRow & { state: number }>(
    `SELECT w.*, c.state FROM words w JOIN cards c ON c.word_id = w.id
      WHERE c.learned_day = ?
      ORDER BY c.learned_at`,
    toLocalDay(now),
  );
  const today: TodayWord[] = learned.map((row) => ({
    word: toWord(row),
    // FSRS state 2 = "Review": the word has graduated from the learning steps.
    status: row.state === 2 ? 'known' : 'learning',
  }));
  const missing = goal - today.length;
  if (missing > 0) {
    for (const word of await getRecommendedWords(db, missing)) {
      today.push({ word, status: 'new' });
    }
  }
  return today;
}

export type Stats = {
  /** Words with a memory stable for 3+ weeks (Anki calls these "mature"). */
  mastered: number;
  /** Share of reviews in the last 7 days that weren't "Again"; null if no reviews. */
  retention7d: number | null;
};

export async function getStats(db: SQLiteDatabase, now = new Date()): Promise<Stats> {
  const mastered = await db.getFirstAsync<{ n: number }>(
    'SELECT COUNT(*) AS n FROM cards WHERE state = 2 AND stability >= 21',
  );
  const week = await db.getFirstAsync<{ correct: number; total: number }>(
    `SELECT COALESCE(SUM(rating > 1), 0) AS correct, COUNT(*) AS total
       FROM review_logs WHERE day > ?`,
    toLocalDay(addDays(now, -7)),
  );
  return {
    mastered: mastered?.n ?? 0,
    retention7d: week && week.total > 0 ? week.correct / week.total : null,
  };
}

/** The word's spaced-repetition card, or null if it isn't in the review deck yet. */
export async function getCard(db: SQLiteDatabase, wordId: number): Promise<CardRow | null> {
  return db.getFirstAsync<CardRow>('SELECT * FROM cards WHERE word_id = ?', wordId);
}

// ── Settings ─────────────────────────────────────────────────

export async function getAllSettings(db: SQLiteDatabase): Promise<Record<string, string>> {
  const rows = await db.getAllAsync<{ key: string; value: string }>('SELECT key, value FROM settings');
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

export async function setSetting(db: SQLiteDatabase, key: string, value: string) {
  await db.runAsync(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value',
    key, value,
  );
}
