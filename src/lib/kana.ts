/** Katakana → hiragana (they sit exactly 0x60 apart in Unicode). */
export function toHiragana(text: string): string {
  return text.replace(/[\u30A1-\u30F6]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
}
