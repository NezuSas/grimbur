import { ENCOUNTER_CHANCE, ENCOUNTER_FROM, GAMBLER_PAYOUT, GAMBLER_STAKE, SCOUT_ARROWS, SCOUT_TILES, canTake, encounterFor, resolveEncounter } from '../../src/core/engine/encounters';
import { gameReducer } from '../../src/core/engine/reducer';
import { coin, createState } from '../helpers/state';
import type { GameState } from '../../src/core/engine/types';

const withEncounter = (id: 'scout' | 'spring' | 'gambler' | 'shrine', extra: Partial<GameState> = {}): GameState =>
  ({ ...createState({ entities: [coin(30)] }), level: 3, runSeed: 77, encounter: { id }, ...extra });

describe('encounters', () => {
  it('open some floors from the second one, never the first nor the lair, the same for a given seed', () => {
    let n = 0;
    for (let seed = 1; seed <= 400; seed++) {
      expect(encounterFor(seed, 1, 'expedition')).toBeNull();
      expect(encounterFor(seed, 10, 'expedition')).toBeNull();
      const e = encounterFor(seed, ENCOUNTER_FROM + 2, 'expedition');
      expect(e).toBe(encounterFor(seed, ENCOUNTER_FROM + 2, 'expedition'));
      if (e) n++;
    }
    expect(n / 400).toBeGreaterThan(ENCOUNTER_CHANCE - 0.08);
    expect(n / 400).toBeLessThan(ENCOUNTER_CHANCE + 0.08);
  });

  it('holds every move until the player chooses', () => {
    const s = withEncounter('spring');
    expect(gameReducer(s, { type: 'MOVE', direction: 'RIGHT' })).toBe(s);
    const chosen = gameReducer(s, { type: 'RESOLVE_ENCOUNTER', take: false });
    expect(chosen.encounter?.outcome).toBe('skip');
    expect(gameReducer(chosen, { type: 'MOVE', direction: 'RIGHT' }).playerIndex).not.toBe(chosen.playerIndex);
    expect(gameReducer(chosen, { type: 'DISMISS_ENCOUNTER' }).encounter).toBeNull();
  });

  it('the scout lights safe tiles for arrows', () => {
    const s = withEncounter('scout', { attack: 5 });
    const after = resolveEncounter(s, true);
    expect(after.attack).toBe(5 - SCOUT_ARROWS);
    expect(after.visited.length).toBe(s.visited.length + SCOUT_TILES);
    expect(after.visited).not.toContain(30);
  });

  it('cannot be taken without the price, and then nothing is paid', () => {
    const broke = withEncounter('gambler', { gems: GAMBLER_STAKE - 1 });
    expect(canTake('gambler', broke)).toBe(false);
    const after = resolveEncounter(broke, true);
    expect(after.gems).toBe(GAMBLER_STAKE - 1);
    expect(after.encounter?.outcome).toBe('skip');
  });

  it('the gambler either pays out or keeps the stake, by the run seed', () => {
    const outcomes = new Set<string>();
    for (let seed = 1; seed <= 40; seed++) {
      const after = resolveEncounter(withEncounter('gambler', { gems: 10, runSeed: seed }), true);
      outcomes.add(after.encounter!.outcome!);
      expect(after.gems).toBe(after.encounter?.outcome === 'win' ? 10 - GAMBLER_STAKE + GAMBLER_PAYOUT : 10 - GAMBLER_STAKE);
    }
    expect(outcomes).toEqual(new Set(['win', 'lose']));
  });

  it('the shrine turns an arrow into a detector charge', () => {
    const after = resolveEncounter(withEncounter('shrine', { attack: 3, items: { detector: 0, bomb: 0 } }), true);
    expect(after.attack).toBe(2);
    expect(after.items.detector).toBe(1);
  });
});
