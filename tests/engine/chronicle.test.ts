import { CHRONICLE_COUNT, chronicleCount, chronicleUp } from '../../src/core/stats/chronicle';
import { en } from '../../src/i18n/en';
import { es } from '../../src/i18n/es';

describe('the chronicle', () => {
  it('reads one fragment per secret room, up to the last', () => {
    expect(chronicleCount({ secretsFound: 0 })).toBe(0);
    expect(chronicleCount({ secretsFound: 4 })).toBe(4);
    expect(chronicleCount({ secretsFound: 99 })).toBe(CHRONICLE_COUNT);
  });

  it('names the newest fragment a run unveiled', () => {
    expect(chronicleUp({ secretsFound: 2 }, { secretsFound: 4 })).toBe(4);
    expect(chronicleUp({ secretsFound: 4 }, { secretsFound: 4 })).toBeNull();
    expect(chronicleUp({ secretsFound: 12 }, { secretsFound: 13 })).toBeNull();
  });

  it('has every fragment written in both languages', () => {
    for (let n = 1; n <= CHRONICLE_COUNT; n++) {
      for (const dict of [en, es] as Record<string, string>[]) {
        expect(dict[`chronicle.${n}.title`]).toBeTruthy();
        expect(dict[`chronicle.${n}.body`]).toBeTruthy();
      }
    }
  });
});
