import { MAP_GEMS, SMITH_ARROWS, ENCOUNTER_CHANCE, ENCOUNTER_FROM, GAMBLER_PAYOUT, GAMBLER_STAKE, GAMBLER_WIN_FROM, SCOUT_ARROWS, SCOUT_TILES, canTake, encounterFor, resolveEncounter } from '../../src/core/engine/encounters';
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

  it('shows the gambler die on a face that matches the outcome, and every face comes up', () => {
    const faces = new Set<number>();
    for (let seed = 1; seed <= 200; seed++) {
      const enc = resolveEncounter(withEncounter('gambler', { gems: 10, runSeed: seed }), true).encounter!;
      expect(enc.die).toBeGreaterThanOrEqual(1);
      expect(enc.die).toBeLessThanOrEqual(6);
      expect(enc.die! >= GAMBLER_WIN_FROM).toBe(enc.outcome === 'win');
      faces.add(enc.die!);
    }
    expect(faces.size).toBe(6);
  });

  it('the shrine turns an arrow into a detector charge', () => {
    const after = resolveEncounter(withEncounter('shrine', { attack: 3, items: { detector: 0, bomb: 0 } }), true);
    expect(after.attack).toBe(2);
    expect(after.items.detector).toBe(1);
  });
});

describe('the second wave of encounters', () => {
  const s = (id: 'miner' | 'map' | 'echo' | 'smith', extra: Partial<GameState> = {}): GameState =>
    ({ ...createState({ entities: [coin(30), { index: 12, type: 'enemy' }] }), level: 4, runSeed: 91, encounter: { id }, ...extra });

  it('the trapped miner takes a bomb and gives a relic that is never cursed', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const after = resolveEncounter(s('miner', { runSeed: seed, items: { detector: 0, bomb: 1 } }), true);
      // A Powder Belt brings its bomb at once, like any relic gained mid-floor.
      expect(after.items.bomb).toBe(after.encounter?.relic === 'bomb_belt' ? 1 : 0);
      expect(after.encounter?.relic).toBeDefined();
      expect(after.relics).toContain(after.encounter!.relic);
      expect(after.encounter!.relic).not.toBe('gambler');
    }
    expect(canTake('miner', s('miner', { items: { detector: 0, bomb: 0 } }))).toBe(false);
  });

  it('the torn map lights the nearest hidden gem for gems', () => {
    const after = resolveEncounter(s('map', { gems: 5 }), true);
    expect(after.gems).toBe(5 - MAP_GEMS);
    expect(after.visited).toContain(30);
  });

  it('the echo flags a danger or costs an arrow', () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 40; seed++) {
      const after = resolveEncounter(s('echo', { runSeed: seed, attack: 3, marked: [], visited: [0] }), true);
      seen.add(after.encounter!.outcome!);
      if (after.encounter?.outcome === 'win') expect(after.marked).toEqual([12]);
      else expect(after.attack).toBe(2);
    }
    expect(seen).toEqual(new Set(['win', 'lose']));
  });

  it('the smith melts the shield into arrows, and needs one', () => {
    const after = resolveEncounter(s('smith', { shield: true, attack: 1 }), true);
    expect(after.shield).toBe(false);
    expect(after.attack).toBe(1 + SMITH_ARROWS);
    expect(canTake('smith', s('smith', { shield: false }))).toBe(false);
  });
});
