import * as SecureStore from 'expo-secure-store';

/**
 * Keeps the session in the iPhone Keychain (encrypted, survives app restarts,
 * wiped when the app is deleted). The cached user lets moji open offline.
 */
const KEYS = {
  access: 'moji.accessToken',
  refresh: 'moji.refreshToken',
  user: 'moji.user',
} as const;

export type ApiUser = { id: string; email: string; name: string | null; avatarUrl: string | null };

export const tokenStore = {
  getAccessToken: () => SecureStore.getItemAsync(KEYS.access),
  getRefreshToken: () => SecureStore.getItemAsync(KEYS.refresh),

  async getUser(): Promise<ApiUser | null> {
    const json = await SecureStore.getItemAsync(KEYS.user);
    return json ? (JSON.parse(json) as ApiUser) : null;
  },

  async save(session: { accessToken: string; refreshToken: string; user?: ApiUser }) {
    await SecureStore.setItemAsync(KEYS.access, session.accessToken);
    await SecureStore.setItemAsync(KEYS.refresh, session.refreshToken);
    if (session.user) await SecureStore.setItemAsync(KEYS.user, JSON.stringify(session.user));
  },

  async saveUser(user: ApiUser) {
    await SecureStore.setItemAsync(KEYS.user, JSON.stringify(user));
  },

  async clear() {
    await Promise.all(Object.values(KEYS).map((key) => SecureStore.deleteItemAsync(key)));
  },
};
