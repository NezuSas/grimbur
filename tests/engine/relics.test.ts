import { gameReducer } from '../../src/core/engine/reducer';
import { ALL_RELICS, RELICS, RelicId, draftRelics, relicCount } from '../../src/core/engine/relics';
import { GAME_CONFIG } from '../../src/config/gameConfig';
import { boss, coin, createState, enemy, trap } from '../helpers/state';

const move = (direction: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => ({ type: 'MOVE', direction }) as const;
const nextFloor = { rows: 6, cols: 9, entities: [coin(30)], coins: 1, attack: 3, seed: 5 };
const withRelics = (relics: RelicId[], extra: object = {}) => ({ ...createState({ entities: [coin(100), enemy(2)] }), relics, ...extra });

describe('draftRelics', () => {
  it('offers three different relics, deterministically', () => {
    const a = draftRelics(1234, 3, []);
    expect(a).toHaveLength(3);
    expect(new Set(a).size).toBe(3);
    expect(draftRelics(1234, 3, [])).toEqual(a);
  });

  it('differs between floors and runs', () => {
    const seen = new Set<string>();
    for (let floor = 1; floor <= 9; floor++) seen.add(draftRelics(99, floor, []).join(','));
    expect(seen.size).toBeGreaterThan(3);
    expect(draftRelics(1, 2, [])).not.toEqual(draftRelics(2, 2, []));
  });

  it('never offers a relic that is already at its stack limit', () => {
    const owned: RelicId[] = ['phoenix', 'iron_boots', 'lantern', 'long_bow', 'bulwark', 'frost', 'trap_sense'];
    for (let floor = 1; floor <= 20; floor++) {
      for (const id of draftRelics(7, floor, owned)) {
        expect(relicCount(owned, id)).toBeLessThan(RELICS[id].max);
      }
    }
  });

  it('shrinks the offer when almost everything is owned', () => {
    const everything = ALL_RELICS.flatMap(id => Array(RELICS[id].max).fill(id)) as RelicId[];
    expect(draftRelics(1, 1, everything)).toEqual([]);
  });
});

describe('the draft flow', () => {
  it('opens a draft when a floor is cleared and blocks play until a relic is picked', () => {
    const state = gameReducer({ ...createState(), isLevelUp: true }, { type: 'LEVEL_UP', payload: nextFloor });
    expect(state.pendingDraft).toHaveLength(3);

    expect(gameReducer(state, move('RIGHT'))).toBe(state);
    expect(gameReducer(state, { type: 'ATTACK' })).toBe(state);
  });

  it('adds the chosen relic, closes the draft and resumes play', () => {
    let state = gameReducer({ ...createState(), isLevelUp: true }, { type: 'LEVEL_UP', payload: nextFloor });
    const choice = state.pendingDraft![1];

    state = gameReducer(state, { type: 'PICK_RELIC', id: choice });
    expect(state.relics).toEqual([choice]);
    expect(state.pendingDraft).toBeNull();
    expect(gameReducer(state, move('RIGHT')).playerIndex).toBe(1);
  });

  it('ignores a relic that was not on offer', () => {
    const state = gameReducer({ ...createState(), isLevelUp: true }, { type: 'LEVEL_UP', payload: nextFloor });
    const notOffered = ALL_RELICS.find(id => !state.pendingDraft!.includes(id))!;
    expect(gameReducer(state, { type: 'PICK_RELIC', id: notOffered })).toBe(state);
    expect(gameReducer({ ...state, pendingDraft: null }, { type: 'PICK_RELIC', id: 'quiver' }).relics).toEqual([]);
  });

  it('offers the same draft to everyone on the same daily run', () => {
    const a = gameReducer({ ...createState({ seed: 77 }), isLevelUp: true }, { type: 'LEVEL_UP', payload: nextFloor });
    const b = gameReducer({ ...createState({ seed: 77 }), isLevelUp: true }, { type: 'LEVEL_UP', payload: nextFloor });
    expect(a.pendingDraft).toEqual(b.pendingDraft);
  });

  it('offers no draft after the victory (the run is over)', () => {
    const won = gameReducer(createState({ entities: [boss(1, 1)], coins: 0, attack: 3 }), { type: 'ATTACK' });
    expect(won.isVictory).toBe(true);
    expect(won.pendingDraft).toBeNull();
  });
});

describe('relic effects', () => {
  const pick = (relics: RelicId[], id: RelicId) =>
    gameReducer({ ...withRelics(relics), pendingDraft: [id, 'greed', 'frost'] }, { type: 'PICK_RELIC', id });

  it('Bottomless Quiver: +2 arrows now and +1 on every later floor', () => {
    const now = pick([], 'quiver');
    expect(now.attack).toBe(3 + 2);

    const later = gameReducer({ ...now, attack: 0, isLevelUp: true }, { type: 'LEVEL_UP', payload: nextFloor });
    expect(later.attack).toBe(nextFloor.attack + 1);
  });

  it('Lucky Coin stacks +25% per copy on gems', () => {
    const base = { ...createState({ entities: [coin(1), coin(100)] }), score: 1000 };
    const one = gameReducer({ ...base, relics: ['lucky_coin'] }, move('RIGHT')).score - 1000;
    const two = gameReducer({ ...base, relics: ['lucky_coin', 'lucky_coin'] }, move('RIGHT')).score - 1000;
    const none = gameReducer(base, move('RIGHT')).score - 1000;

    expect(one - none).toBe(Math.round(GAME_CONFIG.coins.value * 1.25) - GAME_CONFIG.coins.value);
    expect(two - none).toBe(Math.round(GAME_CONFIG.coins.value * 1.5) - GAME_CONFIG.coins.value);
  });

  it('Iron Boots: walking is free', () => {
    const base = { ...createState(), score: 1000 };
    const free = gameReducer({ ...base, relics: ['iron_boots'] }, move('RIGHT')).score;
    const paid = gameReducer(base, move('RIGHT')).score;
    expect(free - paid).toBe(-GAME_CONFIG.scoring.stepCost);
  });

  it('Old Lantern explores the area around the spawn on every floor and when picked', () => {
    const floor = gameReducer({ ...withRelics(['lantern']), isLevelUp: true }, { type: 'LEVEL_UP', payload: nextFloor });
    expect(floor.visited).toContain(0);
    expect(floor.visited).toContain(3); // 3 tiles to the right
    expect(floor.visited).not.toContain(4);

    const picked = pick([], 'lantern');
    expect(picked.visited.length).toBeGreaterThan(1);
  });

  it('Phoenix Feather soaks one deadly touch and is then consumed', () => {
    const start = withRelics(['phoenix'], { entities: [enemy(1), coin(100)] });
    const state = { ...createState({ entities: [enemy(1), coin(100)] }), relics: ['phoenix'] as RelicId[] };
    const survived = gameReducer(state, move('RIGHT'));

    expect(start.relics).toContain('phoenix');
    expect(survived.isGameOver).toBe(false);
    expect(survived.relics).toEqual([]);
    expect(survived.entityMap[1]).toBeUndefined();
  });

  it('a shield is spent before the Phoenix Feather', () => {
    const state = { ...createState({ entities: [enemy(1), coin(100)] }), relics: ['phoenix'] as RelicId[], shield: true };
    const survived = gameReducer(state, move('RIGHT'));
    expect(survived.shield).toBe(false);
    expect(survived.relics).toEqual(['phoenix']);
  });

  it('Phoenix also saves you from the Wumpus', () => {
    const state = { ...createState({ entities: [boss(1)], coins: 0 }), relics: ['phoenix'] as RelicId[] };
    const bounced = gameReducer(state, move('RIGHT'));
    expect(bounced.isGameOver).toBe(false);
    expect(bounced.relics).toEqual([]);
    expect(bounced.playerIndex).toBe(0);
  });

  it("Hunter's Mark raises the combo ceiling", () => {
    let state = { ...createState({ entities: [enemy(1), coin(100)], attack: 9 }), relics: ['hunter'] as RelicId[] };
    state = { ...state, enemyCombo: GAME_CONFIG.multipliers.maxCombo };
    expect(gameReducer(state, { type: 'ATTACK' }).enemyCombo).toBe(GAME_CONFIG.multipliers.maxCombo + 1);
  });

  it('Long Bow extends the arrow by one tile', () => {
    const base = createState({ entities: [enemy(2), coin(100)], attack: 3 });
    expect(gameReducer(base, { type: 'ATTACK' }).entityMap[2]).toBeDefined();
    expect(gameReducer({ ...base, relics: ['long_bow'] }, { type: 'ATTACK' }).entityMap[2]).toBeUndefined();
  });

  it('Bulwark arms a shield every floor and right away when picked', () => {
    expect(pick([], 'bulwark').shield).toBe(true);
    const floor = gameReducer({ ...withRelics(['bulwark']), isLevelUp: true }, { type: 'LEVEL_UP', payload: nextFloor });
    expect(floor.shield).toBe(true);
  });

  it('Dragon Hoard pays more for clearing a floor', () => {
    const base = { ...createState({ entities: [coin(1)] }), score: 1000 };
    const plain = gameReducer(base, move('RIGHT')).score;
    const rich = gameReducer({ ...base, relics: ['greed'] }, move('RIGHT')).score;
    expect(rich - plain).toBe(Math.round(GAME_CONFIG.scoring.levelClear * 0.5));
  });

  it('Frost Charm slows the Wumpus down', () => {
    const run = (relics: RelicId[]) => {
      let state = { ...createState({ entities: [boss(60)], coins: 0 }), relics };
      const start = state.entities[0].index;
      for (let i = 0; i < 2; i++) state = gameReducer(state, move('RIGHT'));
      return state.entities.find(e => e.type === 'boss')!.index !== start;
    };
    expect(run([])).toBe(true); // moves after the 2nd step
    expect(run(['frost'])).toBe(false); // needs 3
  });

  it('Trap Sense disarms traps without penalty', () => {
    const base = { ...createState({ entities: [trap(1), coin(100)] }), score: 1000, relics: ['trap_sense'] as RelicId[] };
    const next = gameReducer(base, move('RIGHT'));
    expect(next.score).toBe(1000 + GAME_CONFIG.scoring.stepCost + GAME_CONFIG.scoring.newTile);
    expect(next.lastPickup).toBeNull();
  });
});
