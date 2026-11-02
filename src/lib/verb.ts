import type { TFunction } from 'i18next';

import type { PartOfSpeech, VerbGroup } from '@/db/types';

import { toHiragana } from './kana';

/**
 * Japanese verbs come in three groups, which decide how they conjugate (活用):
 *
 * 1. 五段動詞 (godan, う-verbs): end in う く ぐ す つ ぬ ぶ む る — 書く, 飲む, 話す, 帰る
 * 2. 一段動詞 (ichidan, る-verbs): end in いる / える — 食べる, 見る, 起きる, 教える
 * 3. 不規則動詞 (irregular): する and 来る (and compounds like 勉強する)
 *
 * The group is stored on its own (words.verb_group); conjugation forms are worked out from it.
 * New words get their group from the AI; this guess is for words already in moji and as a
 * starting point in the form.
 */
export const VERB_GROUPS: VerbGroup[] = ['godan', 'ichidan', 'irregular'];

/** Verbs that end in -iru / -eru but are godan anyway (the classic exceptions), by how they're written. */
const GODAN_EXCEPTIONS = new Set([
  '帰る', '入る', '走る', '知る', '要る', '切る', '限る', '喋る', '滑る', '減る', '握る', '蹴る', '茂る', '焦る',
  '参る', '混じる', '覆る', '遮る', '罵る', '捻る', '翻る', '甦る', '蘇る', '陥る', '練る', '照る', '侮る', '湿る',
  '散る', '弄る', '嘲る', '詰る', '煎る', '交じる', '捩る', '漲る', '脂ぎる', '火照る', '軋る', '迸る',
  'しゃべる', 'すべる', 'ける', 'あせる', 'いじる',
]);

const I_ROW = new Set([...'いきぎしじちぢにひびぴみり']);
const E_ROW = new Set([...'えけげせぜてでねへべぺめれ']);
const GODAN_ENDINGS = new Set([...'うくぐすつぬぶむる']);

/** The verb group of a verb, from how it's written and read. null if it doesn't look like a verb. */
export function guessVerbGroup(word: string, reading: string): VerbGroup | null {
  const w = word.trim();
  const r = toHiragana(reading.trim());
  if (!r) return null;
  // する, 来る and their compounds (勉強する, 持って来る)
  if (r === 'する' || w.endsWith('する') || (r.endsWith('ずる') && w.endsWith('ずる'))) return 'irregular';
  if (w === '来る' || w === 'くる' || w.endsWith('て来る') || w.endsWith('てくる')) return 'irregular';

  const last = r.at(-1)!;
  if (!GODAN_ENDINGS.has(last)) return null;
  if (last !== 'る') return 'godan';
  if (GODAN_EXCEPTIONS.has(w)) return 'godan';
  const before = r.at(-2);
  return before && (I_ROW.has(before) || E_ROW.has(before)) ? 'ichidan' : 'godan';
}

/** "godan", "五段", "group 1", "1"… → the group (for CSV import). */
export function parseVerbGroup(value: string): VerbGroup | null {
  const v = value.trim().toLowerCase().replace(/\s+/g, '');
  if (!v) return null;
  if (['godan', '五段', '五段動詞', 'group1', '1', 'u-verb', 'う動詞', 'グループ1', 'ⅰ'].includes(v)) return 'godan';
  if (['ichidan', '一段', '一段動詞', 'group2', '2', 'ru-verb', 'る動詞', 'グループ2', 'ⅱ'].includes(v)) return 'ichidan';
  if (['irregular', '不規則', '不規則動詞', 'group3', '3', 'グループ3', 'ⅲ', 'カ変', 'サ変'].includes(v)) return 'irregular';
  return null;
}

/** A word's part of speech for display; verbs show their group (五段動詞) instead of just 動詞. */
export function posLabel(t: TFunction, word: { pos: PartOfSpeech; verbGroup?: VerbGroup | null }): string {
  return word.pos === 'verb' && word.verbGroup ? t(`verbGroup.${word.verbGroup}`) : t(`pos.${word.pos}`);
}
