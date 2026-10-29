import { tokenStore, type ApiUser } from './token-store';

/**
 * Every call to moji's backend (https://moji-api.annvea.com) goes through apiFetch.
 * It adds the access token, and when that has expired (401) it quietly gets a new one
 * with the refresh token and tries once more. If even that fails, the user is signed out.
 */

const BASE_URL = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/$/, '');

/** status 0 = couldn't reach the server (offline, server down). */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export type AuthResponse = {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  user: ApiUser;
};

let onSessionExpired: (() => void) | null = null;

/** The auth state registers here, so an expired session sends the user to sign-in. */
export function setSessionExpiredHandler(handler: (() => void) | null) {
  onSessionExpired = handler;
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, init);
  } catch {
    throw new ApiError(0, 'network', 'Could not reach the moji server.');
  }
  if (response.status === 204) return undefined as T;
  const body = (await response.json().catch(() => null)) as { error?: string; message?: string } | null;
  if (!response.ok) {
    throw new ApiError(response.status, body?.error ?? 'http_error', body?.message ?? response.statusText);
  }
  return body as T;
}

// Several calls may hit a 401 at once; they all wait for the same single refresh.
let refreshing: Promise<boolean> | null = null;

function refreshSession(): Promise<boolean> {
  refreshing ??= (async () => {
    try {
      const refreshToken = await tokenStore.getRefreshToken();
      if (!refreshToken) return false;
      const session = await request<AuthResponse>('/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      await tokenStore.save(session);
      return true;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        await tokenStore.clear();
        return false;
      }
      throw error; // offline etc.: keep the session, the caller sees the error
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

export async function apiFetch<T>(
  path: string,
  { method = 'GET', body, auth = true }: { method?: string; body?: unknown; auth?: boolean } = {},
): Promise<T> {
  const send = async () => {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (auth) {
      const accessToken = await tokenStore.getAccessToken();
      if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
    }
    return request<T>(path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  };

  try {
    return await send();
  } catch (error) {
    if (!auth || !(error instanceof ApiError) || error.status !== 401) throw error;
    if (await refreshSession()) return send();
    onSessionExpired?.();
    throw error;
  }
}
