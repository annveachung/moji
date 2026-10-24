import type { SQLiteDatabase } from 'expo-sqlite';

import { toLocalDay } from '@/lib/date';
import { kanjiIn, makeFurigana } from '@/lib/furigana';

import type {
  LibraryFilters,
  LibraryStats,
  LibraryWord,
  RelatedWord,
  RelationKind,
  Sentence,
  Topic,
  Word,
  WordInput,
} from './types';

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
  starred_at: string | null;
  is_custom: number;
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
    starredAt: row.starred_at,
    isCustom: row.is_custom === 1,
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

type LibraryRow = WordRow & {
  example_ja: string | null;
  example_en: string | null;
  example_zh: string | null;
  reviews: number;
  correct: number;
  last_reviewed_at: string | null;
};

function toLibraryWord(row: LibraryRow): LibraryWord {
  const accuracy = row.reviews > 0 ? row.correct / row.reviews : null;
  return {
    ...toWord(row),
    example:
      row.example_ja !== null
        ? { ja: row.example_ja, en: row.example_en ?? '', zh: row.example_zh ?? '' }
        : null,
    reviews: row.reviews,
    accuracy,
    lastReviewedAt: row.last_reviewed_at,
    // "known" = reviewed 3+ times, right at least 80% of the time.
    status: accuracy !== null && row.reviews >= 3 && accuracy >= 0.8 ? 'known' : null,
  };
}

/** Your library: saved words, newest first, narrowed by search and filters. */
export async function getLibrary(db: SQLiteDatabase, filters: LibraryFilters): Promise<LibraryWord[]> {
  const where = ['w.saved_at IS NOT NULL'];
  const params: (string | number)[] = [];
  const search = filters.search.trim();
  if (search) {
    where.push('(w.word LIKE ? OR w.reading LIKE ? OR w.meaning_en LIKE ? OR w.meaning_zh LIKE ?)');
    params.push(...Array(4).fill(`%${search}%`));
  }
  if (filters.pos) {
    where.push('w.pos = ?');
    params.push(filters.pos);
  }
  if (filters.jlpt) {
    where.push('w.jlpt = ?');
    params.push(filters.jlpt);
  }
  if (filters.topic) {
    where.push('w.topic = ?');
    params.push(filters.topic);
  }
  if (filters.status === 'starred') where.push('w.starred_at IS NOT NULL');

  const rows = await db.getAllAsync<LibraryRow>(
    `SELECT w.*,
            s.ja AS example_ja, s.en AS example_en, s.zh AS example_zh,
            (SELECT COUNT(*) FROM review_logs l WHERE l.word_id = w.id) AS reviews,
            (SELECT COUNT(*) FROM review_logs l WHERE l.word_id = w.id AND l.rating > 1) AS correct,
            (SELECT MAX(reviewed_at) FROM review_logs l WHERE l.word_id = w.id) AS last_reviewed_at
       FROM words w
       LEFT JOIN sentences s ON s.id = (
         SELECT id FROM sentences WHERE word_id = w.id ORDER BY favorite DESC, seen DESC, id LIMIT 1
       )
      WHERE ${where.join(' AND ')}
      ORDER BY w.saved_at DESC`,
    ...params,
  );
  return rows.map(toLibraryWord);
}

/** Numbers for the library's stats strip. */
export async function getLibraryStats(db: SQLiteDatabase): Promise<LibraryStats> {
  const row = await db.getFirstAsync<{ total: number; starred: number }>(
    `SELECT COUNT(*) AS total, COUNT(starred_at) AS starred FROM words WHERE saved_at IS NOT NULL`,
  );
  const reviews = await db.getFirstAsync<{ correct: number; total: number }>(
    `SELECT COALESCE(SUM(l.rating > 1), 0) AS correct, COUNT(*) AS total
       FROM review_logs l JOIN words w ON w.id = l.word_id WHERE w.saved_at IS NOT NULL`,
  );
  // "Known" uses the same rule as the badge on each card.
  const statuses = await db.getFirstAsync<{ known: number }>(
    `SELECT COALESCE(SUM(n >= 3 AND acc >= 0.8), 0) AS known
       FROM (SELECT COUNT(l.id) AS n, AVG(l.rating > 1) AS acc
               FROM words w JOIN review_logs l ON l.word_id = w.id
              WHERE w.saved_at IS NOT NULL
              GROUP BY w.id)`,
  );
  return {
    total: row?.total ?? 0,
    starred: row?.starred ?? 0,
    known: statuses?.known ?? 0,
    accuracy: reviews && reviews.total > 0 ? reviews.correct / reviews.total : null,
  };
}

export async function getRecentlyAdded(db: SQLiteDatabase, limit: number): Promise<Word[]> {
  const rows = await db.getAllAsync<WordRow>(
    'SELECT * FROM words WHERE saved_at IS NOT NULL ORDER BY saved_at DESC LIMIT ?',
    limit,
  );
  return rows.map(toWord);
}

