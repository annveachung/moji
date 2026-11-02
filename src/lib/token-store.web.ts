import type { ApiUser } from './token-store';

/**
 * The web app keeps the session in the browser's localStorage (the iPhone uses the Keychain).
 * Every access is wrapped: private windows or blocked storage just mean signing in again.
 */
const KEYS = {
  access: 'moji.accessToken',
  refresh: 'moji.refreshToken',
  user: 'moji.user',
} as const;

function get(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function set(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // storage unavailable: the session lasts until the tab closes
  }
}

function remove(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // nothing stored
  }
}

export type { ApiUser };

export const tokenStore = {
  getAccessToken: async () => get(KEYS.access),
  getRefreshToken: async () => get(KEYS.refresh),

  async getUser(): Promise<ApiUser | null> {
    const json = get(KEYS.user);
    try {
      return json ? (JSON.parse(json) as ApiUser) : null;
    } catch {
      return null;
    }
  },

  async save(session: { accessToken: string; refreshToken: string; user?: ApiUser }) {
    set(KEYS.access, session.accessToken);
    set(KEYS.refresh, session.refreshToken);
    if (session.user) set(KEYS.user, JSON.stringify(session.user));
  },

  async saveUser(user: ApiUser) {
    set(KEYS.user, JSON.stringify(user));
  },

  async clear() {
    Object.values(KEYS).forEach(remove);
  },
};
