import type { SQLiteDatabase } from 'expo-sqlite';

import { isWordCategory } from '@/lib/categories';
import { makeFurigana } from '@/lib/furigana';

import { markDirtyMany } from './sync';

import type { Word } from './types';

/**
 * moji's shared dictionary (moji-api, GET /dictionary) becomes the catalog: the words you
 * browse by level. Each entry is a catalog word (is_custom = 0) with uid "cat:<word>|<reading>",
 * the same uid the starter words use, so saving, starring and sync work as before.
 *
 * Words you've saved are yours: a dictionary update never overwrites them.
 */

export type DictionaryEntry = {
  word: string;
  reading: string;
  meaningEn: string;
  meaningZh: string;
  pos: Word['pos'];
  verbGroup: Word['verbGroup'];
  jlpt: Word['jlpt'];
  category: string | null;
  zhLinkKind: string | null;
  zhNoteEn: string;
  zhNoteZh: string;
  example: { ja: string; en: string; zh: string } | null;
  deleted: boolean;
};

const ZH_LINK_KINDS = new Set(['same', 'nuance', 'false-friend']);

/** Save downloaded entries into the catalog. Returns how many words changed here. */
export async function applyDictionary(db: SQLiteDatabase, entries: DictionaryEntry[]): Promise<number> {
  if (entries.length === 0) return 0;
  const existing = new Map(
    (
      await db.getAllAsync<{ id: number; uid: string; mine: number }>(
        `SELECT id, uid, (is_custom = 1 OR saved_at IS NOT NULL OR notes != '') AS mine
           FROM words WHERE uid LIKE 'cat:%'`,
      )
    ).map((row) => [row.uid, row]),
  );

  let changed = 0;
  await db.withTransactionAsync(async () => {
    const insert = await db.prepareAsync(
      `INSERT INTO words (word, furigana, reading, meaning_en, meaning_zh, pos, verb_group, jlpt, topic,
                          zh_link_kind, zh_note_en, zh_note_zh, is_custom, uid)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
    );
    const update = await db.prepareAsync(
      `UPDATE words SET furigana = ?, meaning_en = ?, meaning_zh = ?, pos = ?, verb_group = ?, jlpt = ?, topic = ?,
                        zh_link_kind = ?, zh_note_en = ?, zh_note_zh = ?
        WHERE id = ?`,
    );
    const hasSentence = await db.prepareAsync('SELECT 1 FROM sentences WHERE word_id = ? LIMIT 1');
    const addSentence = await db.prepareAsync('INSERT INTO sentences (word_id, ja, en, zh) VALUES (?, ?, ?, ?)');
    const remove = await db.prepareAsync('DELETE FROM words WHERE id = ?');
    try {
      for (const entry of entries) {
        const uid = `cat:${entry.word}|${entry.reading}`;
        const row = existing.get(uid);
        // Your saved words (and notes) stay as you have them.
        if (row?.mine) continue;
        if (entry.deleted) {
          if (row) {
            await remove.executeAsync(row.id);
            existing.delete(uid);
            changed++;
          }
          continue;
        }
        const fields = [
          entry.meaningEn,
          entry.meaningZh,
          entry.pos,
          entry.pos === 'verb' ? entry.verbGroup : null,
          entry.jlpt,
          isWordCategory(entry.category) ? entry.category : null,
          entry.zhLinkKind && ZH_LINK_KINDS.has(entry.zhLinkKind) ? entry.zhLinkKind : null,
          entry.zhNoteEn || null,
          entry.zhNoteZh || null,
        ];
        const furigana = makeFurigana(entry.word, entry.reading);
        let id: number;
        let needsExample = true;
        if (row) {
          id = row.id;
          await update.executeAsync(furigana, ...fields, id);
          // A starter word keeps the example sentences it came with.
          needsExample = (await (await hasSentence.executeAsync(id)).getFirstAsync()) === null;
        } else {
          const result = await insert.executeAsync(entry.word, furigana, entry.reading, ...fields, uid);
          id = result.lastInsertRowId;
          existing.set(uid, { id, uid, mine: 0 });
        }
        if (needsExample && entry.example?.ja) {
          await addSentence.executeAsync(id, entry.example.ja, entry.example.en, entry.example.zh);
        }
        changed++;
      }
    } finally {
      await Promise.all([insert, update, hasSentence, addSentence, remove].map((s) => s.finalizeAsync()));
    }
  });
  return changed;
}

// ── Seen ─────────────────────────────────────────────────────

/** A word's "seen" uid: its writing and reading, the same on every device and in the dictionary. */
export const seenUid = (word: Pick<Word, 'word' | 'reading'>) => `${word.word}|${word.reading}`;

/** SQL for "this catalog word is new to you": not saved, and not marked as seen. */
export const UNSEEN_SQL =
  "(saved_at IS NULL AND NOT EXISTS (SELECT 1 FROM seen WHERE seen.uid = words.word || '|' || words.reading))";

/** Mark words as seen (or unseen again). Synced to your other devices. */
export async function setWordsSeen(db: SQLiteDatabase, words: Pick<Word, 'word' | 'reading'>[], seen: boolean) {
  const uids = words.map(seenUid);
  if (uids.length === 0) return;
  const now = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    const statement = await db.prepareAsync(
      seen ? 'INSERT INTO seen (uid, seen_at) VALUES (?, ?) ON CONFLICT (uid) DO NOTHING' : 'DELETE FROM seen WHERE uid = ?',
    );
    try {
      for (const uid of uids) await (seen ? statement.executeAsync(uid, now) : statement.executeAsync(uid));
    } finally {
      await statement.finalizeAsync();
    }
    await markDirtyMany(db, 'seen', uids);
  });
}

/** Whether you've marked a word as seen. */
export async function isWordSeen(db: SQLiteDatabase, word: Pick<Word, 'word' | 'reading'>): Promise<boolean> {
  const row = await db.getFirstAsync('SELECT 1 FROM seen WHERE uid = ?', seenUid(word));
  return row !== null;
}
