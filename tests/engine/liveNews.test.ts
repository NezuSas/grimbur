import { MAX_NEWS_TEXT, newsToShow, parseLiveNews } from '../../src/core/news/liveNews';

describe('parseLiveNews', () => {
  it('reads a well-formed notice', () => {
    expect(parseLiveNews({ id: 'weekend-1', en: 'Double embers!', es: '¡Doble de brasas!', until: '2026-10-31' })).toEqual({
      id: 'weekend-1',
      en: 'Double embers!',
      es: '¡Doble de brasas!',
      until: '2026-10-31',
    });
  });

  it('needs an id and an English text', () => {
    expect(parseLiveNews({ en: 'x' })).toBeNull();
    expect(parseLiveNews({ id: 'a' })).toBeNull();
    expect(parseLiveNews({ id: 'bad id!', en: 'x' })).toBeNull();
    expect(parseLiveNews({ id: 'a', en: '   ' })).toBeNull();
    expect(parseLiveNews(null)).toBeNull();
    expect(parseLiveNews('text')).toBeNull();
  });

  it('cleans the text and caps its length; ignores bad optional fields', () => {
    const parsed = parseLiveNews({ id: 'a', en: 'he‮llo\u0000' + 'x'.repeat(500), until: 'tomorrow', es: 5 });
    expect(parsed?.en).not.toMatch(/[‮\u0000]/);
    expect(parsed?.en.length).toBeLessThanOrEqual(MAX_NEWS_TEXT);
    expect(parsed?.until).toBeUndefined();
    expect(parsed?.es).toBeUndefined();
  });
});

describe('newsToShow', () => {
  const news = { id: 'a', en: 'Hello', es: 'Hola', until: '2026-10-20' };

  it('picks the language, falling back to English', () => {
    expect(newsToShow(news, 'es', '2026-10-17', [])).toBe('Hola');
    expect(newsToShow(news, 'en', '2026-10-17', [])).toBe('Hello');
    expect(newsToShow({ id: 'a', en: 'Hello' }, 'es', '2026-10-17', [])).toBe('Hello');
  });

  it('is gone after its last day, and once dismissed', () => {
    expect(newsToShow(news, 'en', '2026-10-20', [])).toBe('Hello'); // the last day still shows
    expect(newsToShow(news, 'en', '2026-10-21', [])).toBeNull();
    expect(newsToShow(news, 'en', '2026-10-17', ['a'])).toBeNull();
    expect(newsToShow(null, 'en', '2026-10-17', [])).toBeNull();
  });
});
