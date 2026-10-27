import { buildRouteGrid, compressRow, ROUTE_ROW_MAX, type RouteMark } from '../../src/screens/game/routeGrid';
import { routeFloors, trackRoute, type RouteLog } from '../../src/screens/game/useRouteLog';

type Seen = Parameters<typeof trackRoute>[1];
const start: Seen = { level: 1, turn: 0, playerIndex: 0, visited: [0], totalCoins: 0, attack: 3, vortexCost: null };

/** Plays a list of states through the tracker, from the start of a run. */
const play = (...states: Partial<Seen>[]) => {
  let log: RouteLog = {};
  let prev = start;
  for (const change of states) {
    const next = { ...prev, ...change };
    log = trackRoute(log, prev, next);
    prev = next;
  }
  return { log, level: prev.level };
};

describe('the route tracker', () => {
  it('records new tiles, gems and shots, and skips steps back onto known tiles', () => {
    const { log, level } = play(
      { turn: 1, playerIndex: 1, visited: [0, 1] },
      { turn: 2, playerIndex: 2, visited: [0, 1, 2], totalCoins: 1 },
      { turn: 2, playerIndex: 1 }, // walking back costs no turn and shows nothing
      { turn: 3, attack: 2 },
    );
    expect(routeFloors(log, level)).toEqual([['tile', 'gem', 'arrow']]);
  });

  it('a vortex that eats an arrow is not a shot', () => {
    const { log, level } = play({ turn: 1, playerIndex: 5, visited: [0, 5], attack: 2, vortexCost: 'arrow' });
    expect(routeFloors(log, level)).toEqual([['tile']]);
  });

  it('starts a line per floor', () => {
    const { log, level } = play(
      { turn: 1, playerIndex: 1, visited: [0, 1] },
      { level: 2, turn: 0, playerIndex: 0, visited: [0] },
      { turn: 1, attack: 2 },
    );
    expect(routeFloors(log, level)).toEqual([['tile'], ['arrow']]);
  });

  it('an undo or a revive forgets what came after the turn it goes back to', () => {
    const { log, level } = play(
      { turn: 1, playerIndex: 1, visited: [0, 1] },
      { turn: 2, playerIndex: 2, visited: [0, 1, 2] },
      { turn: 1, playerIndex: 1, visited: [0, 1] },
    );
    expect(routeFloors(log, level)).toEqual([['tile']]);
  });

  it('a new run starts an empty route', () => {
    const { log, level } = play(
      { level: 2, turn: 0 },
      { turn: 1, playerIndex: 1, visited: [0, 1] },
      { level: 1, turn: 0, playerIndex: 0, visited: [0] },
    );
    expect(routeFloors(log, level)).toEqual([[]]);
  });
});

const tiles = (n: number): RouteMark[] => Array.from({ length: n }, () => 'tile');

describe('the daily route grid', () => {
  it('draws one line per floor, in the order played, ending in a skull on a defeat', () => {
    expect(buildRouteGrid([['tile', 'gem', 'tile'], ['tile', 'arrow']], 'defeat')).toBe('🟫💎🟫\n🟫🏹💀');
  });

  it('crowns a victory', () => {
    expect(buildRouteGrid([['tile'], ['arrow', 'arrow']], 'victory')).toBe('🟫\n🏹🏹👑');
  });

  it('keeps every line within ten squares, the skull included', () => {
    const grid = buildRouteGrid([tiles(30), tiles(30)], 'defeat');
    for (const line of grid.split('\n')) expect(Array.from(line)).toHaveLength(ROUTE_ROW_MAX);
    expect(grid.endsWith('💀')).toBe(true);
  });

  it('thins plain tiles before gems and arrows, keeping the order', () => {
    const marks: RouteMark[] = [...tiles(6), 'gem', ...tiles(6), 'arrow', ...tiles(6)];
    const row = compressRow(marks, 10);
    expect(row).toHaveLength(10);
    expect(row.filter(m => m !== 'tile')).toEqual(['gem', 'arrow']);
    expect(row[0]).toBe('tile');
    expect(row[row.length - 1]).toBe('tile');
  });

  it('thins gems and arrows too when even they overflow', () => {
    const row = compressRow(Array.from({ length: 14 }, (_, i): RouteMark => (i % 2 ? 'gem' : 'arrow')), 10);
    expect(row).toHaveLength(10);
    expect(row).not.toContain('tile');
  });

  it('leaves out floors with nothing recorded, but not the one the run ended on', () => {
    expect(buildRouteGrid([[], ['tile'], []], 'defeat')).toBe('🟫\n💀');
    expect(buildRouteGrid([[], []], 'defeat')).toBe('');
    expect(buildRouteGrid([], 'victory')).toBe('');
  });
});
