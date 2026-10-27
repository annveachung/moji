import type { JlptLevel } from '@/db/types';

import { parseCsv } from './csv';

/** A grammar rule read from a spreadsheet row. */
export type GrammarCsvRow = {
  line: number;
  pattern: string;
  meaningEn: string;
  meaningZh: string;
  jlpt: JlptLevel | null;
  formation: string;
  explanation: string;
  /** Example sentences from the row (more are added when a rule appears on several rows). */
  examples: { ja: string; en: string; zh: string }[];
};

export type GrammarCsvProblem = { line: number; reason: 'missing-pattern' };

type Field = 'pattern' | 'jlpt' | 'meaningEn' | 'meaningZh' | 'formation' | 'explanation' | 'exampleJa' | 'exampleEn' | 'exampleZh';

/**
 * Header names we recognise for each field (lower-cased). Spreadsheets name their
 * columns in many ways, so English, Japanese and Chinese names all work.
 */
const ALIASES: Record<Field, string[]> = {
  pattern: ['pattern', 'grammar', 'rule', 'grammar point', '文法', '文型', '表現', '語法'],
  jlpt: ['jlpt', 'level', 'jlpt level', 'レベル', '級', '級數', '级'],
  meaningEn: ['meaning_en', 'meaning', 'english', 'en', 'english meaning', '意味'],
  meaningZh: ['meaning_zh', 'chinese', 'zh', '中文', '意思', '中文意思', '中文意味'],
  formation: ['formation', 'structure', 'connection', 'form', 'how to use', '接続', '形', '接續', '用法'],
  explanation: ['explanation', 'notes', 'note', 'description', '説明', '解説', '說明', '備註', '备注'],
  exampleJa: ['example', 'example_ja', 'example sentence', 'sentence', '例文', '例', '例句'],
  exampleEn: ['example_en', 'translation', 'example translation', '訳', '翻訳', '英訳'],
  exampleZh: ['example_zh', '中文例句', '例句翻譯', '中訳', '中譯'],
};

/** Without a header row, columns are read in this order. */
const DEFAULT_ORDER: Field[] = ['pattern', 'jlpt', 'meaningEn', 'meaningZh', 'formation', 'explanation', 'exampleJa', 'exampleEn', 'exampleZh'];

/** "N3", "n3", "3" or "3級" → 3. */
function parseJlpt(value: string): JlptLevel | null {
  const n = Number(value.trim().replace(/^n/i, '').replace(/級$/, ''));
  return n >= 1 && n <= 5 ? (n as JlptLevel) : null;
}

/** Read a grammar spreadsheet. The first row may be a header; any order of columns works. */
export function csvToGrammar(text: string): { rules: GrammarCsvRow[]; problems: GrammarCsvProblem[]; unknownColumns: string[] } {
  const rows = parseCsv(text);
  if (rows.length === 0) return { rules: [], problems: [], unknownColumns: [] };

  const header = rows[0].map((c) => c.trim().toLowerCase());
  const columnOf = (field: Field) => header.findIndex((h) => ALIASES[field].includes(h));
  const hasHeader = columnOf('pattern') >= 0;
  const index: Record<Field, number> = Object.fromEntries(
    DEFAULT_ORDER.map((field, i) => [field, hasHeader ? columnOf(field) : i]),
  ) as Record<Field, number>;
  // Header columns we didn't recognise, so the importer can mention them.
  const known = new Set(Object.values(index));
  const unknownColumns = hasHeader ? header.filter((h, i) => h !== '' && !known.has(i)) : [];

  const cell = (row: string[], field: Field) => (index[field] >= 0 ? (row[index[field]] ?? '').trim() : '');

  const rules: GrammarCsvRow[] = [];
  const problems: GrammarCsvProblem[] = [];
  rows.slice(hasHeader ? 1 : 0).forEach((row, i) => {
    const line = i + (hasHeader ? 2 : 1);
    const pattern = cell(row, 'pattern');
    if (!pattern) {
      problems.push({ line, reason: 'missing-pattern' });
      return;
    }
    const exampleJa = cell(row, 'exampleJa');
    rules.push({
      line,
      pattern,
      meaningEn: cell(row, 'meaningEn'),
      meaningZh: cell(row, 'meaningZh'),
      jlpt: parseJlpt(cell(row, 'jlpt')),
      formation: cell(row, 'formation'),
      explanation: cell(row, 'explanation'),
      examples: exampleJa ? [{ ja: exampleJa, en: cell(row, 'exampleEn'), zh: cell(row, 'exampleZh') }] : [],
    });
  });
  return { rules, problems, unknownColumns };
}
