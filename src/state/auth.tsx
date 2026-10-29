import { GoogleSignin, isErrorWithCode, statusCodes } from '@react-native-google-signin/google-signin';
import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import { apiFetch, ApiError, setSessionExpiredHandler, type AuthResponse } from '@/lib/api';
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
  signIn: () => Promise<SignInResult>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

GoogleSignin.configure({
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || undefined,
  // With a web client id, Google's ID token is issued for it: that's what mojiApi checks.
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || undefined,
});

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

  const signIn = useCallback(async (): Promise<SignInResult> => {
    let idToken: string | null;
    try {
      const response = await GoogleSignin.signIn();
      if (response.type !== 'success') return 'cancelled';
      idToken = response.data.idToken;
    } catch (error) {
      if (isErrorWithCode(error) && error.code === statusCodes.SIGN_IN_CANCELLED) return 'cancelled';
      throw error;
    }
    if (!idToken) throw new ApiError(400, 'no_id_token', 'Google did not return an ID token.');

    const session = await apiFetch<AuthResponse>('/auth/google', { method: 'POST', body: { idToken }, auth: false });
    await tokenStore.save(session);
    setUser(session.user);
    setStatus('signedIn');
    return 'signedIn';
  }, []);

  const signOut = useCallback(async () => {
    // Best effort: end the session on the server, but sign out locally no matter what.
    await apiFetch('/auth/logout', { method: 'POST' }).catch(() => undefined);
    await GoogleSignin.signOut().catch(() => undefined);
    await tokenStore.clear();
    markSignedOut();
  }, [markSignedOut]);

  const value = useMemo(() => ({ status, user, signIn, signOut }), [status, user, signIn, signOut]);
  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth(): AuthContextValue {
  const value = use(AuthContext);
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>');
  return value;
}
