import { GAME_CONFIG } from '../../src/config/gameConfig';
import { isReal } from '../../src/config/isReal';

describe('release configuration', () => {
  it('does not switch real-money purchases on while the legal links still point to placeholders', () => {
    if (!GAME_CONFIG.monetization.enabled) return; // off during development: nothing to guard yet
    expect(isReal(GAME_CONFIG.monetization.termsUrl)).toBe(true);
    expect(isReal(GAME_CONFIG.monetization.privacyUrl)).toBe(true);
    expect(isReal(GAME_CONFIG.support.email)).toBe(true);
  });

  it('knows a placeholder when it sees one', () => {
    expect(isReal('https://example.com/privacy')).toBe(false);
    expect(isReal('support@example.com')).toBe(false);
    expect(isReal('')).toBe(false);
    expect(isReal('https://nezuecuador.com/privacy')).toBe(true);
  });
});
