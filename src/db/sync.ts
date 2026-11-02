import type { SQLiteDatabase } from 'expo-sqlite';

import { isGrammarFunction, isWordCategory, LEGACY_TOPICS } from '@/lib/categories';
import { guessVerbGroup } from '@/lib/verb';

/**
 * The local side of sync. moji-api keeps the master copy; this file turns local rows into
 * sync items (to upload) and sync items back into rows (after downloading).
 *
 * - Every row you own has a `uid`, the same on all your devices.
 * - Changing a row puts it in the `outbox`; the sync engine (state/sync.tsx) uploads it.
 * - Downloads skip rows still waiting in the outbox, so a change made here isn't overwritten
 *   before it's uploaded. Otherwise the newest change wins.
 */

export type SyncKind = 'word' | 'sentence' | 'review' | 'grammar' | 'grammarSentence' | 'topic';
export type SyncItem = { kind: SyncKind; uid: string; data: Record<string, unknown> | null; deleted?: boolean };

/** Where each kind lives locally. */
const TABLE: Record<SyncKind, string> = {
  word: 'words',
  sentence: 'sentences',
  review: 'review_logs',
  grammar: 'grammar',
  grammarSentence: 'grammar_sentences',
  topic: 'topics',
};
const UID_COLUMN: Record<SyncKind, string> = { ...mapValues(TABLE, () => 'uid'), topic: 'id' };

/** Parents before children, so a sentence always finds its word. */
const APPLY_ORDER: SyncKind[] = ['topic', 'word', 'grammar', 'sentence', 'grammarSentence', 'review'];

/** SQL for a fresh random uid, used in INSERTs. */
export const NEW_UID = 'lower(hex(randomblob(16)))';

// ── Change notifications ─────────────────────────────────────

const listeners = new Set<() => void>();

/** The sync engine listens here to upload soon after something changes. */
export function onLocalChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Remember that a row changed (or was deleted) so it gets uploaded. */
export async function markDirty(db: SQLiteDatabase, kind: SyncKind, uid: string | null | undefined) {
  if (!uid) return;
  await db.runAsync(
    'INSERT INTO outbox (kind, uid) VALUES (?, ?) ON CONFLICT (kind, uid) DO UPDATE SET version = version + 1',
    kind, uid,
  );
  listeners.forEach((listener) => listener());
}

/** markDirty for a row you know by its local id. */
export async function markDirtyById(db: SQLiteDatabase, kind: SyncKind, id: number) {
  const row = await db.getFirstAsync<{ uid: string | null }>(`SELECT uid FROM ${TABLE[kind]} WHERE id = ?`, id);
  await markDirty(db, kind, row?.uid);
}

/** Before deleting a word, queue its sentences and reviews too: they go with it. */
export async function markWordChildrenDeleted(db: SQLiteDatabase, wordId: number) {
  for (const kind of ['sentence', 'review'] as const) {
    const rows = await db.getAllAsync<{ uid: string }>(
      `SELECT uid FROM ${TABLE[kind]} WHERE word_id = ? AND uid IS NOT NULL`,
      wordId,
    );
    for (const row of rows) await markDirty(db, kind, row.uid);
  }
}

// ── Upload ───────────────────────────────────────────────────

type Pending = { kind: SyncKind; uid: string; version: number };

export async function countPending(db: SQLiteDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM outbox');
  return row?.n ?? 0;
}

/** The next batch of changes to upload, with their current data (null = deleted). */
export async function nextUpload(db: SQLiteDatabase, limit = 300): Promise<{ items: SyncItem[]; pending: Pending[] }> {
  const pending = await db.getAllAsync<Pending>('SELECT kind, uid, version FROM outbox ORDER BY rowid LIMIT ?', limit);
  const items: SyncItem[] = [];
  for (const { kind, uid } of pending) {
    const data = await serialize(db, kind, uid);
    items.push(data ? { kind, uid, data } : { kind, uid, data: null, deleted: true });
  }
  return { items, pending };
}

/** After the server saved a batch: forget it, unless it changed again in the meantime. */
export async function markUploaded(db: SQLiteDatabase, pending: Pending[]) {
  for (const { kind, uid, version } of pending) {
    await db.runAsync('DELETE FROM outbox WHERE kind = ? AND uid = ? AND version = ?', kind, uid, version);
  }
}

