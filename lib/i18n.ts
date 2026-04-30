import { getLocales } from 'expo-localization';
import { initReactI18next } from 'react-i18next';
import i18n from 'i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from '@/locales/en.json';
import nl from '@/locales/nl.json';
import es from '@/locales/es.json';
import fr from '@/locales/fr.json';
import de from '@/locales/de.json';

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English',    nativeLabel: 'English'    },
  { code: 'nl', label: 'Dutch',      nativeLabel: 'Nederlands' },
  { code: 'es', label: 'Spanish',    nativeLabel: 'Español'    },
  { code: 'fr', label: 'French',     nativeLabel: 'Français'   },
  { code: 'de', label: 'German',     nativeLabel: 'Deutsch'    },
] as const;

export type LanguageCode = typeof SUPPORTED_LANGUAGES[number]['code'];

export const LANGUAGE_STORAGE_KEY = 'app_language';

export function getDeviceLanguage(): LanguageCode {
  const locales = getLocales();
  const deviceLang = locales[0]?.languageCode ?? 'en';
  const supported = SUPPORTED_LANGUAGES.map(l => l.code) as string[];
  return (supported.includes(deviceLang) ? deviceLang : 'en') as LanguageCode;
}

export async function getPersistedLanguage(): Promise<LanguageCode | null> {
  try {
    const stored = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    const supported = SUPPORTED_LANGUAGES.map(l => l.code) as string[];
    if (stored && supported.includes(stored)) {
      return stored as LanguageCode;
    }
    return null;
  } catch {
    return null;
  }
}

export async function persistLanguage(code: LanguageCode): Promise<void> {
  try {
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, code);
  } catch {
    // ignore
  }
}

export async function changeLanguage(code: LanguageCode): Promise<void> {
  console.log('[i18n] changeLanguage:', code);
  await persistLanguage(code);
  await i18n.changeLanguage(code);
}

let i18nInitialized = false;

export async function initI18n(): Promise<void> {
  if (i18nInitialized) return;
  i18nInitialized = true;

  const persisted = await getPersistedLanguage();
  const lng = persisted ?? getDeviceLanguage();

  console.log('[i18n] initI18n — language:', lng);

  await i18n
    .use(initReactI18next)
    .init({
      resources: {
        en: { translation: en },
        nl: { translation: nl },
        es: { translation: es },
        fr: { translation: fr },
        de: { translation: de },
      },
      lng,
      fallbackLng: 'en',
      interpolation: { escapeValue: false },
      compatibilityJSON: 'v4',
    });
}

export default i18n;
