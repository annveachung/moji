import type { SQLiteDatabase } from 'expo-sqlite';
import { Platform } from 'react-native';

import { SEED_RELATIONS, SEED_WORDS } from './seed-data';

export const DATABASE_NAME = 'moji.db';

/**
 * Bump this and add a `if (version < N)` block below whenever the schema changes.
 * SQLite remembers the version in `PRAGMA user_version`, so each migration runs once.
 */
const DATABASE_VERSION = 4;

export async function migrateDbIfNeeded(db: SQLiteDatabase) {
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const version = row?.user_version ?? 0;
  if (version >= DATABASE_VERSION) return;

  // The web version of SQLite has no exclusive transactions; a normal one is fine there (one tab).
  const transaction = (task: (tx: SQLiteDatabase) => Promise<void>) =>
    Platform.OS === 'web' ? db.withTransactionAsync(() => task(db)) : db.withExclusiveTransactionAsync(task);

  await transaction(async (tx) => {
    if (version < 1) {
      await tx.execAsync(`
        CREATE TABLE words (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          word TEXT NOT NULL,
          furigana TEXT NOT NULL,
          reading TEXT NOT NULL,
          meaning_en TEXT NOT NULL,
          meaning_zh TEXT NOT NULL,
          pos TEXT NOT NULL,
          jlpt INTEGER,
          topic TEXT,
          tags TEXT NOT NULL DEFAULT '[]',
          notes TEXT NOT NULL DEFAULT '',
          zh_link_kind TEXT,
          zh_note_en TEXT,
          zh_note_zh TEXT,
          saved_at TEXT,
          created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
        );

        CREATE TABLE sentences (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          word_id INTEGER NOT NULL REFERENCES words(id) ON DELETE CASCADE,
          ja TEXT NOT NULL,
          en TEXT NOT NULL,
          zh TEXT NOT NULL,
          favorite INTEGER NOT NULL DEFAULT 0,
          seen INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE word_relations (
          word_id INTEGER NOT NULL REFERENCES words(id) ON DELETE CASCADE,
          other_id INTEGER NOT NULL REFERENCES words(id) ON DELETE CASCADE,
          kind TEXT NOT NULL,
          PRIMARY KEY (word_id, other_id, kind)
        );

        -- One row per word you have started learning: its FSRS memory state.
        CREATE TABLE cards (
          word_id INTEGER PRIMARY KEY REFERENCES words(id) ON DELETE CASCADE,
          due TEXT NOT NULL,
          stability REAL NOT NULL,
          difficulty REAL NOT NULL,
          elapsed_days INTEGER NOT NULL,
          scheduled_days INTEGER NOT NULL,
          learning_steps INTEGER NOT NULL,
          reps INTEGER NOT NULL,
          lapses INTEGER NOT NULL,
          state INTEGER NOT NULL,
          last_review TEXT,
          learned_at TEXT NOT NULL,
          learned_day TEXT NOT NULL
        );

        -- Every Again/Hard/Good/Easy press, for streaks and stats.
        CREATE TABLE review_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          word_id INTEGER NOT NULL REFERENCES words(id) ON DELETE CASCADE,
          rating INTEGER NOT NULL,
          state INTEGER NOT NULL,
          reviewed_at TEXT NOT NULL,
          day TEXT NOT NULL
        );

        CREATE TABLE settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );

        CREATE INDEX idx_sentences_word ON sentences(word_id);
        CREATE INDEX idx_cards_due ON cards(due);
        CREATE INDEX idx_review_logs_day ON review_logs(day);
      `);
      await seed(tx);
    }
    if (version < 2) {
      // moji became a notebook: you ⭐ star the words you want to review, instead of
      // FSRS scheduling them. Words already in the review deck become starred.
      await tx.execAsync(`
        ALTER TABLE words ADD COLUMN starred_at TEXT;
        ALTER TABLE words ADD COLUMN is_custom INTEGER NOT NULL DEFAULT 0;
        UPDATE words SET starred_at = (SELECT learned_at FROM cards WHERE cards.word_id = words.id)
         WHERE id IN (SELECT word_id FROM cards);
        UPDATE words SET saved_at = COALESCE(saved_at, starred_at) WHERE starred_at IS NOT NULL;
        DROP TABLE cards;
        CREATE INDEX idx_words_saved ON words(saved_at);
        CREATE INDEX idx_review_logs_word ON review_logs(word_id);
      `);
    }
    if (version < 3) {
      // 文法: grammar rules (imported from a spreadsheet) and sentences saved for each.
      await tx.execAsync(`
        CREATE TABLE grammar (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          pattern TEXT NOT NULL,
          meaning_en TEXT NOT NULL DEFAULT '',
          meaning_zh TEXT NOT NULL DEFAULT '',
          jlpt INTEGER,
          formation TEXT NOT NULL DEFAULT '',
          explanation TEXT NOT NULL DEFAULT '',
          created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
        );

        CREATE TABLE grammar_sentences (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          grammar_id INTEGER NOT NULL REFERENCES grammar(id) ON DELETE CASCADE,
          ja TEXT NOT NULL,
          en TEXT NOT NULL DEFAULT '',
          zh TEXT NOT NULL DEFAULT '',
          -- 'import' = from your spreadsheet, 'ai' = generated and saved by you
          source TEXT NOT NULL DEFAULT 'import',
          created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
        );

        CREATE INDEX idx_grammar_jlpt ON grammar(jlpt);
        CREATE INDEX idx_grammar_sentences_rule ON grammar_sentences(grammar_id);
      `);
    }
    if (version < 4) {
      // Sync with moji-api: every row you own gets a uid that is the same on all your devices.
      // Starter-catalog words use their writing and reading, so each device finds the same word.
      // The outbox lists rows changed here that the server hasn't got yet.
      const randomUid = "lower(hex(randomblob(16)))";
      await tx.execAsync(`
        ALTER TABLE words ADD COLUMN uid TEXT;
        ALTER TABLE sentences ADD COLUMN uid TEXT;
        ALTER TABLE review_logs ADD COLUMN uid TEXT;
        ALTER TABLE grammar ADD COLUMN uid TEXT;
        ALTER TABLE grammar_sentences ADD COLUMN uid TEXT;

        UPDATE words SET uid = CASE WHEN is_custom = 1 THEN ${randomUid} ELSE 'cat:' || word || '|' || reading END;
        -- Starter sentences come with the app; only your own (on words you added) are synced.
        UPDATE sentences SET uid = ${randomUid} WHERE word_id IN (SELECT id FROM words WHERE is_custom = 1);
        UPDATE review_logs SET uid = ${randomUid};
        UPDATE grammar SET uid = ${randomUid};
        UPDATE grammar_sentences SET uid = ${randomUid};

        CREATE UNIQUE INDEX idx_words_uid ON words(uid);
        CREATE UNIQUE INDEX idx_sentences_uid ON sentences(uid);
        CREATE UNIQUE INDEX idx_review_logs_uid ON review_logs(uid);
        CREATE UNIQUE INDEX idx_grammar_uid ON grammar(uid);
        CREATE UNIQUE INDEX idx_grammar_sentences_uid ON grammar_sentences(uid);

        -- Topics the AI created (the built-in ones live in the app's translations).
        CREATE TABLE topics (
          id TEXT PRIMARY KEY,
          label_ja TEXT NOT NULL,
          label_en TEXT NOT NULL,
          label_zh TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
        );

        CREATE TABLE outbox (
          kind TEXT NOT NULL,
          uid TEXT NOT NULL,
          -- Bumped on every change, so a change made during an upload isn't lost.
          version INTEGER NOT NULL DEFAULT 1,
          PRIMARY KEY (kind, uid)
        );

        CREATE TABLE sync_state (key TEXT PRIMARY KEY, value TEXT NOT NULL);

        -- Everything you already have goes up on the first sync.
        INSERT INTO outbox (kind, uid) SELECT 'word', uid FROM words
          WHERE saved_at IS NOT NULL OR is_custom = 1 OR starred_at IS NOT NULL OR notes != '';
        INSERT INTO outbox (kind, uid) SELECT 'sentence', uid FROM sentences WHERE uid IS NOT NULL;
        INSERT INTO outbox (kind, uid) SELECT 'review', uid FROM review_logs;
        INSERT INTO outbox (kind, uid) SELECT 'grammar', uid FROM grammar;
        INSERT INTO outbox (kind, uid) SELECT 'grammarSentence', uid FROM grammar_sentences;
      `);
    }
    await tx.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
  });
}