async function serialize(db: SQLiteDatabase, kind: SyncKind, uid: string): Promise<Record<string, unknown> | null> {
  switch (kind) {
    case 'word': {
      const w = await db.getFirstAsync<Record<string, unknown>>('SELECT * FROM words WHERE uid = ?', uid);
      if (!w) return null;
      return {
        catalog: w.is_custom === 0,
        word: w.word,
        furigana: w.furigana,
        reading: w.reading,
        meaningEn: w.meaning_en,
        meaningZh: w.meaning_zh,
        pos: w.pos,
        verbGroup: w.verb_group,
        jlpt: w.jlpt,
        topic: w.topic,
        tags: JSON.parse(String(w.tags)),
        notes: w.notes,
        zhLinkKind: w.zh_link_kind,
        zhNoteEn: w.zh_note_en,
        zhNoteZh: w.zh_note_zh,
        savedAt: w.saved_at,
        starredAt: w.starred_at,
        createdAt: w.created_at,
      };
    }
    case 'sentence': {
      const s = await db.getFirstAsync<Record<string, unknown>>(
        'SELECT s.*, w.uid AS word_uid FROM sentences s JOIN words w ON w.id = s.word_id WHERE s.uid = ?',
        uid,
      );
      if (!s) return null;
      return { wordUid: s.word_uid, ja: s.ja, en: s.en, zh: s.zh, favorite: s.favorite === 1, seen: s.seen === 1 };
    }
    case 'review': {
      const r = await db.getFirstAsync<Record<string, unknown>>(
        'SELECT l.*, w.uid AS word_uid FROM review_logs l JOIN words w ON w.id = l.word_id WHERE l.uid = ?',
        uid,
      );
      if (!r) return null;
      return { wordUid: r.word_uid, rating: r.rating, reviewedAt: r.reviewed_at, day: r.day };
    }
    case 'grammar': {
      const g = await db.getFirstAsync<Record<string, unknown>>('SELECT * FROM grammar WHERE uid = ?', uid);
      if (!g) return null;
      return {
        pattern: g.pattern,
        meaningEn: g.meaning_en,
        meaningZh: g.meaning_zh,
        jlpt: g.jlpt,
        formation: g.formation,
        explanation: g.explanation,
        category: g.category,
        starredAt: g.starred_at,
        createdAt: g.created_at,
      };
    }
    case 'grammarSentence': {
      const s = await db.getFirstAsync<Record<string, unknown>>(
        'SELECT s.*, g.uid AS grammar_uid FROM grammar_sentences s JOIN grammar g ON g.id = s.grammar_id WHERE s.uid = ?',
        uid,
      );
      if (!s) return null;
      return { grammarUid: s.grammar_uid, ja: s.ja, en: s.en, zh: s.zh, source: s.source, createdAt: s.created_at };
    }
    case 'topic': {
      const t = await db.getFirstAsync<Record<string, unknown>>('SELECT * FROM topics WHERE id = ?', uid);
      if (!t) return null;
      return { labelJa: t.label_ja, labelEn: t.label_en, labelZh: t.label_zh, createdAt: t.created_at };
    }
  }
}

// ── Download ─────────────────────────────────────────────────

/** Apply downloaded changes. Returns how many rows changed here. */
export async function applyDownloaded(db: SQLiteDatabase, items: SyncItem[]): Promise<number> {
  if (items.length === 0) return 0;
  const waiting = new Set(
    (await db.getAllAsync<{ kind: string; uid: string }>('SELECT kind, uid FROM outbox')).map((r) => `${r.kind}:${r.uid}`),
  );
  // Only the latest version of each item matters.
  const latest = new Map<string, SyncItem>();
  for (const item of items) latest.set(`${item.kind}:${item.uid}`, item);

  let changed = 0;
  await db.withTransactionAsync(async () => {
    for (const kind of APPLY_ORDER) {
      for (const [key, item] of latest) {
        if (item.kind !== kind || waiting.has(key)) continue;
        const current = await serialize(db, kind, item.uid);
        if (item.deleted || !item.data) {
          if (current === null && !item.uid.startsWith('cat:')) continue; // already gone here
          await removeLocal(db, kind, item.uid);
        } else {
          // Your own uploads come back too: skip them when nothing differs.
          if (current !== null && stableJson(current) === stableJson(item.data)) continue;
          await upsertLocal(db, kind, item.uid, item.data);
        }
        changed++;
      }
    }
  });
  return changed;
}

