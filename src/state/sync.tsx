import { useSQLiteContext } from 'expo-sqlite';
import { createContext, use, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { AppState } from 'react-native';

import { getCustomTopics } from '@/db/queries';
import {
  applyDownloaded,
  clearPersonalData,
  countPending,
  getSyncState,
  markUploaded,
  nextUpload,
  onLocalChange,
  setSyncState,
  type SyncItem,
} from '@/db/sync';
import { BUILT_IN_TOPICS, type CustomTopic } from '@/db/types';
import { apiFetch, ApiError } from '@/lib/api';
import { useAuth } from '@/state/auth';
import { useSettings } from '@/state/settings';

/**
 * Keeps this device and moji-api in step. Changes are saved here first (so the app is
 * instant and works offline), then uploaded; changes from your other devices come down
 * when the app opens, comes back to the front, and every couple of minutes.
 */
type SyncStatus = 'idle' | 'syncing' | 'offline' | 'error';

type SyncContextValue = {
  status: SyncStatus;
  /** Changes on this device not uploaded yet. */
  pending: number;
  lastSyncedAt: Date | null;
  /** Goes up whenever downloaded changes landed here: screens reload when it changes. */
  dataVersion: number;
  syncNow: () => Promise<void>;
  customTopics: CustomTopic[];
  /** The name of a topic in the app's language; null means その他. */
  topicLabel: (topic: string | null) => string;
  /** Built-in and AI-created topics, for asking the AI where a word belongs. */
  topicsForAi: () => { id: string; label: string }[];
  reloadTopics: () => Promise<void>;
};

const SyncContext = createContext<SyncContextValue | null>(null);

const UPLOAD_DELAY_MS = 1500;
const POLL_MS = 2 * 60 * 1000;

export function SyncProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const { status: authStatus, user } = useAuth();
  const { settings } = useSettings();
  const { t } = useTranslation();
  const [status, setStatus] = useState<SyncStatus>('idle');
  const [pending, setPending] = useState(0);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [dataVersion, setDataVersion] = useState(0);
  const [customTopics, setCustomTopics] = useState<CustomTopic[]>([]);

  const running = useRef(false);
  const runAgain = useRef(false);
  const signedInAs = authStatus === 'signedIn' ? user?.id ?? null : null;

  const reloadTopics = useCallback(async () => setCustomTopics(await getCustomTopics(db)), [db]);

  const run = useCallback(async () => {
    if (!signedInAs) return;
    if (running.current) {
      runAgain.current = true;
      return;
    }
    running.current = true;
    setStatus('syncing');
    try {
      // A different account than last time: start clean (their data is on the server).
      const previous = await getSyncState(db, 'userId');
      if (previous !== signedInAs) {
        if (previous !== null) {
          await clearPersonalData(db);
          setDataVersion((v) => v + 1);
        }
        await setSyncState(db, 'userId', signedInAs);
      }

      // Upload first, so what you just did here wins over older changes from elsewhere.
      for (;;) {
        const batch = await nextUpload(db);
        if (batch.items.length === 0) break;
        await apiFetch('/sync', { method: 'POST', body: { items: batch.items } });
        await markUploaded(db, batch.pending);
      }

      // Then download everything that changed since last time.
      let cursor = (await getSyncState(db, 'cursor')) ?? '0';
      const items: SyncItem[] = [];
      for (;;) {
        const page = await apiFetch<{ items: SyncItem[]; cursor: string; more: boolean }>(`/sync?since=${cursor}`);
        items.push(...page.items);
        cursor = page.cursor;
        if (!page.more) break;
      }
      const changed = await applyDownloaded(db, items);
      await setSyncState(db, 'cursor', cursor);
      if (changed > 0) {
        setDataVersion((v) => v + 1);
        await reloadTopics();
      }
      setLastSyncedAt(new Date());
      setStatus('idle');
    } catch (error) {
      setStatus(error instanceof ApiError && error.status === 0 ? 'offline' : 'error');
      if (!(error instanceof ApiError)) console.warn('Sync failed', error);
    } finally {
      setPending(await countPending(db));
      running.current = false;
      if (runAgain.current) {
        runAgain.current = false;
        run();
      }
    }
  }, [db, signedInAs, reloadTopics]);

  useEffect(() => {
    reloadTopics();
  }, [reloadTopics]);

  // Sync on sign-in, when the app comes back to the front, and every couple of minutes.
  useEffect(() => {
    if (!signedInAs) return;
    run();
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') run();
    });
    const timer = setInterval(() => {
      if (AppState.currentState === 'active') run();
    }, POLL_MS);
    return () => {
      appState.remove();
      clearInterval(timer);
    };
  }, [signedInAs, run]);

  // Upload shortly after a change, batching quick successive edits into one request.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const stop = onLocalChange(() => {
      setPending((n) => n + 1);
      clearTimeout(timer);
      timer = setTimeout(run, UPLOAD_DELAY_MS);
    });
    return () => {
      stop();
      clearTimeout(timer);
    };
  }, [run]);

  const topicLabel = useCallback(
    (topic: string | null) => {
      if (topic === null) return t('topic.other');
      if ((BUILT_IN_TOPICS as readonly string[]).includes(topic)) return t(`topic.${topic}` as 'topic.other');
      const custom = customTopics.find((c) => c.id === topic);
      if (!custom) return topic;
      const label = settings.uiLanguage === 'en' ? custom.labelEn : settings.uiLanguage === 'zh-TW' ? custom.labelZh : custom.labelJa;
      return label || custom.labelJa || topic;
    },
    [customTopics, settings.uiLanguage, t],
  );

  const topicsForAi = useCallback(
    () => [
      ...BUILT_IN_TOPICS.map((id) => ({ id, label: `${t(`topic.${id}`, { lng: 'ja' })} / ${t(`topic.${id}`, { lng: 'en' })}` })),
      ...customTopics.map((c) => ({ id: c.id, label: `${c.labelJa} / ${c.labelEn}` })),
    ],
    [customTopics, t],
  );

  return (
    <SyncContext
      value={{
        status,
        pending,
        lastSyncedAt,
        dataVersion,
        syncNow: run,
        customTopics,
        topicLabel,
        topicsForAi,
        reloadTopics,
      }}>
      {children}
    </SyncContext>
  );
}

export function useSync(): SyncContextValue {
  const value = use(SyncContext);
  if (!value) throw new Error('useSync must be used inside <SyncProvider>');
  return value;
}
