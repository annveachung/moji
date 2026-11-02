import { GoogleSignin, isErrorWithCode, statusCodes } from '@react-native-google-signin/google-signin';

/**
 * Google sign-in on the iPhone, through Google's native SDK.
 * (The web app uses google.web.ts instead, with Google's sign-in button for websites.)
 */
GoogleSignin.configure({
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || undefined,
  // With a web client id, Google's ID token is issued for it: that's what mojiApi checks.
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || undefined,
});

export const googleConfigured = Boolean(process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID);

/** Opens Google's sign-in sheet. Returns the ID token, or null if you cancelled. */
export async function getGoogleIdToken(): Promise<string | null> {
  try {
    const response = await GoogleSignin.signIn();
    if (response.type !== 'success') return null;
    return response.data.idToken;
  } catch (error) {
    if (isErrorWithCode(error) && error.code === statusCodes.SIGN_IN_CANCELLED) return null;
    throw error;
  }
}

export async function googleSignOut() {
  await GoogleSignin.signOut().catch(() => undefined);
}
