import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { getSetting, getUnsortedWords, setSetting, setWordTopic } from '@/db/queries';
import { meaningFor } from '@/lib/meaning';
import { useSettings } from '@/state/settings';

import { sortCategories } from './ai';
import { aiErrorMessage } from './ai-errors';
import { showAlert } from './alert';

/** Set once the words that lost their old topic (moving to fixed categories) have been sorted. */
const SORTED_ONCE = 'categories.sortedOnce';

/**
 * Sorting その他 with AI: every saved word without a category gets one from the fixed list
 * (or stays in その他 if nothing fits).
 * - sort(): the button, with a message when done
 * - sortOnce(): quietly, the first time after the update to categories; tries again later if offline
 */
export function useSortOther(onDone: () => void) {
  const db = useSQLiteContext();
  const { t } = useTranslation();
  const { settings } = useSettings();
  const [sorting, setSorting] = useState(false);
  const running = useRef(false);

  const run = useCallback(async (): Promise<{ moved: number; count: number }> => {
    const words = await getUnsortedWords(db);
    if (words.length === 0) return { moved: 0, count: 0 };
    const assignments = await sortCategories(
      words.map((w) => ({ uid: w.uid, word: w.word, reading: w.reading, meaning: meaningFor(w, settings.meaningLanguage) })),
    );
    let moved = 0;
    for (const { uid, category } of assignments) {
      if (category === null) continue;
      await setWordTopic(db, uid, category);
      moved++;
    }
    return { moved, count: words.length };
  }, [db, settings.meaningLanguage]);

  const sort = async () => {
    setSorting(true);
    try {
      const { moved, count } = await run();
      if (count === 0) {
        showAlert(t('ai.sortOther'), t('ai.sortNothing'));
        return;
      }
      onDone();
      showAlert(t('ai.sortedTitle'), t('ai.sortedBody', { moved, count }));
    } catch (error) {
      showAlert(t('ai.sortOther'), aiErrorMessage(t, error));
    } finally {
      setSorting(false);
    }
  };

  const sortOnce = useCallback(async () => {
    if (running.current || (await getSetting(db, SORTED_ONCE))) return;
    running.current = true;
    try {
      const { moved } = await run();
      await setSetting(db, SORTED_ONCE, new Date().toISOString());
      if (moved > 0) onDone();
    } catch {
      // Offline or AI unavailable: try again next time.
    } finally {
      running.current = false;
    }
  }, [db, run, onDone]);

  return { sorting, sort, sortOnce };
}
