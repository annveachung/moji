import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

/**
 * In a browser, SQLite's file can be open in only one tab at a time. This waits for a
 * browser lock before opening it: a second moji tab shows a note and carries on as soon
 * as the first one closes. (Reloading works the same way: the old page lets go first.)
 */
export function DbGate({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const [ready, setReady] = useState(!navigator.locks);
  const [waiting, setWaiting] = useState(false);

  useEffect(() => {
    if (!navigator.locks) return;
    const slow = setTimeout(() => setWaiting(true), 600);
    // Held until this page closes: the callback's promise never resolves.
    navigator.locks.request('moji-database', () => {
      clearTimeout(slow);
      setReady(true);
      return new Promise<never>(() => {});
    });
    return () => clearTimeout(slow);
  }, []);

  if (ready) return children;
  if (!waiting) return null;
  return (
    <View className="flex-1 items-center justify-center gap-2 bg-surface p-8">
      <Text className="font-display text-[22px] text-ink">moji</Text>
      <Text className="max-w-[320px] text-center text-[15px] leading-6 text-ink-soft">{t('common.otherTab')}</Text>
    </View>
  );
}

/** If opening still fails (the old page was slow to let go), try once more with a fresh page. */
export function onDatabaseError(error: Error) {
  const key = 'moji.dbRetry';
  try {
    if (!sessionStorage.getItem(key)) {
      sessionStorage.setItem(key, '1');
      setTimeout(() => window.location.reload(), 500);
      return;
    }
    sessionStorage.removeItem(key);
  } catch {
    // storage blocked: fall through
  }
  throw error;
}
