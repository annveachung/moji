import '@/global.css';
import '@/i18n';

import {
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  useFonts,
} from '@expo-google-fonts/plus-jakarta-sans';
import { Stack } from 'expo-router/stack';
import * as SplashScreen from 'expo-splash-screen';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { DATABASE_NAME, migrateDbIfNeeded } from '@/db/database';
import { AuthProvider, useAuth } from '@/state/auth';
import { SettingsProvider } from '@/state/settings';
import colors from '@/theme/colors';

// Keep the splash screen up until fonts are loaded and we know whether you're signed in.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });

  if (!fontsLoaded && !fontError) return null;

  return (
    <SQLiteProvider databaseName={DATABASE_NAME} onInit={migrateDbIfNeeded}>
      <SettingsProvider>
        <AuthProvider>
          <StatusBar style="dark" />
          <AppStack />
        </AuthProvider>
      </SettingsProvider>
    </SQLiteProvider>
  );
}

/**
 * The screens, guarded by sign-in: signed in → the app; signed out → only the sign-in screen.
 * Stack.Protected switches between them automatically when the auth status changes.
 */
function AppStack() {
  const { status } = useAuth();

  useEffect(() => {
    if (status !== 'loading') SplashScreen.hideAsync();
  }, [status]);

  if (status === 'loading') return null;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.surface.DEFAULT } }}>
      <Stack.Protected guard={status === 'signedIn'}>
        <Stack.Screen name="(tabs)" />
        {/* The add/edit form slides up as a sheet. */}
        <Stack.Screen name="word-form" options={{ presentation: 'modal' }} />
        <Stack.Screen name="word/[id]" />
        <Stack.Screen name="grammar/[id]" />
        <Stack.Screen name="collection/[id]" />
      </Stack.Protected>
      <Stack.Protected guard={status === 'signedOut'}>
        <Stack.Screen name="sign-in" />
      </Stack.Protected>
    </Stack>
  );
}
