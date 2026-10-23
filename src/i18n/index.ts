import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import type { Language } from '@/db/types';

import en from './en';
import zhTW from './zh-TW';

/** Traditional Chinese if the phone's first language is Chinese, otherwise English. */
export function deviceLanguage(): Language {
  return getLocales()[0]?.languageCode === 'zh' ? 'zh-TW' : 'en';
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    'zh-TW': { translation: zhTW },
  },
  lng: deviceLanguage(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false }, // React already escapes text
});

export default i18n;
