import { en } from '../../src/i18n/en';
import { es } from '../../src/i18n/es';

const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort();
const emoji = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/u;

describe('translation dictionaries', () => {
  const keys = Object.keys(en) as (keyof typeof en)[];

  it('Spanish has exactly the English keys', () => {
    expect(Object.keys(es).sort()).toEqual([...keys].sort());
  });

  it('every key has the same {placeholders} in both languages', () => {
    for (const key of keys) {
      expect({ key, params: placeholders(es[key]) }).toEqual({ key, params: placeholders(en[key]) });
    }
  });

  it('plural keys come in _one/_other pairs', () => {
    for (const key of keys) {
      if (key.endsWith('_one')) expect(keys).toContain(key.replace(/_one$/, '_other'));
      if (key.endsWith('_other')) expect(keys).toContain(key.replace(/_other$/, '_one'));
    }
  });

  it('has no empty values and no emoji inside the text (icons live in the UI)', () => {
    for (const key of keys) {
      expect(en[key].trim()).not.toBe('');
      expect(es[key].trim()).not.toBe('');
      expect({ key, hasEmoji: emoji.test(en[key]) }).toEqual({ key, hasEmoji: false });
      expect({ key, hasEmoji: emoji.test(es[key]) }).toEqual({ key, hasEmoji: false });
    }
  });

  it('covers every hero and relic with a name and a description', () => {
    for (const i of [0, 1, 2, 3]) {
      expect(keys).toContain(`hero.${i}.name`);
      expect(keys).toContain(`hero.${i}.perk`);
      expect(keys).toContain(`hero.${i}.desc`);
    }
    for (const id of ['quiver', 'lucky_coin', 'iron_boots', 'lantern', 'phoenix', 'hunter', 'long_bow', 'bulwark', 'greed', 'frost', 'trap_sense']) {
      expect(keys).toContain(`relic.${id}.name`);
      expect(keys).toContain(`relic.${id}.desc`);
    }
  });
});
