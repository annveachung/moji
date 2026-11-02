import type { ReactNode } from 'react';

/** On the iPhone the database is always free to open (see db-gate.web.tsx for the browser). */
export function DbGate({ children }: { children: ReactNode }) {
  return children;
}

export function onDatabaseError(error: Error) {
  throw error;
}
