/** CSV files in the browser: the file chooser to import, a download to export. */

export function pickCsvText(): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,text/csv,text/plain';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      file.text().then(resolve, reject);
    };
    input.oncancel = () => resolve(null);
    input.click();
  });
}

export async function shareCsv(name: string, text: string, _dialogTitle: string) {
  // A BOM so Excel opens the Japanese text correctly.
  const url = URL.createObjectURL(new Blob(['﻿', text], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
