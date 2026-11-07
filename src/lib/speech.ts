import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { File, Paths } from 'expo-file-system';
import * as Speech from 'expo-speech';

import { fetchSpeech, speechKey } from './speech-clip';

let player: AudioPlayer | null = null;
/** Counts presses, so a slow clip doesn't start after you've already tapped something else. */
let latest = 0;
let audioModeSet = false;

/**
 * Reads Japanese aloud in moji's AI voice (a natural Japanese woman's voice). Clips are kept
 * on the phone, so a word you've heard before plays instantly, even offline. If the AI voice
 * can't be reached, the phone's built-in voice reads it instead.
 *
 * For a single word we pass the kana reading rather than the kanji, so it's read exactly as
 * shown (今日 could otherwise be read こんにち instead of きょう).
 */
export function speakJapanese(text: string, rate = 1) {
  const press = ++latest;
  stop();
  playAiVoice(text, rate, press).catch(() => {
    if (press === latest) Speech.speak(text, { language: 'ja-JP', rate });
  });
}

function stop() {
  Speech.stop();
  player?.remove();
  player = null;
}

async function playAiVoice(text: string, rate: number, press: number) {
  if (!audioModeSet) {
    // Play even when the iPhone's silent switch is on, like the built-in voice did.
    await setAudioModeAsync({ playsInSilentMode: true });
    audioModeSet = true;
  }
  // v2: clips saved before the server fix crash at the end, so they're fetched again.
  const file = new File(Paths.cache, `speech-v2-${speechKey(text)}.wav`);
  if (!file.exists) {
    const audio = await fetchSpeech(text);
    file.create({ overwrite: true });
    file.write(audio, { encoding: 'base64' });
  }
  if (press !== latest) return;
  player = createAudioPlayer(file.uri);
  if (rate !== 1) player.setPlaybackRate(rate);
  player.play();
}
