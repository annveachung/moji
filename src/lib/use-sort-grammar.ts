import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { getUncategorizedGrammar, setGrammarCategory } from '@/db/grammar';
import { meaningFor } from '@/lib/meaning';
import { useSettings } from '@/state/settings';

import { categorizeGrammar } from './ai';
import { aiErrorMessage } from './ai-errors';
import { showAlert } from './alert';

/**
 * Sorting grammar rules by function (条件, 理由…) with AI.
 * - sort(): the button, with a message when done
 * - sortQuietly(): after an import or when opening 文法, if some rules aren't sorted yet
 */
export function useSortGrammar(onDone: () => void) {
  const db = useSQLiteContext();
  const { t } = useTranslation();
  const { settings } = useSettings();
  const [sorting, setSorting] = useState(false);
  const running = useRef(false);

  const run = useCallback(async () => {
    const rules = await getUncategorizedGrammar(db);
    if (rules.length === 0) return 0;
    const byUid = new Map(rules.map((rule) => [String(rule.id), rule]));
    const assignments = await categorizeGrammar(
      rules.map((rule) => ({ uid: String(rule.id), pattern: rule.pattern, meaning: meaningFor(rule, settings.meaningLanguage) })),
    );
    let sorted = 0;
    for (const { uid, category } of assignments) {
      const rule = byUid.get(uid);
      if (!rule || category === null) continue;
      await setGrammarCategory(db, rule.id, category);
      sorted++;
    }
    return sorted;
  }, [db, settings.meaningLanguage]);

  const sort = async () => {
    setSorting(true);
    try {
      const sorted = await run();
      onDone();
      showAlert(t('categoryUi.sortGrammar'), t('categoryUi.sortedGrammar', { count: sorted }));
    } catch (error) {
      showAlert(t('categoryUi.sortGrammar'), aiErrorMessage(t, error));
    } finally {
      setSorting(false);
    }
  };

  const sortQuietly = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    try {
      if ((await run()) > 0) onDone();
    } catch {
      // Offline or AI unavailable: the button is still there, and we try again next time.
    } finally {
      running.current = false;
    }
  }, [run, onDone]);

  return { sorting, sort, sortQuietly };
}
