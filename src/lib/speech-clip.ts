import { apiFetch } from './api';

/**
 * The AI voice (a natural Japanese woman's voice, made on moji-api with Gemini).
 * The server keeps every clip it makes, so asking again for the same text is quick and free.
 */
export async function fetchSpeech(text: string): Promise<string> {
  const { audio } = await apiFetch<{ mimeType: string; audio: string }>('/ai/speech', { method: 'POST', body: { text } });
  return audio; // base64 WAV
}

/** A short, stable name for a text (for cache files). */
export function speechKey(text: string): string {
  let hash = 5381;
  for (let i = 0; i < text.length; i++) hash = ((hash << 5) + hash + text.charCodeAt(i)) | 0;
  return `${(hash >>> 0).toString(36)}-${text.length}`;
}
