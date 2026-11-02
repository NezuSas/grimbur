import { ENCOUNTERS, ENCOUNTER_CHANCE, ENCOUNTER_CHANCE_WANDERERS, encounterFor, resolveEncounter } from '../../src/core/engine/encounters';
import { EMPTY_ENCOUNTER_BOOK, addRunEncounters, parseEncounterBook } from '../../src/core/stats/encounterBook';
import { EMPTY_STATS, mergeRun } from '../../src/core/stats/runStats';
import { newAchievements } from '../../src/core/stats/achievements';
import { coin, createState } from '../helpers/state';

describe('the encounter journal', () => {
  it('logs every scene a run meets, taken or walked past', () => {
    const s = { ...createState({ entities: [coin(30)] }), level: 3, runSeed: 5, encounter: { id: 'spring' as const } };
    const after = resolveEncounter(s, false);
    expect(after.encounterLog).toEqual([{ id: 'spring', outcome: 'skip', floor: 3 }]);
  });

  it('adds a run to the book and counts gambles won and miners freed', () => {
    const book = addRunEncounters(EMPTY_ENCOUNTER_BOOK, [
      { id: 'gambler', outcome: 'win' },
      { id: 'gambler', outcome: 'lose' },
      { id: 'miner', outcome: 'win' },
      { id: 'scout', outcome: 'skip' },
      { id: 'nope', outcome: 'win' },
    ]);
    expect(book).toEqual({ seen: ['gambler', 'miner', 'scout'], gamblesWon: 1, minersFreed: 1 });
    expect(parseEncounterBook(JSON.parse(JSON.stringify(book)))).toEqual(book);
    expect(parseEncounterBook('x')).toEqual(EMPTY_ENCOUNTER_BOOK);
  });

  it('unlocks the journal achievements', () => {
    const run = { score: 0, level: 3, encounters: ENCOUNTERS.map(id => ({ id, outcome: 'skip' })) };
    const merged = mergeRun(EMPTY_STATS, run).stats;
    expect(newAchievements(merged, run)).toContain('enc_all');
  });

  it('crowds the week of the wanderers with scenes', () => {
    let plain = 0;
    let crowded = 0;
    for (let seed = 1; seed <= 400; seed++) {
      if (encounterFor(seed, 4, 'expedition')) plain++;
      if (encounterFor(seed, 4, 'expedition', 'wanderers')) crowded++;
    }
    expect(plain / 400).toBeCloseTo(ENCOUNTER_CHANCE, 1);
    expect(crowded / 400).toBeCloseTo(ENCOUNTER_CHANCE_WANDERERS, 1);
  });
});
