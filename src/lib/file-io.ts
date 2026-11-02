import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

/** CSV files on the iPhone: pick one from Files, or share one (Files, AirDrop, Mail…). */

const CSV_TYPES = ['text/csv', 'text/comma-separated-values', 'text/plain', 'public.comma-separated-values-text'];

/** The picked file's text, or null if you cancelled. */
export async function pickCsvText(): Promise<string | null> {
  const picked = await DocumentPicker.getDocumentAsync({ type: CSV_TYPES, copyToCacheDirectory: true });
  if (picked.canceled) return null;
  return new File(picked.assets[0].uri).text();
}

export async function shareCsv(name: string, text: string, dialogTitle: string) {
  const file = new File(Paths.cache, name);
  if (file.exists) file.delete();
  file.create();
  await file.write(text);
  await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', UTI: 'public.comma-separated-values-text', dialogTitle });
}
