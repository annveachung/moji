import * as Speech from 'expo-speech';

import { fetchSpeech } from './speech-clip';

/** 10 ms of silence: played once during your first tap to unlock sound (see below). */
const SILENCE = 'data:audio/wav;base64,UklGRgQCAABXQVZFZm10IBAAAAABAAEAwF0AAIC7AAACABAAZGF0YeABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';

/** Clips heard in this visit (the server keeps them too, so a reload is still quick). */
const clips = new Map<string, Promise<string>>();
/** Counts presses, so a slow clip doesn't start after you've already tapped something else. */
let latest = 0;
let player: HTMLAudioElement | null = null;

/**
 * Reads Japanese aloud in moji's AI voice (a natural Japanese woman's voice). If it can't be
 * reached, the browser's built-in voice reads it instead. Single words are passed as their
 * kana reading, so they're read exactly as shown.
 *
 * Safari on iPhone only lets an <audio> element start during a tap, and the clip arrives after
 * it; one shared element that has played something during a tap stays allowed afterwards.
 * (<audio> rather than Web Audio keeps the voice's pitch at 0.7x.)
 */
export function speakJapanese(text: string, rate = 1) {
  const press = ++latest;
  Speech.stop();
  if (!player) {
    player = new Audio(SILENCE);
    void player.play().catch(() => {});
  } else {
    player.pause();
  }
  play(player, text, rate, press).catch(() => {
    clips.delete(text);
    if (press === latest) Speech.speak(text, { language: 'ja-JP', rate });
  });
}

async function play(audio: HTMLAudioElement, text: string, rate: number, press: number) {
  if (!clips.has(text)) clips.set(text, fetchSpeech(text).then(toObjectUrl));
  const url = await clips.get(text)!;
  if (press !== latest) return;
  audio.src = url;
  audio.playbackRate = rate;
  await audio.play();
}

function toObjectUrl(base64: string): string {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return URL.createObjectURL(new Blob([bytes], { type: 'audio/wav' }));
}
