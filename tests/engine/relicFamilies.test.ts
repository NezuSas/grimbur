import { gameReducer } from '../../src/core/engine/reducer';
import { ALL_RELICS, FAMILY_SET, LOOTER_GEMS, RELIC_FAMILY, RelicId, activeFamilies, familyCount } from '../../src/core/engine/relics';
import { hunterSlowdown } from '../../src/core/engine/worldHelpers';
import { coin, createState } from '../helpers/state';

const floor = { rows: 6, cols: 9, entities: [coin(30)], coins: 1, attack: 3, seed: 5 };
const next = (relics: RelicId[]) => gameReducer({ ...createState(), relics, isLevelUp: true }, { type: 'LEVEL_UP', payload: floor });

describe('relic families', () => {
  it('every relic belongs to a family', () => {
    for (const id of ALL_RELICS) expect(RELIC_FAMILY[id]).toBeDefined();
  });

  it('wake their bonus with three relics of a family, cursed ones included', () => {
    expect(activeFamilies(['quiver', 'hunter'])).toEqual([]);
    expect(activeFamilies(['quiver', 'hunter', 'reaper'])).toEqual(['archer']);
    expect(familyCount(['lantern', 'owl', 'magnet'], 'explorer')).toBe(2);
    expect(FAMILY_SET).toBe(3);
  });

  it('archers: one more arrow on every floor', () => {
    expect(next(['quiver', 'hunter', 'long_bow']).attack).toBe(next(['quiver', 'hunter', 'magnet']).attack + 1);
  });

  it('looters: shop gems on every new floor', () => {
    const base = next(['lucky_coin', 'greed']);
    expect(next(['lucky_coin', 'greed', 'magnet']).gems).toBe(base.gems + LOOTER_GEMS);
  });

  it('explorers: a detector charge on every floor', () => {
    expect(next(['lantern', 'owl', 'raven_eye']).items.detector).toBe(next(['lantern', 'owl']).items.detector + 1);
  });

  it('survivors: the hunters act one action slower', () => {
    expect(hunterSlowdown(['phoenix', 'bulwark', 'thorns'])).toBe(hunterSlowdown(['phoenix', 'bulwark']) + 1);
  });
});
