import { gameReducer } from '../../src/core/engine/reducer';
import { coinValue, killValue, levelClearBonus } from '../../src/core/engine/scoring';
import { GAME_CONFIG } from '../../src/config/gameConfig';
import { coin, createState, enemy } from '../helpers/state';

describe('scoring', () => {
  it('scales coin value and clear bonus with the level', () => {
    expect(coinValue(1)).toBe(GAME_CONFIG.coins.value);
    expect(coinValue(6)).toBe(200);
    expect(levelClearBonus(1)).toBe(GAME_CONFIG.scoring.levelClear);
    expect(levelClearBonus(6)).toBe(1000);
  });

  it('multiplies kill value by the combo', () => {
    expect(killValue(1)).toBe(250);
    expect(killValue(3)).toBe(750);
  });

  // The UI shows these exact values in floating popups, so the reducer must award them.
  it('reducer awards exactly what the helpers report', () => {
    const killState = createState({ entities: [enemy(1), coin(100)], attack: 3 });
    const afterKill = gameReducer({ ...killState, score: 0 }, { type: 'ATTACK' });
    expect(afterKill.score).toBe(killValue(afterKill.enemyCombo));

    const coinState = { ...createState({ entities: [coin(1), coin(100)] }), level: 4, score: 1000 };
    const afterCoin = gameReducer(coinState, { type: 'MOVE', direction: 'RIGHT' });
    const stepAndTile = GAME_CONFIG.scoring.stepCost + GAME_CONFIG.scoring.newTile;
    expect(afterCoin.score - 1000 - stepAndTile).toBe(coinValue(4));
  });
});
