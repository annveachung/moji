import { useSQLiteContext } from 'expo-sqlite';
import { createContext, use, useEffect, useState, type ReactNode } from 'react';

import { getAllSettings, setSetting } from '@/db/queries';
import type { Language, UiLanguage } from '@/db/types';
import i18n, { deviceLanguage } from '@/i18n';

export type Settings = {
  /** Language of buttons, labels and menus. Japanese by default, for immersion. */
  uiLanguage: UiLanguage;
  /** Which meaning to show for words and sentences (only one at a time, to save space). */
  meaningLanguage: Language;
  showFurigana: boolean;
};

function defaultSettings(): Settings {
  return {
    uiLanguage: 'ja',
    meaningLanguage: deviceLanguage(),
    showFurigana: true,
  };
}

type SettingsContextValue = {
  settings: Settings;
  updateSettings: (patch: Partial<Settings>) => Promise<void>;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

/** Loads settings from SQLite once, and saves every change back. */
export function SettingsProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    getAllSettings(db).then((stored) => {
      const loaded = defaultSettings();
      for (const [key, value] of Object.entries(stored)) {
        if (key in loaded) Object.assign(loaded, { [key]: JSON.parse(value) });
      }
      i18n.changeLanguage(loaded.uiLanguage);
      setSettings(loaded);
    });
  }, [db]);

  if (!settings) return null;

  const updateSettings = async (patch: Partial<Settings>) => {
    setSettings({ ...settings, ...patch });
    if (patch.uiLanguage) await i18n.changeLanguage(patch.uiLanguage);
    for (const [key, value] of Object.entries(patch)) {
      await setSetting(db, key, JSON.stringify(value));
    }
  };

  return <SettingsContext value={{ settings, updateSettings }}>{children}</SettingsContext>;
}

export function useSettings(): SettingsContextValue {
  const value = use(SettingsContext);
  if (!value) throw new Error('useSettings must be used inside <SettingsProvider>');
  return value;
}
