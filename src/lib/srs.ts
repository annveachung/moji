import type { SQLiteDatabase } from 'expo-sqlite';
import { createEmptyCard, fsrs, Rating, State, type Card, type Grade } from 'ts-fsrs';

import { toLocalDay } from './date';

/**
 * Spaced repetition with FSRS. Each word you learn gets a "card" holding FSRS's
 * model of your memory (stability, difficulty). After each Again/Hard/Good/Easy,
 * FSRS works out when you should see the word next.
 */

export { Rating, State };
export type { Grade };

const scheduler = fsrs({ enable_fuzz: true });

export type CardRow = {
  word_id: number;
  due: string;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  learning_steps: number;
  reps: number;
  lapses: number;
  state: number;
  last_review: string | null;
  learned_at: string;
  learned_day: string;
};

export function rowToCard(row: CardRow): Card {
  return {
    due: new Date(row.due),
    stability: row.stability,
    difficulty: row.difficulty,
    elapsed_days: row.elapsed_days,
    scheduled_days: row.scheduled_days,
    learning_steps: row.learning_steps,
    reps: row.reps,
    lapses: row.lapses,
    state: row.state as State,
    last_review: row.last_review ? new Date(row.last_review) : undefined,
  };
}

async function writeCard(db: SQLiteDatabase, wordId: number, card: Card, learnedAt: Date) {
  await db.runAsync(
    `INSERT INTO cards (word_id, due, stability, difficulty, elapsed_days, scheduled_days,
                        learning_steps, reps, lapses, state, last_review, learned_at, learned_day)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (word_id) DO UPDATE SET
       due = excluded.due, stability = excluded.stability, difficulty = excluded.difficulty,
       elapsed_days = excluded.elapsed_days, scheduled_days = excluded.scheduled_days,
       learning_steps = excluded.learning_steps, reps = excluded.reps, lapses = excluded.lapses,
       state = excluded.state, last_review = excluded.last_review`,
    wordId, card.due.toISOString(), card.stability, card.difficulty, card.elapsed_days,
    card.scheduled_days, card.learning_steps, card.reps, card.lapses, card.state,
    card.last_review?.toISOString() ?? null, learnedAt.toISOString(), toLocalDay(learnedAt),
  );
}

/** Start learning a word: it counts toward today's goal and enters the review queue. */
export async function learnWord(db: SQLiteDatabase, wordId: number, now = new Date()) {
  const existing = await db.getFirstAsync('SELECT 1 FROM cards WHERE word_id = ?', wordId);
  if (existing) return; // Already learning it, so keep its review history.
  await db.withTransactionAsync(async () => {
    await writeCard(db, wordId, createEmptyCard(now), now);
    await db.runAsync(
      'UPDATE words SET saved_at = COALESCE(saved_at, ?) WHERE id = ?',
      now.toISOString(), wordId,
    );
  });
}

/** Record an Again/Hard/Good/Easy answer and reschedule the word. */
export async function reviewWord(db: SQLiteDatabase, wordId: number, grade: Grade, now = new Date()) {
  const row = await db.getFirstAsync<CardRow>('SELECT * FROM cards WHERE word_id = ?', wordId);
  if (!row) throw new Error(`Word ${wordId} has not been learned yet`);
  const { card, log } = scheduler.next(rowToCard(row), now, grade);
  await db.withTransactionAsync(async () => {
    await writeCard(db, wordId, card, new Date(row.learned_at));
    await db.runAsync(
      'INSERT INTO review_logs (word_id, rating, state, reviewed_at, day) VALUES (?, ?, ?, ?, ?)',
      wordId, grade, log.state, now.toISOString(), toLocalDay(now),
    );
  });
}

/** When each answer would schedule the card next, e.g. for "Good · 3d" button labels. */
export function previewDue(row: CardRow, now = new Date()): Record<Grade, Date> {
  const preview = scheduler.repeat(rowToCard(row), now);
  return {
    [Rating.Again]: preview[Rating.Again].card.due,
    [Rating.Hard]: preview[Rating.Hard].card.due,
    [Rating.Good]: preview[Rating.Good].card.due,
    [Rating.Easy]: preview[Rating.Easy].card.due,
  } as Record<Grade, Date>;
}
