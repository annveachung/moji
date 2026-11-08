import type { SQLiteDatabase } from 'expo-sqlite';

import { kanjiIn, makeFurigana } from '@/lib/furigana';
import { guessVerbGroup } from '@/lib/verb';

import { UNSEEN_SQL } from './dictionary';
import { markDirty, markDirtyById, markWordChildrenDeleted, NEW_UID } from './sync';

import type { CsvWord } from '@/lib/word-csv';

import type {
  CollectionFilter,
  LibraryFilters,
  LibraryWord,
  RelatedWord,
  RelationKind,
  Sentence,
  Topic,
  VerbGroup,
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
  verb_group: Word['verbGroup'];
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
    verbGroup: row.pos === 'verb' ? row.verb_group : null,
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

/** Your library: saved words, newest first (⭐ only: newest star first), narrowed by search and filters. */
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
  if (filters.pos === 'verb' && filters.verbGroup) {
    where.push('w.verb_group = ?');
    params.push(filters.verbGroup);
  }
  if (filters.jlpt) {
    where.push('w.jlpt = ?');
    params.push(filters.jlpt);
  }
  if (filters.topic === 'other') {
    where.push('w.topic IS NULL');
  } else if (filters.topic) {
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
      ORDER BY ${filters.status === 'starred' ? 'w.starred_at' : 'w.saved_at'} DESC`,
    ...params,
  );
  return rows.map(toLibraryWord);
}

export async function getRecentlyAdded(db: SQLiteDatabase, limit: number): Promise<Word[]> {
  const rows = await db.getAllAsync<WordRow>(
    'SELECT * FROM words WHERE saved_at IS NOT NULL ORDER BY saved_at DESC LIMIT ?',
    limit,
  );
  return rows.map(toWord);
}

/** SQL conditions for a collection of catalog words. */
function collectionWhere(filter: CollectionFilter): { sql: string; params: (string | number)[] } {
  const where = ['is_custom = 0'];
  const params: (string | number)[] = [];
  if (filter.topic === 'other') where.push('topic IS NULL');
  else if (filter.topic) {
    where.push('topic = ?');
    params.push(filter.topic);
  }
  if (filter.jlpt) {
    where.push('jlpt = ?');
    params.push(filter.jlpt);
  }
  if (filter.hardestFrom) {
    where.push('jlpt IS NOT NULL AND jlpt <= ?');
    params.push(filter.hardestFrom);
  }
  if (filter.zhLink) {
    where.push('zh_link_kind = ?');
    params.push(filter.zhLink);
  }
  if (filter.excludeFalseFriends) {
    where.push("(zh_link_kind IS NULL OR zh_link_kind != 'false-friend')");
  }
  if (filter.kanjiCompound) {
    // No character outside the kanji range (一-鿿, plus the repeat mark 々), and at least two.
    where.push("length(word) >= 2 AND word NOT GLOB '*[^一-鿿々]*'");
  }
  if (filter.tag) {
    // tags are stored as a JSON array, e.g. ["する verb"]
    where.push('tags LIKE ?');
    params.push(`%${JSON.stringify(filter.tag)}%`);
  }
  if (filter.unseenOnly) where.push(UNSEEN_SQL);
  return { sql: where.join(' AND '), params };
}

/** A catalog word, and whether it's new to you (not saved, not marked as seen). */
export type CatalogWord = Word & { unseen: boolean };

/** Catalog words in a collection or topic, easiest JLPT level first. */
export async function getCollectionWords(db: SQLiteDatabase, filter: CollectionFilter): Promise<CatalogWord[]> {
  const { sql, params } = collectionWhere(filter);
  const rows = await db.getAllAsync<WordRow & { unseen: number }>(
    `SELECT *, ${UNSEEN_SQL} AS unseen FROM words WHERE ${sql} ORDER BY jlpt IS NULL, jlpt DESC, id`,
    ...params,
  );
  return rows.map((row) => ({ ...toWord(row), unseen: row.unseen === 1 }));
}

/** "4 / 10 saved" for a collection, and how many of its words are new to you. */
export async function getCollectionProgress(
  db: SQLiteDatabase,
  filter: CollectionFilter,
): Promise<{ saved: number; total: number; unseen: number }> {
  const { sql, params } = collectionWhere(filter);
  const row = await db.getFirstAsync<{ saved: number; total: number; unseen: number | null }>(
    `SELECT COUNT(saved_at) AS saved, COUNT(*) AS total, SUM(${UNSEEN_SQL}) AS unseen FROM words WHERE ${sql}`,
    ...params,
  );
  return { saved: row?.saved ?? 0, total: row?.total ?? 0, unseen: row?.unseen ?? 0 };
}

/** Add a catalog word to your library, or take it out (which also unstars it). */
export async function setWordSaved(db: SQLiteDatabase, id: number, saved: boolean) {
  await db.runAsync(
    'UPDATE words SET saved_at = ?, starred_at = CASE WHEN ? THEN starred_at END WHERE id = ?',
    saved ? new Date().toISOString() : null, saved ? 1 : 0, id,
  );
  await markDirtyById(db, 'word', id);
}

/** ⭐ Star a word to review it. Starring also saves it to your library. */
export async function setWordStarred(db: SQLiteDatabase, id: number, starred: boolean) {
  const now = new Date().toISOString();
  await db.runAsync(
    `UPDATE words SET starred_at = ?, saved_at = CASE WHEN ? THEN COALESCE(saved_at, ?) ELSE saved_at END
      WHERE id = ?`,
    starred ? now : null, starred ? 1 : 0, now, id,
  );
  await markDirtyById(db, 'word', id);
}

/** Save a word you typed in. Returns its new id. */
export async function insertWord(db: SQLiteDatabase, input: WordInput): Promise<number> {
  let id = 0;
  await db.withTransactionAsync(async () => {
    id = await insertWordRows(db, input);
  });
  return id;
}

/** The inserts behind insertWord, without a transaction, so imports can batch many in one. */
async function insertWordRows(db: SQLiteDatabase, input: WordInput): Promise<number> {
  const now = new Date().toISOString();
  const result = await db.runAsync(
    `INSERT INTO words (word, furigana, reading, meaning_en, meaning_zh, pos, verb_group, jlpt, topic, notes,
                        zh_link_kind, zh_note_en, zh_note_zh, is_custom, saved_at, starred_at, uid)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ${NEW_UID})`,
    input.word, makeFurigana(input.word, input.reading), input.reading, input.meaningEn,
    input.meaningZh, input.pos, verbGroupFor(input), input.jlpt, input.topic ?? null, input.notes, input.zhLinkKind ?? null,
    input.zhNoteEn || null, input.zhNoteZh || null, now, input.starred ? now : null,
  );
  await markDirtyById(db, 'word', result.lastInsertRowId);
  await saveExample(db, result.lastInsertRowId, input);
  return result.lastInsertRowId;
}

export async function updateWord(db: SQLiteDatabase, id: number, input: WordInput) {
  const existing = await getWord(db, id);
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `UPDATE words SET word = ?, furigana = ?, reading = ?, meaning_en = ?, meaning_zh = ?,
                        pos = ?, verb_group = ?, jlpt = ?, notes = ?, starred_at = ?
        WHERE id = ?`,
      input.word, makeFurigana(input.word, input.reading), input.reading, input.meaningEn,
      input.meaningZh, input.pos, verbGroupFor(input), input.jlpt, input.notes,
      input.starred ? (existing?.starredAt ?? new Date().toISOString()) : null, id,
    );
    await markDirtyById(db, 'word', id);
    await saveExample(db, id, input);
  });
}

// ── Duplicates, import and export ────────────────────────────

/**
 * The word with the same writing and reading, if moji already has it.
 * Words saved in your library come first, then starter-catalog words.
 */
export async function findDuplicate(db: SQLiteDatabase, word: string, reading: string): Promise<Word | null> {
  const row = await db.getFirstAsync<WordRow>(
    'SELECT * FROM words WHERE word = ? AND reading = ? ORDER BY saved_at IS NULL LIMIT 1',
    word.trim(), reading.trim(),
  );
  return row ? toWord(row) : null;
}

/** Every saved word, oldest first, for exporting. */
export async function getAllLibraryWords(db: SQLiteDatabase): Promise<Word[]> {
  const rows = await db.getAllAsync<WordRow>('SELECT * FROM words WHERE saved_at IS NOT NULL ORDER BY saved_at');
  return rows.map(toWord);
}

export type ImportPlan = {
  /** Not in your library yet: added (a matching starter word is saved instead of duplicated). */
  fresh: { csv: CsvWord; catalog: Word | null }[];
  /** Already in your library: merged only if you tick them. */
  duplicates: { csv: CsvWord; existing: Word }[];
  /** Rows repeated within the same file (only the first is used). */
  repeated: number;
};

/** Sort spreadsheet rows into new words and duplicates, without changing anything yet. */
export async function planImport(db: SQLiteDatabase, words: CsvWord[]): Promise<ImportPlan> {
  const plan: ImportPlan = { fresh: [], duplicates: [], repeated: 0 };
  const seen = new Set<string>();
  for (const csv of words) {
    const key = `${csv.word}\u0000${csv.reading}`;
    if (seen.has(key)) {
      plan.repeated++;
      continue;
    }
    seen.add(key);
    const match = await findDuplicate(db, csv.word, csv.reading);
    if (match?.savedAt) plan.duplicates.push({ csv, existing: match });
    else plan.fresh.push({ csv, catalog: match });
  }
  return plan;
}

/** Overwrite a word with a spreadsheet row. Empty cells keep the current value. */
async function mergeCsvInto(db: SQLiteDatabase, id: number, csv: CsvWord, now: string) {
  await db.runAsync(
    `UPDATE words SET
       meaning_en = COALESCE(NULLIF(?, ''), meaning_en),
       meaning_zh = COALESCE(NULLIF(?, ''), meaning_zh),
       pos = ?,
       verb_group = CASE WHEN ? = 'verb' THEN COALESCE(?, verb_group) END,
       jlpt = COALESCE(?, jlpt),
       topic = COALESCE(?, topic),
       notes = COALESCE(NULLIF(?, ''), notes),
       saved_at = COALESCE(saved_at, ?),
       starred_at = CASE WHEN ? THEN COALESCE(starred_at, ?) ELSE starred_at END
     WHERE id = ?`,
    csv.meaningEn, csv.meaningZh, csv.pos, csv.pos, csv.verbGroup ?? guessVerbGroup(csv.word, csv.reading), csv.jlpt,
    csv.topic, csv.notes, now,
    csv.starred ? 1 : 0, now, id,
  );
  await markDirtyById(db, 'word', id);
}

/** Carry out an import: add the new words, and merge the duplicates you ticked. */
export async function applyImport(
  db: SQLiteDatabase,
  plan: ImportPlan,
  mergeIds: Set<number>,
): Promise<{ added: number; merged: number; skipped: number }> {
  const now = new Date().toISOString();
  let merged = 0;
  await db.withTransactionAsync(async () => {
    for (const { csv, catalog } of plan.fresh) {
      if (catalog) {
        await mergeCsvInto(db, catalog.id, csv, now);
        continue;
      }
      await insertWordRows(db, {
        word: csv.word,
        reading: csv.reading,
        meaningEn: csv.meaningEn,
        meaningZh: csv.meaningZh,
        pos: csv.pos,
        verbGroup: csv.verbGroup,
        jlpt: csv.jlpt,
        topic: csv.topic,
        notes: csv.notes,
        starred: csv.starred,
        example: null,
      });
    }
    for (const { csv, existing } of plan.duplicates) {
      if (!mergeIds.has(existing.id)) continue;
      await mergeCsvInto(db, existing.id, csv, now);
      merged++;
    }
  });
  return { added: plan.fresh.length, merged, skipped: plan.duplicates.length - merged };
}

/** Your own example sentence: added once, then shown like the built-in ones. */
async function saveExample(db: SQLiteDatabase, wordId: number, input: WordInput) {
  if (!input.example?.ja.trim()) return;
  const ja = markTarget(input.example.ja.trim(), input.word);
  const exists = await db.getFirstAsync('SELECT 1 FROM sentences WHERE word_id = ? AND ja = ?', wordId, ja);
  if (exists) return;
  // AI examples come with both translations; one typed in by hand is used for both languages.
  const en = (input.example.en ?? input.example.translation).trim();
  const zh = (input.example.zh ?? input.example.translation).trim();
  const result = await db.runAsync(
    `INSERT INTO sentences (word_id, ja, en, zh, seen, uid) VALUES (?, ?, ?, ?, 1, ${NEW_UID})`,
    wordId, ja, en, zh,
  );
  await markDirtyById(db, 'sentence', result.lastInsertRowId);
}

/** A verb's group: the one given (form, AI, import), else worked out from the reading. Non-verbs: none. */
function verbGroupFor(input: Pick<WordInput, 'word' | 'reading' | 'pos' | 'verbGroup'>): VerbGroup | null {
  if (input.pos !== 'verb') return null;
  return input.verbGroup ?? guessVerbGroup(input.word, input.reading);
}

/** Wrap the first appearance of the word in {braces}, so it gets highlighted. */
function markTarget(sentence: string, word: string): string {
  if (sentence.includes('{')) return sentence;
  return sentence.includes(word) ? sentence.replace(word, `{${word}}`) : sentence;
}

/** Delete a word you typed in yourself, with its sentences and history. */
export async function deleteWord(db: SQLiteDatabase, id: number) {
  const row = await db.getFirstAsync<{ uid: string }>('SELECT uid FROM words WHERE id = ? AND is_custom = 1', id);
  if (!row) return;
  await markWordChildrenDeleted(db, id);
  await db.runAsync('DELETE FROM words WHERE id = ?', id);
  await markDirty(db, 'word', row.uid);
}

/**
 * Words connected to this one: hand-picked relations (in either direction),
 * then other words that share a kanji with it.
 */
const SHARED_KANJI_COUNT = 6;

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
    // A few, best first: your saved words, then easier levels, then shorter words.
    const shared = await db.getAllAsync<WordRow>(
      `SELECT * FROM words WHERE id != ? AND (${kanji.map(() => 'word LIKE ?').join(' OR ')})
        ORDER BY saved_at IS NULL, COALESCE(jlpt, 0) DESC, length(word), id
        LIMIT ${SHARED_KANJI_COUNT + related.length}`,
      word.id, ...kanji.map((k) => `%${k}%`),
    );
    const alreadyListed = new Set(related.map((r) => r.word.id));
    const fresh = shared.filter((row) => !alreadyListed.has(row.id)).slice(0, SHARED_KANJI_COUNT);
    for (const row of fresh) related.push({ kind: 'shared-kanji', word: toWord(row) });
  }
  return related;
}

/** The words related in meaning that were kept for this word, or null if not fetched yet. */
export async function getMeaningRelated(db: SQLiteDatabase, word: Word): Promise<Word[] | null> {
  const row = await db.getFirstAsync<{ related: string }>(
    'SELECT related FROM related_words WHERE word = ? AND reading = ?',
    word.word, word.reading,
  );
  if (!row) return null;
  const pairs = JSON.parse(row.related) as { word: string; reading: string }[];
  const words: Word[] = [];
  for (const pair of pairs) {
    // Your own copy if you have one, else the dictionary's.
    const found = await db.getFirstAsync<WordRow>(
      'SELECT * FROM words WHERE word = ? AND reading = ? ORDER BY is_custom DESC, saved_at IS NULL LIMIT 1',
      pair.word, pair.reading,
    );
    if (found && found.id !== word.id) words.push(toWord(found));
  }
  return words;
}

export async function setMeaningRelated(db: SQLiteDatabase, word: Word, related: { word: string; reading: string }[]) {
  await db.runAsync(
    'INSERT INTO related_words (word, reading, related) VALUES (?, ?, ?) ON CONFLICT (word, reading) DO UPDATE SET related = excluded.related',
    word.word, word.reading, JSON.stringify(related.map((r) => ({ word: r.word, reading: r.reading }))),
  );
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
  await markDirtyById(db, 'sentence', row.id);
  return toSentence({ ...row, seen: 1 });
}

/** Every example of a word, shown or not (so the AI can be told which ones it already has). */
export async function getAllSentences(db: SQLiteDatabase, wordId: number): Promise<Sentence[]> {
  const rows = await db.getAllAsync<SentenceRow>('SELECT * FROM sentences WHERE word_id = ? ORDER BY id', wordId);
  return rows.map(toSentence);
}

/** New examples (e.g. from the AI) go into the word's bank, not shown yet; repeats are skipped. */
export async function addSentences(db: SQLiteDatabase, wordId: number, sentences: { ja: string; en: string; zh: string }[]) {
  for (const sentence of sentences) {
    const exists = await db.getFirstAsync('SELECT 1 FROM sentences WHERE word_id = ? AND ja = ?', wordId, sentence.ja);
    if (exists) continue;
    const result = await db.runAsync(
      `INSERT INTO sentences (word_id, ja, en, zh, seen, uid) VALUES (?, ?, ?, ?, 0, ${NEW_UID})`,
      wordId, sentence.ja, sentence.en, sentence.zh,
    );
    await markDirtyById(db, 'sentence', result.lastInsertRowId);
  }
}

export async function countUnseenSentences(db: SQLiteDatabase, wordId: number): Promise<number> {
  const row = await db.getFirstAsync<{ n: number }>(
    'SELECT COUNT(*) AS n FROM sentences WHERE word_id = ? AND seen = 0',
    wordId,
  );
  return row?.n ?? 0;
}

/** Remove one example of a word (synced as deleted). */
export async function deleteSentence(db: SQLiteDatabase, id: number) {
  const row = await db.getFirstAsync<{ uid: string | null }>('SELECT uid FROM sentences WHERE id = ?', id);
  await db.runAsync('DELETE FROM sentences WHERE id = ?', id);
  await markDirty(db, 'sentence', row?.uid);
}

export async function setSentenceFavorite(db: SQLiteDatabase, id: number, favorite: boolean) {
  await db.runAsync('UPDATE sentences SET favorite = ? WHERE id = ?', favorite ? 1 : 0, id);
  await markDirtyById(db, 'sentence', id);
}

// ── Review ───────────────────────────────────────────────────

// ── Categories ───────────────────────────────────────────────

/** Move a word (by its local id) to another category; null = その他. */
export async function setWordCategory(db: SQLiteDatabase, id: number, category: Topic | null) {
  await db.runAsync('UPDATE words SET topic = ? WHERE id = ?', category, id);
  await markDirtyById(db, 'word', id);
}

export async function setWordTopic(db: SQLiteDatabase, uid: string, topic: Topic | null) {
  await db.runAsync('UPDATE words SET topic = ? WHERE uid = ?', topic, uid);
  await markDirty(db, 'word', uid);
}

/** Saved words still in その他, for the AI to sort into categories. */
export async function getUnsortedWords(db: SQLiteDatabase): Promise<(Word & { uid: string })[]> {
  const rows = await db.getAllAsync<WordRow & { uid: string }>(
    'SELECT * FROM words WHERE saved_at IS NOT NULL AND topic IS NULL ORDER BY saved_at DESC LIMIT 150',
  );
  return rows.map((row) => ({ ...toWord(row), uid: row.uid }));
}

// ── AI suggestions (ことば) ──────────────────────────────────

/** "word|reading" for every word in your library, to mark suggestions you've already saved. */
export async function getSavedWordKeys(db: SQLiteDatabase): Promise<Set<string>> {
  const rows = await db.getAllAsync<{ key: string }>(
    "SELECT word || '|' || reading AS key FROM words WHERE saved_at IS NOT NULL",
  );
  return new Set(rows.map((r) => r.key));
}

/** Every word in your library (just the writing), so the AI doesn't suggest them again. */
export async function getSavedWordList(db: SQLiteDatabase): Promise<string[]> {
  const rows = await db.getAllAsync<{ word: string }>('SELECT word FROM words WHERE saved_at IS NOT NULL ORDER BY saved_at DESC LIMIT 300');
  return rows.map((r) => r.word);
}

export async function getSetting(db: SQLiteDatabase, key: string): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', key);
  return row?.value ?? null;
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
