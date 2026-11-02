import { useEffect, useRef, type ComponentRef } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

// TypeScript reads google.ts by default; this web-only file needs the web version.
import { googleConfigured, renderGoogleButton } from '@/lib/google.web';

/**
 * Google's own "Sign in with Google" button for websites. Google draws it inside this
 * box, and calls onIdToken after you pick an account in its popup.
 */
export function GoogleButton({ onIdToken }: { onPress: () => void; onIdToken: (idToken: string) => void }) {
  const box = useRef<ComponentRef<typeof View>>(null);
  const { i18n } = useTranslation();
  const latest = useRef(onIdToken);
  latest.current = onIdToken;

  useEffect(() => {
    // On the web, a View is a <div>.
    const element = box.current as unknown as HTMLElement | null;
    if (!element || !googleConfigured) return;
    renderGoogleButton(element, (token) => latest.current(token), i18n.language).catch(() => undefined);
  }, [i18n.language]);

  return <View ref={box} style={{ minHeight: 44, minWidth: 280, alignItems: 'center' }} />;
}
