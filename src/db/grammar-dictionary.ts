import type { SQLiteDatabase } from 'expo-sqlite';

import { isGrammarFunction } from '@/lib/categories';

/**
 * The shared grammar list from moji-api (/grammar-dictionary), kept in the grammar table next to
 * your own rules: catalog rows have is_custom = 0 and uid "cat:N<level>:<pattern>".
 */

export type GrammarEntry = {
  pattern: string;
  jlpt: number;
  meaningEn: string;
  meaningZh: string;
  formation: string;
  category: string | null;
  example: { ja: string; en: string; zh: string } | null;
  deleted: boolean;
};

const catalogUid = (entry: { pattern: string; jlpt: number }) => `cat:N${entry.jlpt}:${entry.pattern}`;

/** Save downloaded entries. Rules you starred, and your own with the same pattern, are left as they are. */
export async function applyGrammarDictionary(db: SQLiteDatabase, entries: GrammarEntry[]): Promise<number> {
  if (entries.length === 0) return 0;
  const existing = new Map(
    (
      await db.getAllAsync<{ id: number; uid: string; mine: number }>(
        `SELECT id, uid, (is_custom = 1 OR starred_at IS NOT NULL) AS mine FROM grammar WHERE uid LIKE 'cat:%'`,
      )
    ).map((row) => [row.uid, row]),
  );
  // Your own rules (e.g. from a spreadsheet) already cover these patterns at these levels.
  const own = new Set(
    (await db.getAllAsync<{ pattern: string; jlpt: number | null }>("SELECT pattern, jlpt FROM grammar WHERE uid NOT LIKE 'cat:%' OR uid IS NULL")).map(
      (row) => `${row.jlpt}|${row.pattern}`,
    ),
  );

  let changed = 0;
  await db.withTransactionAsync(async () => {
    const insert = await db.prepareAsync(
      `INSERT INTO grammar (pattern, meaning_en, meaning_zh, jlpt, formation, category, is_custom, uid)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
    );
    const update = await db.prepareAsync(
      'UPDATE grammar SET meaning_en = ?, meaning_zh = ?, formation = ?, category = ? WHERE id = ?',
    );
    const hasSentence = await db.prepareAsync('SELECT 1 FROM grammar_sentences WHERE grammar_id = ? LIMIT 1');
    // The list's example isn't yours, so it has no uid and doesn't sync.
    const addSentence = await db.prepareAsync(
      "INSERT INTO grammar_sentences (grammar_id, ja, en, zh, source) VALUES (?, ?, ?, ?, 'import')",
    );
    const remove = await db.prepareAsync('DELETE FROM grammar WHERE id = ?');
    try {
      for (const entry of entries) {
        const uid = catalogUid(entry);
        const row = existing.get(uid);
        if (row?.mine) continue;
        if (entry.deleted) {
          if (row) {
            await remove.executeAsync(row.id);
            changed++;
          }
          continue;
        }
        if (!row && own.has(`${entry.jlpt}|${entry.pattern}`)) continue;
        const category = isGrammarFunction(entry.category) ? entry.category : null;
        let id = row?.id;
        if (id === undefined) {
          const result = await insert.executeAsync(
            entry.pattern, entry.meaningEn, entry.meaningZh, entry.jlpt, entry.formation, category, uid,
          );
          id = result.lastInsertRowId;
        } else {
          await update.executeAsync(entry.meaningEn, entry.meaningZh, entry.formation, category, id);
        }
        if (entry.example && !(await (await hasSentence.executeAsync(id)).getFirstAsync())) {
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
