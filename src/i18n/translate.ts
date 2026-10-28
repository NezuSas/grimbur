/**
 * Minimal, dependency-free i18n core (pure, no React Native imports so it is unit-testable).
 *
 * - Dictionaries are flat `key -> text` maps.
 * - `{name}` placeholders are replaced from a params object.
 * - Plurals use `<base>_one` / `<base>_other` keys, chosen with `plural()`.
 */

export type Language = 'en' | 'es';
export type LanguagePreference = Language | 'auto';
export type Params = Record<string, string | number>;

export const LANGUAGES: readonly Language[] = ['en', 'es'];

/** Resolves the preference to a concrete language; `auto` follows the device, falling back to English. */
export function resolveLanguage(preference: LanguagePreference, deviceLanguageCode?: string | null): Language {
  // A stored value that is not a known language (corrupted storage, a downgrade) behaves like `auto`.
  if ((LANGUAGES as readonly string[]).includes(preference)) return preference as Language;
  const code = (deviceLanguageCode ?? '').toLowerCase().slice(0, 2);
  return (LANGUAGES as readonly string[]).includes(code) ? (code as Language) : 'en';
}

/** How each game language writes numbers (the chosen language, not the phone's locale, so text and digits never mix styles). */
const NUMBER_LOCALE: Record<Language, string> = { en: 'en-US', es: 'es-EC' };

/** `1234` as the chosen language writes it (`1,234` / `1.234`). Falls back to the plain digits where Intl is missing. */
export function formatNumber(value: number, language: Language): string {
  try {
    return value.toLocaleString(NUMBER_LOCALE[language]);
  } catch {
    return String(value);
  }
}

/**
 * Replaces every `{name}` with its value; unknown placeholders are left visible so bugs are easy to spot.
 * A number is written as `language` writes it, so callers pass numbers raw instead of pre-formatting them.
 */
export function format(template: string, params?: Params, language?: Language): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? (typeof params[name] === 'number' && language ? formatNumber(params[name] as number, language) : String(params[name])) : match,
  );
}

type PluralBase<K extends string> = K extends `${infer B}_one` ? B : never;

export interface Translator<K extends string> {
  t(key: K, params?: Params): string;
  plural(base: PluralBase<K>, count: number, params?: Params): string;
}

/**
 * Builds a translator for `language`. Missing keys in a non-English dictionary fall back to English,
 * and a missing key everywhere returns the key itself (so it shows up in QA instead of crashing).
 */
export function createTranslator<K extends string>(
  dictionaries: Record<Language, Record<K, string>>,
  language: Language,
): Translator<K> {
  const lookup = (key: string): string =>
    (dictionaries[language] as Record<string, string>)[key] ??
    (dictionaries.en as Record<string, string>)[key] ??
    key;

  return {
    t: (key, params) => format(lookup(key), params, language),
    plural: (base, count, params) =>
      format(lookup(`${base}_${count === 1 ? 'one' : 'other'}`), { count, ...params }, language),
  };
}
