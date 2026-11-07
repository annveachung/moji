import { useSQLiteContext } from 'expo-sqlite';
import { createContext, use, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { AppState } from 'react-native';

import { applyDictionary, type DictionaryEntry } from '@/db/dictionary';
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
import { apiFetch, ApiError } from '@/lib/api';
import { isWordCategory } from '@/lib/categories';
import { useAuth } from '@/state/auth';

/**
 * Keeps this device and moji-api in step. Changes are saved here first (so the app is
 * instant and works offline), then uploaded; changes from your other devices come down
 * when the app opens, comes back to the front, and every couple of minutes. New words in the
 * shared dictionary come down at the same time.
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
  /** The name of a word's category in the app's language; null means その他. */
  topicLabel: (topic: string | null) => string;
};

const SyncContext = createContext<SyncContextValue | null>(null);

const UPLOAD_DELAY_MS = 1500;
const POLL_MS = 2 * 60 * 1000;

export function SyncProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const { status: authStatus, user } = useAuth();
  const { t } = useTranslation();
  const [status, setStatus] = useState<SyncStatus>('idle');
  const [pending, setPending] = useState(0);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [dataVersion, setDataVersion] = useState(0);

  const running = useRef(false);
  const runAgain = useRef(false);
  const signedInAs = authStatus === 'signedIn' ? user?.id ?? null : null;

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
      let changed = await applyDownloaded(db, items);
      await setSyncState(db, 'cursor', cursor);

      // The shared dictionary: what's new since last time (the first time, all of it, page by page).
      let dictionaryCursor = (await getSyncState(db, 'dictionaryCursor')) ?? '0';
      for (;;) {
        const page = await apiFetch<{ entries: DictionaryEntry[]; cursor: string; more: boolean }>(
          `/dictionary?since=${dictionaryCursor}`,
        );
        changed += await applyDictionary(db, page.entries);
        dictionaryCursor = page.cursor;
        await setSyncState(db, 'dictionaryCursor', dictionaryCursor);
        if (!page.more) break;
      }
      if (changed > 0) setDataVersion((v) => v + 1);
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
  }, [db, signedInAs]);

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
    (topic: string | null) => (isWordCategory(topic) ? t(`category.${topic}`) : t('category.other')),
    [t],
  );

  return (
    <SyncContext
      value={{
        status,
        pending,
        lastSyncedAt,
        dataVersion,
        syncNow: run,
        topicLabel,
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
