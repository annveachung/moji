import { GoogleSigninButton } from '@react-native-google-signin/google-signin';

import { googleConfigured } from '@/lib/google';

/** Google's official sign-in button (required by their branding rules). iPhone version. */
export function GoogleButton({ onPress }: { onPress: () => void; onIdToken: (idToken: string) => void }) {
  return (
    <GoogleSigninButton
      size={GoogleSigninButton.Size.Wide}
      color={GoogleSigninButton.Color.Light}
      disabled={!googleConfigured}
      onPress={onPress}
    />
  );
}
