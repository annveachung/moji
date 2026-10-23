import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';

import {
  countDueReviews,
  countLearnedToday,
  getRecentlyLearned,
  getStats,
  getStreak,
  getTodayWords,
  getWeakWords,
  type Stats,
} from '@/db/queries';
import type { TodayWord, WeakWord, Word } from '@/db/types';

export type DashboardData = {
  learnedToday: number;
  due: number;
  streak: number;
  today: TodayWord[];
  weak: WeakWord[];
  recent: Word[];
  stats: Stats;
};

/**
 * Everything the dashboard shows, loaded from SQLite.
 * useFocusEffect reloads it each time you come back to the screen, so learning
 * a word on its detail page updates the progress ring right away.
 */
export function useDashboard(dailyGoal: number): DashboardData | null {
  const db = useSQLiteContext();
  const [data, setData] = useState<DashboardData | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const [learnedToday, due, streak, today, weak, recent, stats] = await Promise.all([
          countLearnedToday(db),
          countDueReviews(db),
          getStreak(db),
          getTodayWords(db, dailyGoal),
          getWeakWords(db, 3),
          getRecentlyLearned(db, 8),
          getStats(db),
        ]);
        if (!cancelled) setData({ learnedToday, due, streak, today, weak, recent, stats });
      })();
      return () => {
        cancelled = true;
      };
    }, [db, dailyGoal]),
  );

  return data;
}
