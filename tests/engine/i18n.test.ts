import { createTranslator, format, formatNumber, resolveLanguage } from '../../src/i18n/translate';

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

describe('formatNumber', () => {
  it('writes the number as the chosen game language does, not as the phone does', () => {
    expect(formatNumber(1234567, 'en')).toBe('1,234,567');
    expect(formatNumber(1234567, 'es')).toBe('1.234.567');
    expect(formatNumber(999, 'es')).toBe('999');
  });

  it('numeric params in templates come out formatted; strings are left alone', () => {
    const dict = { en: { balance: 'You have {n} embers ({note})' }, es: { balance: 'Tienes {n} brasas ({note})' } };
    expect(createTranslator(dict, 'es').t('balance', { n: 12500, note: 'v1.2' })).toBe('Tienes 12.500 brasas (v1.2)');
    expect(createTranslator(dict, 'en').t('balance', { n: 12500, note: 'v1.2' })).toBe('You have 12,500 embers (v1.2)');
  });
});
