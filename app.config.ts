import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * app.json holds the static settings; this file adds the parts that come from .env.
 *
 * Google sign-in on iOS needs a URL scheme so Google can hand control back to moji:
 * the iOS client id written backwards, e.g.
 *   123-abc.apps.googleusercontent.com → com.googleusercontent.apps.123-abc
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim();
  const iosUrlScheme = iosClientId ? iosClientId.split('.').reverse().join('.') : null;
  if (!iosUrlScheme) {
    console.warn('EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID is not set: Google sign-in will not work in this build.');
  }

  return {
    ...config,
    name: config.name ?? 'moji',
    slug: config.slug ?? 'moji',
    plugins: [
      ...(config.plugins ?? []),
      ...(iosUrlScheme ? [['@react-native-google-signin/google-signin', { iosUrlScheme }] as [string, object]] : []),
    ],
  };
};