async function seed(db: SQLiteDatabase) {
  const ids = new Map<string, number>();
  for (const w of SEED_WORDS) {
    const word = w.furigana.replace(/\[[^\]]*\]/g, '');
    const result = await db.runAsync(
      `INSERT INTO words (word, furigana, reading, meaning_en, meaning_zh, pos, jlpt, topic, tags,
                          zh_link_kind, zh_note_en, zh_note_zh)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      word, w.furigana, w.reading, w.en, w.zh, w.pos, w.jlpt, w.topic,
      JSON.stringify(w.tags ?? []), w.zhLink, w.zhNoteEn, w.zhNoteZh,
    );
    ids.set(word, result.lastInsertRowId);
    for (const [ja, en, zh] of w.sentences) {
      await db.runAsync(
        'INSERT INTO sentences (word_id, ja, en, zh) VALUES (?, ?, ?, ?)',
        result.lastInsertRowId, ja, en, zh,
      );
    }
  }
  for (const [word, other, kind] of SEED_RELATIONS) {
    const wordId = ids.get(word);
    const otherId = ids.get(other);
    if (wordId === undefined || otherId === undefined) {
      throw new Error(`Seed relation refers to an unknown word: ${word} → ${other}`);
    }
    await db.runAsync(
      'INSERT INTO word_relations (word_id, other_id, kind) VALUES (?, ?, ?)',
      wordId, otherId, kind,
    );
  }
}
