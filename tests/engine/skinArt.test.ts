import * as fs from 'fs';
import * as path from 'path';

jest.mock('react-native', () => ({ Platform: { OS: 'ios' } }));

import { SKINS_BY_HERO } from '../../src/core/skins/skins';
import { HERO_COUNT } from '../../src/core/stats/achievements';
import { SKIN_IDS, SKIN_ACCENT, skinArt, skinsForHero, SkinId } from '../../src/data/skinArt';

const ORDER: SkinId[] = ['classic', 'ember', 'verdant', 'frost', 'royal', 'shadow', 'gilded'];
const REDUNDANT: Record<number, SkinId | undefined> = { 0: 'frost', 1: 'ember', 2: 'verdant', 3: 'gilded', 5: 'ember' };
const CLASSIC_FILES = ['Cyan', 'Red', 'Green', 'Gold', 'Pink', 'Orange'];
const SKINS_DIR = path.join(__dirname, '../../src/assets/sprites/skins');
const CHAR_DIR = path.join(__dirname, '../../src/assets/sprites/characters');

const pngSize = (file: string) => {
  const b = fs.readFileSync(file);
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
};

describe('skinArt', () => {
  it('lists skin ids with classic first and in the specified order', () => {
    expect([...SKIN_IDS]).toEqual(ORDER);
    ORDER.forEach((s) => expect(SKIN_ACCENT[s]).toMatch(/^#[0-9A-Fa-f]{6}$/));
  });

  it('covers every hero and matches the core catalog', () => {
    expect(CLASSIC_FILES).toHaveLength(HERO_COUNT);
    for (let hero = 0; hero < HERO_COUNT; hero++) expect(skinsForHero(hero)).toEqual([...SKINS_BY_HERO[hero]]);
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
          for (const kind of ['hero', 'attack', 'icon']) {
            expect(fs.existsSync(path.join(SKINS_DIR, skin, `${hero}_${kind}.png`))).toBe(true);
          }
        }
      }
      // a skin that does not exist for the hero falls back to classic art
      if (REDUNDANT[hero]) expect(skinArt(hero, REDUNDANT[hero]!)).toEqual(skinArt(hero, 'classic'));
    }
  });

  it('keeps the original dimensions for every generated sprite', () => {
    const kinds: [string, string][] = [['hero', 'Hero'], ['attack', 'Attack'], ['icon', 'Icon']];
    for (let hero = 0; hero < HERO_COUNT; hero++) {
      for (const skin of skinsForHero(hero).slice(1)) {
        for (const [kind, prefix] of kinds) {
          const orig = pngSize(path.join(CHAR_DIR, `${prefix}_${CLASSIC_FILES[hero]}.png`));
          const gen = pngSize(path.join(SKINS_DIR, skin, `${hero}_${kind}.png`));
          expect(gen).toEqual(orig);
        }
      }
    }
  });
});
