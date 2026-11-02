import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import { apiFetch, ApiError, setSessionExpiredHandler, type AuthResponse } from '@/lib/api';
import { getGoogleIdToken, googleSignOut } from '@/lib/google';
import { tokenStore, type ApiUser } from '@/lib/token-store';

/**
 * Who is signed in. moji requires Google sign-in on first launch; after that the
 * session is kept in the Keychain and refreshed quietly, so you stay signed in.
 */
type AuthStatus = 'loading' | 'signedOut' | 'signedIn';

/** What happened when the user tapped "Sign in with Google". */
export type SignInResult = 'signedIn' | 'cancelled';

type AuthContextValue = {
  status: AuthStatus;
  user: ApiUser | null;
  /** iPhone: opens Google's sign-in sheet. */
  signIn: () => Promise<SignInResult>;
  /** Web: Google's button already gave us the ID token. */
  signInWithIdToken: (idToken: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<ApiUser | null>(null);

  const markSignedOut = useCallback(() => {
    setUser(null);
    setStatus('signedOut');
  }, []);

  // On launch: restore the saved session, then confirm it with the server.
  useEffect(() => {
    setSessionExpiredHandler(markSignedOut);
    (async () => {
      const [refreshToken, cachedUser] = await Promise.all([tokenStore.getRefreshToken(), tokenStore.getUser()]);
      if (!refreshToken) return markSignedOut();
      try {
        const { user: fresh } = await apiFetch<{ user: ApiUser }>('/me');
        await tokenStore.saveUser(fresh);
        setUser(fresh);
        setStatus('signedIn');
      } catch (error) {
        // Offline or server down: your words live on the phone, so keep going with the saved account.
        if (error instanceof ApiError && error.status === 0 && cachedUser) {
          setUser(cachedUser);
          setStatus('signedIn');
        } else {
          await tokenStore.clear();
          markSignedOut();
        }
      }
    })();
    return () => setSessionExpiredHandler(null);
  }, [markSignedOut]);

  /** Swap Google's ID token for moji's own session. */
  const signInWithIdToken = useCallback(async (idToken: string) => {
    const session = await apiFetch<AuthResponse>('/auth/google', { method: 'POST', body: { idToken }, auth: false });
    await tokenStore.save(session);
    setUser(session.user);
    setStatus('signedIn');
  }, []);

  const signIn = useCallback(async (): Promise<SignInResult> => {
    const idToken = await getGoogleIdToken();
    if (!idToken) return 'cancelled';
    await signInWithIdToken(idToken);
    return 'signedIn';
  }, [signInWithIdToken]);

  const signOut = useCallback(async () => {
    // Best effort: end the session on the server, but sign out locally no matter what.
    await apiFetch('/auth/logout', { method: 'POST' }).catch(() => undefined);
    await googleSignOut();
    await tokenStore.clear();
    markSignedOut();
  }, [markSignedOut]);

  const value = useMemo(
    () => ({ status, user, signIn, signInWithIdToken, signOut }),
    [status, user, signIn, signInWithIdToken, signOut],
  );
  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth(): AuthContextValue {
  const value = use(AuthContext);
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>');
  return value;
}
