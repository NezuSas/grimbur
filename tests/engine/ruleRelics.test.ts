import { gameReducer } from '../../src/core/engine/reducer';
import { RelicId, gamblerRoll, OWL_EVERY } from '../../src/core/engine/relics';
import { GAME_CONFIG } from '../../src/config/gameConfig';
import type { GameEntity, GameState } from '../../src/core/engine/types';
import { coin, createState, enemy, pit } from '../helpers/state';

const stalker = (index: number, charge = 0): GameEntity => ({ index, type: 'stalker', charge });
const withRelics = (relics: RelicId[], entities: GameEntity[], extra: Partial<GameState> = {}): GameState => ({
  ...createState({ entities }),
  relics,
  ...extra,
});
const nextFloor = (entities: GameEntity[]) => ({ rows: 6, cols: 9, entities, coins: entities.filter(e => e.type === 'coin').length, attack: 3, seed: 5 });
const levelUp = (s: GameState, entities: GameEntity[] = [coin(30)]) =>
  gameReducer({ ...s, isLevelUp: true }, { type: 'LEVEL_UP', payload: nextFloor(entities) });
const reach = { arrowReach: 3 } as const;

describe('the relics that change the rules', () => {
  it('Echo Arrow gives the arrow back for a kill from afar, not from beside', () => {
    const far = withRelics(['echo_arrow'], [coin(100), enemy(2)]);
    const farShot = gameReducer({ ...far, perks: { ...far.perks, ...reach } }, { type: 'ATTACK', direction: 'RIGHT' });
    expect(farShot.entityMap[2]).toBeUndefined();
    expect(farShot.attack).toBe(far.attack);

    const near = withRelics(['echo_arrow'], [coin(100), enemy(1)]);
    const nearShot = gameReducer({ ...near, perks: { ...near.perks, ...reach } }, { type: 'ATTACK', direction: 'RIGHT' });
    expect(nearShot.entityMap[1]).toBeUndefined();
    expect(nearShot.attack).toBe(near.attack - 1);
  });

  it('Piercing Head slays the guardian behind the first one', () => {
    const s = withRelics(['piercing'], [coin(100), enemy(1), enemy(2)]);
    const shot = gameReducer({ ...s, perks: { ...s.perks, ...reach } }, { type: 'ATTACK', direction: 'RIGHT' });
    expect(shot.entityMap[1]).toBeUndefined();
    expect(shot.entityMap[2]).toBeUndefined();

    const plain = withRelics([], [coin(100), enemy(1), enemy(2)]);
    expect(gameReducer({ ...plain, perks: { ...plain.perks, ...reach } }, { type: 'ATTACK', direction: 'RIGHT' }).entityMap[2]).toBeDefined();
  });

  it('the Gem Magnet takes the gems beside the hero, and the last one clears the floor', () => {
    const s = withRelics(['magnet'], [coin(2), coin(100)]);
    const moved = gameReducer(s, { type: 'MOVE', direction: 'RIGHT' });
    expect(moved.entityMap[2]).toBeUndefined();
    expect(moved.coins).toBe(1);
    expect(moved.visited).toContain(2);

    const last = withRelics(['magnet'], [coin(2)]);
    expect(gameReducer(last, { type: 'MOVE', direction: 'RIGHT' }).isLevelUp).toBe(true);
  });

  it("the Raven's Eye marks the danger nearest the start of each floor", () => {
    const s = levelUp(withRelics(['raven_eye'], [coin(100)]), [coin(30), enemy(12), pit(40)]);
    expect(s.marked).toEqual([12]);
    expect(levelUp(withRelics([], [coin(100)]), [coin(30), enemy(12)]).marked).toEqual([]);
  });

  it('Thorn Mail kills the stalker that strikes into the shield', () => {
    const every = GAME_CONFIG.stalker.moveEvery;
    const s = withRelics(['thorns'], [coin(100), stalker(16, 1)], { shield: true, turn: every - 1 });
    const after = gameReducer(s, { type: 'MOVE', direction: 'RIGHT' });
    expect(after.isGameOver).toBe(false);
    expect(after.shield).toBe(false);
    expect(after.entities.some(e => e.type === 'stalker')).toBe(false);
  });

  it('the Powder Belt adds a bomb on every floor and when it is picked', () => {
    const s = levelUp(withRelics(['bomb_belt'], [coin(100)]));
    expect(s.items.bomb).toBe(1);
  });

  it('the Owl Totem gives a detector charge every twelve tiles explored', () => {
    const visited = Array.from({ length: OWL_EVERY - 1 }, (_, i) => i);
    const s = withRelics(['owl'], [coin(100)], { visited, playerIndex: 0 });
    const after = gameReducer(s, { type: 'MOVE', direction: 'DOWN' });
    expect(after.items.detector).toBe(s.items.detector + 1);
    expect(gameReducer({ ...s, relics: [] }, { type: 'MOVE', direction: 'DOWN' }).items.detector).toBe(s.items.detector);
  });

  it('the Void Compass lets vortexes pass for free', () => {
    const s = withRelics(['toll_free'], [coin(100), pit(1)]);
    const after = gameReducer(s, { type: 'MOVE', direction: 'RIGHT' });
    expect(after.wasTeleported).toBe(true);
    expect(after.attack).toBe(s.attack);
    expect(after.vortexCost).toBeNull();
  });

  it("the Trickster's Dice add three arrows or take one, never below one", () => {
    const base = levelUp(withRelics([], [coin(100)]));
    const s0 = withRelics(['gambler'], [coin(100)]);
    const rolled = levelUp(s0);
    expect(rolled.attack - base.attack).toBe(gamblerRoll(s0.runSeed, s0.level + 1));
    const rolls = new Set(Array.from({ length: 40 }, (_, f) => gamblerRoll(7, f)));
    expect(rolls).toEqual(new Set([3, -1]));
  });
});
