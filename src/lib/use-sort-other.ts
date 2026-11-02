import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {  } from 'react-native';

import { getUnsortedWords, setWordTopic } from '@/db/queries';
import { meaningFor } from '@/lib/meaning';
import { useSettings } from '@/state/settings';
import { useSync } from '@/state/sync';

import { resolveTopic, sortTopics } from './ai';
import { aiErrorMessage } from './ai-errors';
import { showAlert } from './alert';

/**
 * "Sort その他 with AI": every saved word without a topic gets one, following the same
 * rule as new words (fits a topic → that one; opens a new area → new topic; else stays その他).
 */
export function useSortOther(onDone: () => void) {
  const db = useSQLiteContext();
  const { t } = useTranslation();
  const { settings } = useSettings();
  const { topicsForAi, reloadTopics } = useSync();
  const [sorting, setSorting] = useState(false);

  const sort = async () => {
    const words = await getUnsortedWords(db);
    if (words.length === 0) {
      showAlert(t('ai.sortOther'), t('ai.sortNothing'));
      return;
    }
    setSorting(true);
    try {
      const { assignments } = await sortTopics(
        words.map((w) => ({ uid: w.uid, word: w.word, reading: w.reading, meaning: meaningFor(w, settings.meaningLanguage) })),
        topicsForAi(),
      );
      let moved = 0;
      for (const { uid, topic } of assignments) {
        const id = await resolveTopic(db, topic);
        if (id === null) continue;
        await setWordTopic(db, uid, id);
        moved++;
      }
      await reloadTopics();
      onDone();
      showAlert(t('ai.sortedTitle'), t('ai.sortedBody', { moved, count: words.length }));
    } catch (error) {
      showAlert(t('ai.sortOther'), aiErrorMessage(t, error));
    } finally {
      setSorting(false);
    }
  };

  return { sorting, sort };
}
