import { ALL_FEATURES, featuresFor } from '../../src/core/engine/newcomer';
import { gameReducer } from '../../src/core/engine/reducer';
import { coin, createState } from '../helpers/state';

describe("a newcomer's first runs", () => {
  it('meet the extras one run at a time, in expeditions only', () => {
    expect(featuresFor(0, 'expedition', false)).toEqual({ secrets: false, encounters: false });
    expect(featuresFor(1, 'expedition', false)).toEqual({ secrets: true, encounters: false });
    expect(featuresFor(2, 'expedition', false)).toEqual(ALL_FEATURES);
    // The daily, challenges and duels stay the same cave for everyone.
    expect(featuresFor(0, 'daily', false)).toEqual(ALL_FEATURES);
    expect(featuresFor(0, 'expedition', true)).toEqual(ALL_FEATURES);
  });

  it('keep the secret room off the floor and no scene opens', () => {
    const reset = gameReducer(createState(), {
      type: 'RESET', character: { playerName: 'T' } as never, rows: 5, cols: 8, seed: 1, attack: 3, coins: 1,
      entities: [coin(30), { index: 12, type: 'secret' }], features: { secrets: false, encounters: false },
    });
    expect(reset.secret).toBeNull();
    let s = { ...reset, isLevelUp: true, runSeed: 1 };
    for (let seed = 1; seed <= 60; seed++) {
      const next = gameReducer({ ...s, runSeed: seed }, { type: 'LEVEL_UP', payload: { rows: 5, cols: 8, entities: [coin(30)], coins: 1, attack: 3 } });
      expect(next.encounter ?? null).toBeNull();
    }
  });
});
