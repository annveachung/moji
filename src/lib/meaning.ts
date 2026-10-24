import type { Language } from '@/db/types';

/**
 * The meaning in your chosen language, or the other language if that one is empty
 * (words you add yourself may only have one).
 */
export function meaningFor(item: { meaningEn: string; meaningZh: string }, language: Language): string {
  return language === 'zh-TW' ? item.meaningZh || item.meaningEn : item.meaningEn || item.meaningZh;
}

/** Same idea for example sentence translations. */
export function translationFor(item: { en: string; zh: string }, language: Language): string {
  return language === 'zh-TW' ? item.zh || item.en : item.en || item.zh;
}
