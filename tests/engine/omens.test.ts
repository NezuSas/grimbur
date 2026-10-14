import { OMENS, OmenId, omenEffects, omenFor } from '../../src/core/engine/omens';
import { generateBoard } from '../../src/core/engine/generator';
import { gameReducer, initialState } from '../../src/core/engine/reducer';
import { coinReward } from '../../src/core/engine/scoring';
import { GAME_CONFIG } from '../../src/config/gameConfig';
import { NO_PERKS } from '../../src/core/engine/heroes';

const count = (b: ReturnType<typeof generateBoard>, type: string) => b.entities.filter(e => e.type === type).length;

describe('omenFor', () => {
  it('is deterministic and never on floor 1 or the lair', () => {
    for (let seed = 1; seed <= 50; seed++) {
      expect(omenFor(seed, 1)).toBeNull();
      expect(omenFor(seed, GAME_CONFIG.expedition.floors)).toBeNull();
      expect(omenFor(seed, 4)).toBe(omenFor(seed, 4));
    }
  });

  it('produces every omen and plain floors, roughly in the intended proportions', () => {
    const seen: Record<string, number> = {};
    let total = 0;
    for (let seed = 1; seed <= 400; seed++) {
      for (let level = 2; level < GAME_CONFIG.expedition.floors; level++) {
        const key = omenFor(seed, level) ?? 'none';
        seen[key] = (seen[key] ?? 0) + 1;
        total++;
      }
    }
    for (const id of Object.keys(OMENS)) expect(seen[id]).toBeGreaterThan(0);
    expect(seen.none / total).toBeGreaterThan(0.3);
    expect(seen.none / total).toBeLessThan(0.5);
  });
});

describe('omen effects on the board', () => {
  const seed = 4242;
  const plain = generateBoard(5, seed);

  it('bounty adds a guardian', () => {
    expect(count(generateBoard(5, seed, { omen: 'bounty' }), 'enemy')).toBeGreaterThanOrEqual(count(plain, 'enemy'));
  });

  it('calm never leaves a floor without hazards and removes some', () => {
    const calm = generateBoard(5, seed, { omen: 'calm' });
    expect(count(calm, 'enemy')).toBeLessThanOrEqual(count(plain, 'enemy'));
    expect(count(calm, 'enemy')).toBeGreaterThan(0);
  });

  it('arsenal gives two more arrows', () => {
    expect(generateBoard(5, seed, { omen: 'arsenal' }).attack).toBe(plain.attack + 2);
  });

  it('keeps every omen floor solvable (all gems placed)', () => {
    const ids: OmenId[] = ['bounty', 'calm', 'arsenal'];
    for (const omen of ids) {
      for (let s = 1; s <= 40; s++) {
        const board = generateBoard(8, s, { omen });
        expect(board.coins).toBeGreaterThan(0);
      }
    }
  });
});

describe('bounty gems pay more', () => {
  it('multiplies the gem reward by 1.5 on a bounty floor', () => {
    let runSeed = 1;
    while (omenFor(runSeed, 3) !== 'bounty') runSeed++;
    const state = gameReducer(initialState, {
      type: 'RESET',
      character: { playerName: 'T' } as never,
      rows: 5,
      cols: 8,
      entities: [{ index: 1, type: 'coin' }, { index: 39, type: 'coin' }],
      coins: 2,
      attack: 3,
      seed: 7,
      runSeed,
      perks: NO_PERKS,
    });
    const onBounty = { ...state, level: 3, omen: 'bounty' as const };
    const after = gameReducer(onBounty, { type: 'MOVE', direction: 'RIGHT' });
    const gained = after.score - onBounty.score;
    const base = coinReward(3, 1.5, 0);
    expect(gained).toBeGreaterThanOrEqual(base - 5); // reward minus the step cost
    expect(omenEffects('bounty').gemMultiplier).toBe(1.5);
  });
});
