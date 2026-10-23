import * as Speech from 'expo-speech';

/**
 * Reads Japanese aloud with the phone's built-in voice.
 * We pass the kana reading rather than the kanji, so the voice says exactly the
 * reading we show (a kanji word like 今日 could otherwise be read こんにち instead of きょう).
 */
export function speakJapanese(kana: string, rate = 1) {
  Speech.stop();
  Speech.speak(kana, { language: 'ja-JP', rate });
}