/** Starter catalog words for 発見, optionally for one topic. */
export async function getCatalog(db: SQLiteDatabase, topic: Topic | null): Promise<Word[]> {
  const rows = await db.getAllAsync<WordRow>(
    `SELECT * FROM words WHERE is_custom = 0 ${topic ? 'AND topic = ?' : ''}
      ORDER BY jlpt IS NULL, jlpt DESC, id`,
    ...(topic ? [topic] : []),
  );
  return rows.map(toWord);
}

/** Add a catalog word to your library, or take it out (which also unstars it). */
export async function setWordSaved(db: SQLiteDatabase, id: number, saved: boolean) {
  await db.runAsync(
    'UPDATE words SET saved_at = ?, starred_at = CASE WHEN ? THEN starred_at END WHERE id = ?',
    saved ? new Date().toISOString() : null, saved ? 1 : 0, id,
  );
}

/** ⭐ Star a word to review it. Starring also saves it to your library. */
export async function setWordStarred(db: SQLiteDatabase, id: number, starred: boolean) {
  const now = new Date().toISOString();
  await db.runAsync(
    `UPDATE words SET starred_at = ?, saved_at = CASE WHEN ? THEN COALESCE(saved_at, ?) ELSE saved_at END
      WHERE id = ?`,
    starred ? now : null, starred ? 1 : 0, now, id,
  );
}

export async function updateWordNotes(db: SQLiteDatabase, id: number, notes: string) {
  await db.runAsync('UPDATE words SET notes = ? WHERE id = ?', notes, id);
}

/** Save a word you typed in. Returns its new id. */
export async function insertWord(db: SQLiteDatabase, input: WordInput): Promise<number> {
  const now = new Date().toISOString();
  let id = 0;
  await db.withTransactionAsync(async () => {
    const result = await db.runAsync(
      `INSERT INTO words (word, furigana, reading, meaning_en, meaning_zh, pos, jlpt, notes,
                          is_custom, saved_at, starred_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      input.word, makeFurigana(input.word, input.reading), input.reading, input.meaningEn,
      input.meaningZh, input.pos, input.jlpt, input.notes, now, input.starred ? now : null,
    );
    id = result.lastInsertRowId;
    await saveExample(db, id, input);
  });
  return id;
}

export async function updateWord(db: SQLiteDatabase, id: number, input: WordInput) {
  const existing = await getWord(db, id);
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `UPDATE words SET word = ?, furigana = ?, reading = ?, meaning_en = ?, meaning_zh = ?,
                        pos = ?, jlpt = ?, notes = ?, starred_at = ?
        WHERE id = ?`,
      input.word, makeFurigana(input.word, input.reading), input.reading, input.meaningEn,
      input.meaningZh, input.pos, input.jlpt, input.notes,
      input.starred ? (existing?.starredAt ?? new Date().toISOString()) : null, id,
    );
    await saveExample(db, id, input);
  });
}

/** Your own example sentence: added once, then shown like the built-in ones. */
async function saveExample(db: SQLiteDatabase, wordId: number, input: WordInput) {
  if (!input.example?.ja.trim()) return;
  const ja = markTarget(input.example.ja.trim(), input.word);
  const exists = await db.getFirstAsync('SELECT 1 FROM sentences WHERE word_id = ? AND ja = ?', wordId, ja);
  if (exists) return;
  const translation = input.example.translation.trim();
  await db.runAsync(
    'INSERT INTO sentences (word_id, ja, en, zh, seen) VALUES (?, ?, ?, ?, 1)',
    wordId, ja, translation, translation,
  );
}

/** Wrap the first appearance of the word in {braces}, so it gets highlighted. */
function markTarget(sentence: string, word: string): string {
  return sentence.includes(word) ? sentence.replace(word, `{${word}}`) : sentence;
}

/** Delete a word you typed in yourself, with its sentences and history. */
export async function deleteWord(db: SQLiteDatabase, id: number) {
  await db.runAsync('DELETE FROM words WHERE id = ? AND is_custom = 1', id);
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
 * "Show another example": reveal the next unseen sentence from the bank.
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

// ── Review ───────────────────────────────────────────────────

/** All ⭐ starred words, in random order, for a review session. */
export async function getStarredShuffled(db: SQLiteDatabase): Promise<Word[]> {
  const rows = await db.getAllAsync<WordRow>(
    'SELECT * FROM words WHERE starred_at IS NOT NULL ORDER BY RANDOM()',
  );
  return rows.map(toWord);
}

export async function countStarred(db: SQLiteDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ n: number }>(
    'SELECT COUNT(*) AS n FROM words WHERE starred_at IS NOT NULL',
  );
  return row?.n ?? 0;
}

/** Remember each answer, so the library can show which words you know (習得). */
export async function recordReview(
  db: SQLiteDatabase,
  wordId: number,
  remembered: boolean,
  now = new Date(),
) {
  await db.runAsync(
    'INSERT INTO review_logs (word_id, rating, state, reviewed_at, day) VALUES (?, ?, 0, ?, ?)',
    wordId, remembered ? 3 : 1, now.toISOString(), toLocalDay(now),
  );
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