type Data = Record<string, any>;

async function idFor(db: SQLiteDatabase, kind: SyncKind, uid: unknown): Promise<number | null> {
  if (typeof uid !== 'string') return null;
  const row = await db.getFirstAsync<{ id: number }>(`SELECT id FROM ${TABLE[kind]} WHERE ${UID_COLUMN[kind]} = ?`, uid);
  return row?.id ?? null;
}

async function upsertLocal(db: SQLiteDatabase, kind: SyncKind, uid: string, d: Data) {
  switch (kind) {
    case 'topic':
      await db.runAsync(
        `INSERT INTO topics (id, label_ja, label_en, label_zh) VALUES (?, ?, ?, ?)
         ON CONFLICT (id) DO UPDATE SET label_ja = excluded.label_ja, label_en = excluded.label_en, label_zh = excluded.label_zh`,
        uid, d.labelJa ?? '', d.labelEn ?? '', d.labelZh ?? '',
      );
      return;
    case 'word': {
      const values = [
        d.word, d.furigana, d.reading, d.meaningEn ?? '', d.meaningZh ?? '', d.pos ?? 'noun',
        // From an older app version, verbs arrive without a group: work it out here.
        d.pos === 'verb' ? (d.verbGroup ?? guessVerbGroup(d.word, d.reading)) : null,
        d.jlpt ?? null,
        toCategory(d.topic), JSON.stringify(d.tags ?? []), d.notes ?? '', d.zhLinkKind ?? null, d.zhNoteEn ?? null,
        d.zhNoteZh ?? null, d.savedAt ?? null, d.starredAt ?? null,
      ];
      const id = await idFor(db, 'word', uid);
      if (id !== null) {
        await db.runAsync(
          `UPDATE words SET word = ?, furigana = ?, reading = ?, meaning_en = ?, meaning_zh = ?, pos = ?, verb_group = ?, jlpt = ?,
                            topic = ?, tags = ?, notes = ?, zh_link_kind = ?, zh_note_en = ?, zh_note_zh = ?,
                            saved_at = ?, starred_at = ?
            WHERE id = ?`,
          ...values, id,
        );
      } else {
        await db.runAsync(
          `INSERT INTO words (word, furigana, reading, meaning_en, meaning_zh, pos, verb_group, jlpt, topic, tags, notes,
                              zh_link_kind, zh_note_en, zh_note_zh, saved_at, starred_at, is_custom, uid, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')))`,
          ...values, d.catalog ? 0 : 1, uid, d.createdAt ?? null,
        );
      }
      return;
    }
    case 'sentence': {
      const wordId = await idFor(db, 'word', d.wordUid);
      if (wordId === null) return;
      const id = await idFor(db, 'sentence', uid);
      const values = [d.ja, d.en ?? '', d.zh ?? '', d.favorite ? 1 : 0, d.seen ? 1 : 0];
      if (id !== null) {
        await db.runAsync('UPDATE sentences SET ja = ?, en = ?, zh = ?, favorite = ?, seen = ? WHERE id = ?', ...values, id);
      } else {
        await db.runAsync(
          'INSERT INTO sentences (ja, en, zh, favorite, seen, word_id, uid) VALUES (?, ?, ?, ?, ?, ?, ?)',
          ...values, wordId, uid,
        );
      }
      return;
    }
    case 'review': {
      const wordId = await idFor(db, 'word', d.wordUid);
      if (wordId === null || (await idFor(db, 'review', uid)) !== null) return;
      await db.runAsync(
        'INSERT INTO review_logs (word_id, rating, state, reviewed_at, day, uid) VALUES (?, ?, 0, ?, ?, ?)',
        wordId, d.rating, d.reviewedAt, d.day, uid,
      );
      return;
    }
    case 'grammar': {
      const values = [
        d.pattern, d.meaningEn ?? '', d.meaningZh ?? '', d.jlpt ?? null, d.formation ?? '', d.explanation ?? '', d.starredAt ?? null,
        isGrammarFunction(d.category) ? d.category : null,
      ];
      const id = await idFor(db, 'grammar', uid);
      if (id !== null) {
        await db.runAsync(
          'UPDATE grammar SET pattern = ?, meaning_en = ?, meaning_zh = ?, jlpt = ?, formation = ?, explanation = ?, starred_at = ?, category = ? WHERE id = ?',
          ...values, id,
        );
      } else {
        await db.runAsync(
          `INSERT INTO grammar (pattern, meaning_en, meaning_zh, jlpt, formation, explanation, starred_at, category, uid, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')))`,
          ...values, uid, d.createdAt ?? null,
        );
      }
      return;
    }
    case 'grammarSentence': {
      const grammarId = await idFor(db, 'grammar', d.grammarUid);
      if (grammarId === null) return;
      const id = await idFor(db, 'grammarSentence', uid);
      if (id !== null) {
        await db.runAsync('UPDATE grammar_sentences SET ja = ?, en = ?, zh = ?, source = ? WHERE id = ?', d.ja, d.en ?? '', d.zh ?? '', d.source ?? 'import', id);
      } else {
        await db.runAsync(
          `INSERT INTO grammar_sentences (grammar_id, ja, en, zh, source, uid, created_at)
           VALUES (?, ?, ?, ?, ?, ?, COALESCE(?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')))`,
          grammarId, d.ja, d.en ?? '', d.zh ?? '', d.source ?? 'import', uid, d.createdAt ?? null,
        );
      }
      return;
    }
  }
}

