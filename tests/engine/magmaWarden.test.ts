import { gameReducer } from '../../src/core/engine/reducer';
import { LAVA_TURNS, WARDEN_FLOOR, WARDEN_HP, generateBoard } from '../../src/core/engine/generator';
import { coolLava, huntersAct } from '../../src/core/engine/worldHelpers';
import { forkDoors } from '../../src/core/engine/shop';
import { beastOf } from '../../src/core/stats/bestiary';
import { floorNovelties } from '../../src/core/feedback/hints';
import type { GameEntity } from '../../src/core/engine/types';
import { coin, createState } from '../helpers/state';

const warden = (index: number, hp = WARDEN_HP): GameEntity => ({ index, type: 'boss', hp, mini: true, warden: true });
const worldOf = (entities: GameEntity[]) => ({ entities, entityMap: Object.fromEntries(entities.map(e => [e.index, e])) });

describe('the Magma Colossus', () => {
  it('guards the middle of the magma caves, with its own hearts and the arrows to fell it', () => {
    const plain = generateBoard(WARDEN_FLOOR, 777, { biome: 'magma' });
    const guarded = generateBoard(WARDEN_FLOOR, 777, { biome: 'magma', warden: true });
    const colossus = guarded.entities.find(e => e.warden);
    expect(colossus).toMatchObject({ type: 'boss', mini: true, hp: WARDEN_HP });
    expect(guarded.attack).toBe(plain.attack + WARDEN_HP + 1);
    expect(guarded.entities.some(e => e.type === 'thief')).toBe(false);
  });

  it('leaves a pool of lava on every tile it steps off, which cools away', () => {
    // A 1x8 corridor: the hero at 0, the Colossus at 6 walks left toward it.
    const world = worldOf([warden(6)]);
    const acted = huntersAct(world, 0, 1, 8, 2, 0);
    expect(acted.world.entityMap[5]?.warden).toBe(true);
    expect(acted.world.entityMap[6]).toMatchObject({ type: 'pit', lava: true, ttl: LAVA_TURNS });
    let w = acted.world;
    for (let i = 0; i < LAVA_TURNS - 1; i++) w = coolLava(w);
    expect(w.entityMap[6]?.ttl).toBe(1);
    expect(coolLava(w).entityMap[6]).toBeUndefined();
  });

  it('is named as the killer, and the lava is not a vortex of the bestiary', () => {
    const s = createState({ entities: [coin(100), warden(1)] });
    expect(gameReducer(s, { type: 'MOVE', direction: 'RIGHT' }).deathCause).toBe('warden');
    expect(beastOf(warden(1))).toBe('warden');
    expect(beastOf({ type: 'pit', lava: true })).toBeNull();
    expect(beastOf({ type: 'boss', mini: true })).toBe('brute');
  });

  it('gets its own explanation the first time, apart from the lieutenant', () => {
    expect(floorNovelties({ entities: [warden(3)] })).toEqual(['warden']);
    expect(floorNovelties({ entities: [{ type: 'boss', mini: true }] })).toEqual(['lieutenant']);
  });

  it('is never jumped over by a shortcut', () => {
    for (let seed = 1; seed < 400; seed++) expect(forkDoors(seed, WARDEN_FLOOR, 'expedition') ?? []).not.toContain('shortcut');
  });
});
