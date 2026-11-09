/**
 * Split a sentence so the grammar pattern can be highlighted: 〜ても → "ても".
 * Patterns with several forms (ちゃいけない・じゃいけない, 〜ば／〜たら) use whichever form appears.
 */
export function highlightPattern(sentence: string, pattern: string): { text: string; match: boolean }[] {
  const forms = pattern
    .replace(/[〜～~]/g, '')
    .replace(/[（(][^）)]*[）)]/g, '')
    .split(/[・／/、,]/)
    .map((form) => form.trim())
    .filter(Boolean);
  for (const core of forms) {
    const at = sentence.indexOf(core);
    if (at < 0) continue;
    return [
      { text: sentence.slice(0, at), match: false },
      { text: core, match: true },
      { text: sentence.slice(at + core.length), match: false },
    ];
  }
  return [{ text: sentence, match: false }];
}