async function removeLocal(db: SQLiteDatabase, kind: SyncKind, uid: string) {
  if (kind === 'word' && uid.startsWith('cat:')) {
    // Starter words stay in the catalog; only your changes to them go.
    await db.runAsync('UPDATE words SET saved_at = NULL, starred_at = NULL, notes = \'\' WHERE uid = ?', uid);
    return;
  }
  await db.runAsync(`DELETE FROM ${TABLE[kind]} WHERE ${UID_COLUMN[kind]} = ?`, uid);
}

// ── Sync bookkeeping ─────────────────────────────────────────

export async function getSyncState(db: SQLiteDatabase, key: 'cursor' | 'userId'): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM sync_state WHERE key = ?', key);
  return row?.value ?? null;
}

export async function setSyncState(db: SQLiteDatabase, key: 'cursor' | 'userId', value: string) {
  await db.runAsync(
    'INSERT INTO sync_state (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value',
    key, value,
  );
}

/**
 * Someone else signed in on this device: remove the previous person's words, grammar and
 * history (they're safe on the server) and start from the starter catalog again.
 */
export async function clearPersonalData(db: SQLiteDatabase) {
  await db.withTransactionAsync(async () => {
    await db.execAsync(`
      DELETE FROM words WHERE is_custom = 1;
      UPDATE words SET saved_at = NULL, starred_at = NULL, notes = '';
      DELETE FROM sentences WHERE uid IS NOT NULL;
      UPDATE sentences SET favorite = 0, seen = 0;
      DELETE FROM review_logs;
      DELETE FROM grammar;
      DELETE FROM topics;
      DELETE FROM outbox;
      DELETE FROM sync_state;
    `);
  });
}

/** A word's category from synced data; older app versions sent the previous topic names. */
function toCategory(topic: unknown): string | null {
  if (isWordCategory(topic)) return topic;
  return typeof topic === 'string' ? (LEGACY_TOPICS[topic] ?? null) : null;
}

/** JSON with keys sorted, so the same data always gives the same text (the server reorders keys). */
function stableJson(value: unknown): string {
  return JSON.stringify(value, (_key, v) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b)))
      : v,
  );
}

function mapValues<K extends string, V, W>(record: Record<K, V>, fn: (value: V) => W): Record<K, W> {
  return Object.fromEntries(Object.entries(record).map(([k, v]) => [k, fn(v as V)])) as Record<K, W>;
}
