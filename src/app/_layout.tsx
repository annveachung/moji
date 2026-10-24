import '@/global.css';
import '@/i18n';

import {
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
  useFonts,
} from '@expo-google-fonts/space-grotesk';
import { Stack } from 'expo-router/stack';
import * as SplashScreen from 'expo-splash-screen';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { DATABASE_NAME, migrateDbIfNeeded } from '@/db/database';
import { SettingsProvider } from '@/state/settings';
import colors from '@/theme/colors';

// Keep the splash screen up until the fonts are ready, so text doesn't jump.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ SpaceGrotesk_600SemiBold, SpaceGrotesk_700Bold });

  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SQLiteProvider databaseName={DATABASE_NAME} onInit={migrateDbIfNeeded}>
      <SettingsProvider>
        <StatusBar style="dark" />
        {/* A stack: the tabs at the bottom, and pages like a word's detail pushed on top. */}
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.cream.DEFAULT },
          }}>
          {/* The add/edit form slides up as a sheet. */}
          <Stack.Screen name="word-form" options={{ presentation: 'modal' }} />
        </Stack>
      </SettingsProvider>
    </SQLiteProvider>
  );
}
