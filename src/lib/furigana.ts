import { toHiragana } from './romaji';

/**
 * Furigana markup (Anki style):
 *
 *   勉強[べんきょう]する   → 勉強 with べんきょう above it, then plain する
 *   食[た]べる            → a reading applies to the run of kanji right before it
 *   {勉強[べんきょう]}しています → {braces} mark the target word in an example sentence
 */

export type FuriganaSegment = {
  text: string;
  ruby?: string;
  /** Part of the {target} word (used for highlighting and fill-in-the-blank). */
  target?: boolean;
};

const KANJI = '\\u3400-\\u4DBF\\u4E00-\\u9FFF\\uF900-\\uFAFF々〆ヶ';
const RUBY_PATTERN = new RegExp(`([${KANJI}]+)\\[([^\\]]+)\\]`, 'g');
const TARGET_PATTERN = /\{([^}]*)\}/g;
const KANJI_CHAR = new RegExp(`[${KANJI}]`);
const KANJI_OR_KANA_RUN = new RegExp(`[${KANJI}]+|[^${KANJI}]+`, 'g');

function parseRuby(text: string, target: boolean): FuriganaSegment[] {
  const segments: FuriganaSegment[] = [];
  let last = 0;
  for (const match of text.matchAll(RUBY_PATTERN)) {
    if (match.index > last) segments.push({ text: text.slice(last, match.index), target });
    segments.push({ text: match[1], ruby: match[2], target });
    last = match.index + match[0].length;
  }
  if (last < text.length) segments.push({ text: text.slice(last), target });
  return segments;
}

export function parseFurigana(markup: string): FuriganaSegment[] {
  const segments: FuriganaSegment[] = [];
  let last = 0;
  for (const match of markup.matchAll(TARGET_PATTERN)) {
    segments.push(...parseRuby(markup.slice(last, match.index), false));
    segments.push(...parseRuby(match[1], true));
    last = match.index + match[0].length;
  }
  segments.push(...parseRuby(markup.slice(last), false));
  return segments.filter((s) => s.text.length > 0);
}

/** 勉強[べんきょう]する → 勉強する */
export function stripFurigana(markup: string): string {
  return parseFurigana(markup)
    .map((s) => s.text)
    .join('');
}

/** 勉強[べんきょう]する → べんきょうする */
export function furiganaToReading(markup: string): string {
  return parseFurigana(markup)
    .map((s) => s.ruby ?? s.text)
    .join('');
}

/** The distinct kanji in a string, e.g. 大丈夫 → ['大', '丈', '夫'] */
export function kanjiIn(text: string): string[] {
  return [...new Set([...text].filter((c) => KANJI_CHAR.test(c)))];
}

/**
 * Build furigana markup from a word and its reading, so you never type brackets:
 *   makeFurigana('乗り換え', 'のりかえ') → '乗[の]り換[か]え'
 * The kana in the word act as anchors: each kanji run gets the part of the
 * reading between them. If the reading doesn't fit the word, no furigana is added.
 */
export function makeFurigana(word: string, reading: string): string {
  const runs = word.match(KANJI_OR_KANA_RUN) ?? [];
  if (!runs.some((run) => KANJI_CHAR.test(run))) return word;

  const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = runs
    .map((run) => (KANJI_CHAR.test(run) ? '(.+?)' : escape(toHiragana(run))))
    .join('');
  const match = toHiragana(reading).match(new RegExp(`^${pattern}$`));
  if (!match) return word;

  let group = 1;
  return runs.map((run) => (KANJI_CHAR.test(run) ? `${run}[${match[group++]}]` : run)).join('');
}
