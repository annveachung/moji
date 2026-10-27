import type { SQLiteDatabase } from 'expo-sqlite';

import type { GrammarCsvRow } from '@/lib/grammar-csv';

import type { GrammarRule, GrammarSentence, JlptLevel } from './types';

/** Database access for the 文法 tab: grammar rules and the sentences saved for them. */

type GrammarRow = {
  id: number;
  pattern: string;
  meaning_en: string;
  meaning_zh: string;
  jlpt: JlptLevel | null;
  formation: string;
  explanation: string;
  sentence_count: number;
};

type SentenceRow = {
  id: number;
  grammar_id: number;
  ja: string;
  en: string;
  zh: string;
  source: GrammarSentence['source'];
};

const SELECT_RULE = `SELECT g.*, (SELECT COUNT(*) FROM grammar_sentences s WHERE s.grammar_id = g.id) AS sentence_count
                       FROM grammar g`;

function toRule(row: GrammarRow): GrammarRule {
  return {
    id: row.id,
    pattern: row.pattern,
    meaningEn: row.meaning_en,
    meaningZh: row.meaning_zh,
    jlpt: row.jlpt,
    formation: row.formation,
    explanation: row.explanation,
    sentenceCount: row.sentence_count,
  };
}

function toSentence(row: SentenceRow): GrammarSentence {
  return { id: row.id, grammarId: row.grammar_id, ja: row.ja, en: row.en, zh: row.zh, source: row.source };
}

/** Rules for the list, easiest level first, narrowed by level and search. */
export async function getGrammarRules(
  db: SQLiteDatabase,
  filters: { search: string; jlpt: JlptLevel | null },
): Promise<GrammarRule[]> {
  const where: string[] = [];
  const params: (string | number)[] = [];
  if (filters.jlpt) {
    where.push('g.jlpt = ?');
    params.push(filters.jlpt);
  }
  const search = filters.search.trim();
  if (search) {
    where.push('(g.pattern LIKE ? OR g.meaning_en LIKE ? OR g.meaning_zh LIKE ? OR g.explanation LIKE ?)');
    params.push(...Array(4).fill(`%${search}%`));
  }
  const rows = await db.getAllAsync<GrammarRow>(
    `${SELECT_RULE} ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY g.jlpt IS NULL, g.jlpt DESC, g.id`,
    ...params,
  );
  return rows.map(toRule);
}

export async function getGrammarRule(db: SQLiteDatabase, id: number): Promise<GrammarRule | null> {
  const row = await db.getFirstAsync<GrammarRow>(`${SELECT_RULE} WHERE g.id = ?`, id);
  return row ? toRule(row) : null;
}

export async function countGrammarRules(db: SQLiteDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM grammar');
  return row?.n ?? 0;
}

export async function getGrammarSentences(db: SQLiteDatabase, grammarId: number): Promise<GrammarSentence[]> {
  const rows = await db.getAllAsync<SentenceRow>(
    'SELECT * FROM grammar_sentences WHERE grammar_id = ? ORDER BY created_at DESC, id DESC',
    grammarId,
  );
  return rows.map(toSentence);
}

/** Save a sentence for a rule, e.g. one AI generated that you liked. */
export async function saveGrammarSentence(
  db: SQLiteDatabase,
  grammarId: number,
  sentence: { ja: string; en: string; zh: string },
  source: GrammarSentence['source'],
) {
  await db.runAsync(
    'INSERT INTO grammar_sentences (grammar_id, ja, en, zh, source) VALUES (?, ?, ?, ?, ?)',
    grammarId, sentence.ja, sentence.en, sentence.zh, source,
  );
}

export async function deleteGrammarSentence(db: SQLiteDatabase, id: number) {
  await db.runAsync('DELETE FROM grammar_sentences WHERE id = ?', id);
}

// ── Import ───────────────────────────────────────────────────

export type GrammarImportPlan = {
  fresh: GrammarCsvRow[];
  /** Same pattern (and level) already in 文法: merged only if you tick them. */
  duplicates: { csv: GrammarCsvRow; existing: GrammarRule }[];
  /** Rows repeating a rule already in the file (their examples join the first row). */
  repeated: number;
};

/** The rule with the same pattern and level (or with no level on either side). */
async function findGrammarDuplicate(db: SQLiteDatabase, row: GrammarCsvRow): Promise<GrammarRule | null> {
  const found = await db.getFirstAsync<GrammarRow>(
    `${SELECT_RULE} WHERE g.pattern = ? AND (g.jlpt IS ? OR g.jlpt IS NULL OR ? IS NULL) LIMIT 1`,
    row.pattern, row.jlpt, row.jlpt,
  );
  return found ? toRule(found) : null;
}

/** Sort spreadsheet rows into new rules and duplicates, without changing anything yet. */
export async function planGrammarImport(db: SQLiteDatabase, rows: GrammarCsvRow[]): Promise<GrammarImportPlan> {
  const plan: GrammarImportPlan = { fresh: [], duplicates: [], repeated: 0 };
  const firstInFile = new Map<string, GrammarCsvRow>();
  for (const row of rows) {
    const key = `${row.pattern}\u0000${row.jlpt ?? ''}`;
    const earlier = firstInFile.get(key);
    if (earlier) {
      // Same rule listed twice, e.g. once per example: keep one rule, collect the examples.
      plan.repeated++;
      earlier.examples.push(...row.examples);
      continue;
    }
    firstInFile.set(key, row);
    const existing = await findGrammarDuplicate(db, row);
    if (existing) plan.duplicates.push({ csv: row, existing });
    else plan.fresh.push(row);
  }
  return plan;
}

async function addExamples(db: SQLiteDatabase, grammarId: number, row: GrammarCsvRow) {
  for (const example of row.examples) {
    const exists = await db.getFirstAsync('SELECT 1 FROM grammar_sentences WHERE grammar_id = ? AND ja = ?', grammarId, example.ja);
    if (!exists) await saveGrammarSentence(db, grammarId, example, 'import');
  }
}

/** Add the new rules, and merge the duplicates you ticked (empty cells keep current values). */
export async function applyGrammarImport(
  db: SQLiteDatabase,
  plan: GrammarImportPlan,
  mergeIds: Set<number>,
): Promise<{ added: number; merged: number; skipped: number }> {
  let merged = 0;
  await db.withTransactionAsync(async () => {
    for (const row of plan.fresh) {
      const result = await db.runAsync(
        `INSERT INTO grammar (pattern, meaning_en, meaning_zh, jlpt, formation, explanation)
         VALUES (?, ?, ?, ?, ?, ?)`,
        row.pattern, row.meaningEn, row.meaningZh, row.jlpt, row.formation, row.explanation,
      );
      await addExamples(db, result.lastInsertRowId, row);
    }
    for (const { csv, existing } of plan.duplicates) {
      if (!mergeIds.has(existing.id)) continue;
      await db.runAsync(
        `UPDATE grammar SET
           meaning_en = COALESCE(NULLIF(?, ''), meaning_en),
           meaning_zh = COALESCE(NULLIF(?, ''), meaning_zh),
           jlpt = COALESCE(?, jlpt),
           formation = COALESCE(NULLIF(?, ''), formation),
           explanation = COALESCE(NULLIF(?, ''), explanation)
         WHERE id = ?`,
        csv.meaningEn, csv.meaningZh, csv.jlpt, csv.formation, csv.explanation, existing.id,
      );
      await addExamples(db, existing.id, csv);
      merged++;
    }
  });
  return { added: plan.fresh.length, merged, skipped: plan.duplicates.length - merged };
}
