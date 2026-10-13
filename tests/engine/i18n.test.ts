import { createTranslator, format, resolveLanguage } from '../../src/i18n/translate';

const dictionaries = {
  en: { hello: 'Hello {name}', gems_one: '{count} gem', gems_other: '{count} gems', onlyEn: 'Only English' },
  es: { hello: 'Hola {name}', gems_one: '{count} gema', gems_other: '{count} gemas' },
} as unknown as Parameters<typeof createTranslator<'hello' | 'gems_one' | 'gems_other' | 'onlyEn'>>[0];

describe('resolveLanguage', () => {
  it('honours an explicit choice', () => {
    expect(resolveLanguage('es', 'en')).toBe('es');
    expect(resolveLanguage('en', 'es')).toBe('en');
  });

  it('follows the device language and falls back to English', () => {
    expect(resolveLanguage('auto', 'es')).toBe('es');
    expect(resolveLanguage('auto', 'ES-MX')).toBe('es');
    expect(resolveLanguage('auto', 'fr')).toBe('en');
    expect(resolveLanguage('auto', null)).toBe('en');
    expect(resolveLanguage('auto')).toBe('en');
  });
});

describe('format', () => {
  it('replaces placeholders and keeps unknown ones visible', () => {
    expect(format('Level {n} of {total}', { n: 3, total: 10 })).toBe('Level 3 of 10');
    expect(format('Hi {who}', {})).toBe('Hi {who}');
    expect(format('No params')).toBe('No params');
  });
});

describe('createTranslator', () => {
  it('translates with parameters', () => {
    expect(createTranslator(dictionaries, 'es').t('hello', { name: 'Ana' })).toBe('Hola Ana');
    expect(createTranslator(dictionaries, 'en').t('hello', { name: 'Ana' })).toBe('Hello Ana');
  });

  it('chooses singular and plural forms', () => {
    const es = createTranslator(dictionaries, 'es');
    expect(es.plural('gems', 1)).toBe('1 gema');
    expect(es.plural('gems', 0)).toBe('0 gemas');
    expect(es.plural('gems', 5)).toBe('5 gemas');
  });

  it('falls back to English, then to the key itself', () => {
    const es = createTranslator(dictionaries, 'es');
    expect(es.t('onlyEn')).toBe('Only English');
    expect(es.t('missing' as never)).toBe('missing');
  });
});
