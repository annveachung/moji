/**
 * A small CSV reader and writer (RFC 4180): commas separate fields, and fields that
 * contain commas, quotes or line breaks are wrapped in "double quotes", with any
 * quote inside doubled ("").
 */

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  // Excel adds a byte-order mark at the start of UTF-8 files; ignore it.
  const input = text.replace(/^﻿/, '');

  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (quoted) {
      if (char === '"' && input[i + 1] === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && input[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  // Drop completely empty lines.
  return rows.filter((r) => r.some((cell) => cell.trim() !== ''));
}

function escapeField(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** Rows → CSV text, starting with a byte-order mark so Excel reads Japanese correctly. */
export function toCsv(rows: string[][]): string {
  return '﻿' + rows.map((r) => r.map(escapeField).join(',')).join('\r\n') + '\r\n';
}
