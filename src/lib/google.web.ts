/**
 * Google sign-in on the web, with Google Identity Services: Google draws its own button
 * (see components/google-button.web.tsx) and hands us an ID token when you pick an account.
 */
type CredentialResponse = { credential?: string };

type GoogleIdentity = {
  accounts: {
    id: {
      initialize: (options: { client_id: string; callback: (response: CredentialResponse) => void; ux_mode?: 'popup' }) => void;
      renderButton: (element: HTMLElement, options: Record<string, string | number>) => void;
      disableAutoSelect: () => void;
    };
  };
};

declare global {
  interface Window {
    google?: GoogleIdentity;
  }
}

const CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';

export const googleConfigured = Boolean(CLIENT_ID);

let script: Promise<GoogleIdentity> | null = null;

/** Load Google's sign-in script once. */
export function loadGoogleIdentity(): Promise<GoogleIdentity> {
  script ??= new Promise((resolve, reject) => {
    if (window.google?.accounts) return resolve(window.google);
    const tag = document.createElement('script');
    tag.src = 'https://accounts.google.com/gsi/client';
    tag.async = true;
    tag.onload = () => (window.google ? resolve(window.google) : reject(new Error('Google sign-in did not load')));
    tag.onerror = () => {
      script = null;
      reject(new Error('Google sign-in did not load'));
    };
    document.head.appendChild(tag);
  });
  return script;
}

/** Draw Google's button into `element`; `onIdToken` runs after you choose an account. */
export async function renderGoogleButton(element: HTMLElement, onIdToken: (idToken: string) => void, locale: string) {
  const google = await loadGoogleIdentity();
  google.accounts.id.initialize({
    client_id: CLIENT_ID,
    ux_mode: 'popup',
    callback: (response) => {
      if (response.credential) onIdToken(response.credential);
    },
  });
  google.accounts.id.renderButton(element, { theme: 'outline', size: 'large', shape: 'pill', text: 'signin_with', width: 280, locale });
}

/** On the web the button gives us the token, so there's no sheet to open. */
export async function getGoogleIdToken(): Promise<string | null> {
  return null;
}

export async function googleSignOut() {
  window.google?.accounts.id.disableAutoSelect();
}
