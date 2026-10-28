import { useMemo } from 'react';
import { getLocales } from 'expo-localization';
import { en, TranslationKey } from './en';
import { es } from './es';
import { createTranslator, formatNumber, resolveLanguage, Language, Params } from './translate';
import { useSettingsStore } from '../state/settings/store';

const dictionaries: Record<Language, Record<TranslationKey, string>> = { en, es };

/** Language code of the phone (e.g. `es`), or null when it cannot be read. */
let cachedDeviceLanguage: string | null | undefined;

export function getDeviceLanguageCode(): string | null {
  if (cachedDeviceLanguage === undefined) {
    try {
      cachedDeviceLanguage = getLocales()[0]?.languageCode ?? null;
    } catch {
      cachedDeviceLanguage = null;
    }
  }
  return cachedDeviceLanguage;
}

/** Translator bound to the user's language choice (Settings) or, on `auto`, to the phone's language. */
export function useT() {
  const preference = useSettingsStore(s => s.language);
  const language = resolveLanguage(preference, preference === 'auto' ? getDeviceLanguageCode() : null);

  return useMemo(
    () => ({ language, ...createTranslator<TranslationKey>(dictionaries, language), n: (value: number) => formatNumber(value, language) }),
    [language],
  );
}

/** `formatNumber` bound to the current language choice, for code outside React (share cards, messages). */
export function formatNumberNow(value: number): string {
  return formatNumber(value, resolveLanguage(useSettingsStore.getState().language, getDeviceLanguageCode()));
}

/** For code outside React (e.g. building a share message). */
export function translateNow(key: TranslationKey, params?: Params): string {
  const language = resolveLanguage(useSettingsStore.getState().language, getDeviceLanguageCode());
  return createTranslator<TranslationKey>(dictionaries, language).t(key, params);
}
