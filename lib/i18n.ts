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
  { code: 'es', label: 'Spanish',    nativeLabel: 'Espanol'    },
  { code: 'fr', label: 'French',     nativeLabel: 'Francais'   },
  { code: 'de', label: 'German',     nativeLabel: 'Deutsch'    },
] as const;

export type LanguageCode = typeof SUPPORTED_LANGUAGES[number]['code'];

export const LANGUAGE_STORAGE_KEY = 'app_language';

function normalizeLanguageCode(value: unknown): LanguageCode | null {
  if (typeof value !== 'string') return null;
  const code = value.split(/[-_]/)[0]?.toLowerCase();
  const supported = SUPPORTED_LANGUAGES.map(l => l.code) as string[];
  return supported.includes(code) ? (code as LanguageCode) : null;
}

export function getDeviceLanguage(): LanguageCode {
  try {
    const nav = (globalThis as any).navigator;
    const candidates = [
      ...(Array.isArray(nav?.languages) ? nav.languages : []),
      nav?.language,
      Intl.DateTimeFormat().resolvedOptions().locale,
    ];

    for (const candidate of candidates) {
      const code = normalizeLanguageCode(candidate);
      if (code) return code;
    }
  } catch {
    // Fall through to English when the runtime does not expose locale APIs.
  }

  return 'en';
}

export async function getPersistedLanguage(): Promise<LanguageCode | null> {
  try {
    const stored = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    return normalizeLanguageCode(stored);
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

  console.log('[i18n] initI18n language:', lng);

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
