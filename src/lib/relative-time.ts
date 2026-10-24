import type { TFunction } from 'i18next';

import { toLocalDay } from './date';

/** "today", "yesterday", "3 days ago", "2 weeks ago"… in the interface language. */
export function relativeDay(iso: string, t: TFunction, now = new Date()): string {
  const then = new Date(iso);
  // Compare calendar days, so 11pm yesterday is "yesterday" even if under 24 hours ago.
  const days = Math.round(
    (new Date(toLocalDay(now)).getTime() - new Date(toLocalDay(then)).getTime()) / 86_400_000,
  );
  if (days <= 0) return t('time.today');
  if (days === 1) return t('time.yesterday');
  if (days < 7) return t('time.daysAgo', { count: days });
  if (days < 30) return t('time.weeksAgo', { count: Math.floor(days / 7) });
  return t('time.monthsAgo', { count: Math.floor(days / 30) });
}
