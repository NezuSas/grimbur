import { gameReducer } from '../../src/core/engine/reducer';
import { tallyBestiary } from '../../src/core/stats/bestiary';
import { NO_PERKS } from '../../src/core/engine/heroes';
import type { GameEntity, GameState } from '../../src/core/engine/types';
import { en } from '../../src/i18n/en';
import { es } from '../../src/i18n/es';
import { boss, coin, createState, enemy, pit, trap } from '../helpers/state';

const sleeper = (index: number): GameEntity => ({ index, type: 'sleeper' });
const stalker = (index: number): GameEntity => ({ index, type: 'stalker', charge: 0 });

describe('a vortex with nowhere empty left', () => {
  it('drops the hero on a tile that holds something and meets it there, never leaving it under the hero', () => {
    for (let seed = 1; seed <= 30; seed++) {
      // 1 x 4: the hero, the vortex, then only a gem and a trap. Every tile is taken, so the last resort is used.
      const s = createState({ rows: 1, cols: 4, entities: [pit(1), coin(2), trap(3)], coins: 1, seed });
      const next = gameReducer(s, { type: 'MOVE', direction: 'RIGHT' });
      expect(next.isGameOver).toBe(false);
      expect(next.wasTeleported).toBe(true);
      expect([2, 3]).toContain(next.playerIndex);
      expect(next.entityMap[next.playerIndex]).toBeUndefined();
      expect(next.entities.some(e => e.index === next.playerIndex)).toBe(false);
      if (next.playerIndex === 2) {
        expect(next.coins).toBe(0);
        expect(next.isLevelUp).toBe(true);
      } else {
        expect(next.lastPickup).toBe('trap');
        expect(next.coins).toBe(1);
      }
    }
  });
});

describe('the bestiary counts kills by who fell', () => {
  const base = (entities: GameEntity[], turn: number, woken = 0) =>
    ({ entities, level: 3, runSeed: 7, isGameOver: false, isVictory: false, deathCause: null, turn, woken }) as never;

  it('counts a guardian a bomb kills while the Grimbur calls a stalker', () => {
    const prev = base([enemy(5), { ...boss(20), calls: 0 }], 4);
    const next = base([{ ...boss(20, 2), calls: 1 }, stalker(21)], 5);
    expect(tallyBestiary(prev, next).slain).toEqual({ enemy: 1 });
  });

  it('counts a stalker shot in the same action a sleeper wakes, and no slain sleeper', () => {
    // The hero at 0 shoots the stalker at 1; the sleeper right below the hero wakes up after the shot.
    const s = createState({ entities: [coin(100), stalker(1), sleeper(15)] });
    const shot = gameReducer(s, { type: 'ATTACK', direction: 'RIGHT' });
    expect(shot.entities.some(e => e.type === 'sleeper')).toBe(false);
    expect(shot.entities.filter(e => e.type === 'stalker')).toHaveLength(1);
    expect(shot.slain).toEqual({ stalker: 1 });
  });

  it('a sleeper killed (not woken) still counts', () => {
    const s = createState({ entities: [coin(100), sleeper(1)] });
    const shot = gameReducer(s, { type: 'ATTACK', direction: 'RIGHT' });
    expect(shot.slain).toEqual({ sleeper: 1 });
  });

  it('taking back a step that woke a sleeper counts nothing', () => {
    const s = createState({ entities: [coin(100), sleeper(17)] });
    const woke = gameReducer(s, { type: 'MOVE', direction: 'RIGHT' });
    expect(woke.woken).toBe(1);
    const back = gameReducer(woke, { type: 'UNDO' });
    expect(back.entities.some(e => e.type === 'sleeper')).toBe(true);
    expect(back.slain ?? {}).toEqual({});
  });
});

describe('a trap that does not bite', () => {
  const step = (s: GameState) => gameReducer(s, { type: 'MOVE', direction: 'RIGHT' });
  it('is told apart from one that bit (what the board draws as sprung or disarmed)', () => {
    expect(step(createState({ entities: [coin(100), trap(1)] })).lastPickup).toBe('trap');
    expect(step(createState({ entities: [coin(100), trap(1)], perks: { ...NO_PERKS, trapImmune: true } })).lastPickup).toBeNull();
    const sensed = { ...createState({ entities: [coin(100), trap(1)] }), relics: ['trap_sense'] } as GameState;
    expect(step(sensed).lastPickup).toBeNull();
  });
});

describe('the manual speaks of depths without a hero', () => {
  it('has a weapon-neutral line for every depth that costs ammo', () => {
    for (const n of [1, 3, 5]) {
      const key = `ascension.${n}.neutral` as keyof typeof en;
      expect(en[key]).toBeTruthy();
      expect(es[key]).toBeTruthy();
      expect(en[key]).not.toMatch(/arrow|orb|bomb/i);
      expect(es[key]).not.toMatch(/flecha|orbe|bomba/i);
    }
  });
});
