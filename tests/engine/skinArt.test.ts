import * as fs from 'fs';
import * as path from 'path';

jest.mock('react-native', () => ({ Platform: { OS: 'ios' } }));

import { SKINS_BY_HERO, chromasOf } from '../../src/core/skins/skins';
import { HERO_COUNT } from '../../src/core/stats/achievements';
import { SKIN_IDS, skinAccent, skinArt, SkinId } from '../../src/data/skinArt';

/** The classic outfit's chromas offered to a hero. */
const skinsForHero = (hero: number): SkinId[] => chromasOf(hero, 'classic');

const ORDER: SkinId[] = ['classic', 'ember', 'verdant', 'frost', 'royal', 'shadow', 'gilded'];
const REDUNDANT: Record<number, SkinId | undefined> = { 0: 'frost', 1: 'ember', 2: 'verdant', 3: 'gilded', 5: 'ember' };
const CLASSIC_FILES = ['Cyan', 'Red', 'Green', 'Gold', 'Pink', 'Orange'];
const SKINS_DIR = path.join(__dirname, '../../src/assets/sprites/skins');
const CHAR_DIR = path.join(__dirname, '../../src/assets/sprites/characters');

/** Width and height of a WebP (VP8X, VP8L or VP8 chunk), read from its header. */
const imgSize = (file: string) => {
  const b = fs.readFileSync(file);
  const chunk = b.toString('ascii', 12, 16);
  if (chunk === 'VP8X') return { w: 1 + b.readUIntLE(24, 3), h: 1 + b.readUIntLE(27, 3) };
  if (chunk === 'VP8L') {
    const bits = b.readUInt32LE(21);
    return { w: (bits & 0x3fff) + 1, h: ((bits >> 14) & 0x3fff) + 1 };
  }
  return { w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff };
};

describe('skinArt', () => {
  it('lists skin ids with classic first and in the specified order', () => {
    expect([...SKIN_IDS]).toEqual(ORDER);
    ORDER.forEach((s) => expect(skinAccent(s)).toMatch(/^#[0-9A-Fa-f]{6}$/));
  });

  it('covers every hero and matches the core catalog', () => {
    expect(CLASSIC_FILES).toHaveLength(HERO_COUNT);
    for (let hero = 0; hero < HERO_COUNT; hero++) expect(skinsForHero(hero)).toEqual(SKINS_BY_HERO[hero].filter(id => (ORDER as string[]).includes(id)));
  });

  it.each([0, 1, 2, 3, 4, 5])('hero %i has classic + its skins, in order, minus its redundant theme', (hero) => {
    const skins = skinsForHero(hero);
    expect(skins).toHaveLength(REDUNDANT[hero] ? 6 : 7);
    expect(skins[0]).toBe('classic');
    if (REDUNDANT[hero]) expect(skins).not.toContain(REDUNDANT[hero]);
    expect(skins).toEqual(ORDER.filter((s) => s !== REDUNDANT[hero]));
  });

  it('never lists a skin that has no art and always returns defined sources', () => {
    for (let hero = 0; hero < HERO_COUNT; hero++) {
      for (const skin of skinsForHero(hero)) {
        const art = skinArt(hero, skin);
        expect(art.playerImage).toBeDefined();
        expect(art.attackImage).toBeDefined();
        expect(art.scoreImage).toBeDefined();
        expect(art.winImage).toBeDefined();
        expect(art.loseImage).toBeDefined();
        if (skin !== 'classic') {
          for (const kind of ['hero', 'attack', 'icon', 'win', 'lose']) {
            expect(fs.existsSync(path.join(SKINS_DIR, skin, `${hero}_${kind}.webp`))).toBe(true);
          }
        }
      }
      // a skin that does not exist for the hero falls back to classic art
      if (REDUNDANT[hero]) expect(skinArt(hero, REDUNDANT[hero]!)).toEqual(skinArt(hero, 'classic'));
    }
  });

  it('keeps the original dimensions for every generated sprite', () => {
    const kinds: [string, string][] = [['hero', 'Hero'], ['attack', 'Attack'], ['icon', 'Icon'], ['win', 'Win'], ['lose', 'Lose']];
    for (let hero = 0; hero < HERO_COUNT; hero++) {
      for (const skin of skinsForHero(hero).slice(1)) {
        for (const [kind, prefix] of kinds) {
          const orig = imgSize(path.join(CHAR_DIR, `${prefix}_${CLASSIC_FILES[hero]}.webp`));
          const gen = imgSize(path.join(SKINS_DIR, skin, `${hero}_${kind}.webp`));
          expect(gen).toEqual(orig);
        }
      }
    }
  });

  it('ships recoloured win and lose poses (512x512) for every generated skin', () => {
    for (let hero = 0; hero < HERO_COUNT; hero++) {
      for (const skin of skinsForHero(hero).slice(1)) {
        const art = skinArt(hero, skin);
        expect(art.winImage).toBeDefined();
        expect(art.loseImage).toBeDefined();
        for (const kind of ['win', 'lose']) {
          expect(imgSize(path.join(SKINS_DIR, skin, `${hero}_${kind}.webp`))).toEqual({ w: 512, h: 512 });
        }
      }
    }
  });
});

describe('outfits', () => {
  it('every look offered to a hero has its own art, front and back views included', () => {
    const { hasSkinArt } = require('../../src/data/skinArt');
    for (let hero = 0; hero < HERO_COUNT; hero++) {
      for (const skin of SKINS_BY_HERO[hero]) {
        expect([hero, skin, hasSkinArt(hero, skin)]).toEqual([hero, skin, true]);
        const art = skinArt(hero, skin);
        if (skin.startsWith('gala') || skin.startsWith('winter')) {
          expect(art.frontImage).toBeDefined();
          expect(art.backImage).toBeDefined();
        }
      }
    }
  });
});
