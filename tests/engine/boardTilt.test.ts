import { makeTilt, projectPoint, unprojectPoint, TILT_FIT } from '../../src/ui/layout/boardTilt';

describe('tilted board', () => {
  const tile = 64;
  const t = makeTilt(8 * tile, 5 * tile, tile);

  it('turns a drawn point back into the flat point it shows', () => {
    for (const [x, y] of [[0, 0], [100, 37], [8 * tile, 5 * tile], [256, 160], [500, 300]]) {
      const drawn = projectPoint(t, x, y);
      const back = unprojectPoint(t, drawn.x, drawn.y);
      expect(back.x).toBeCloseTo(x, 6);
      expect(back.y).toBeCloseTo(y, 6);
    }
  });

  it('draws the back row smaller than the front one, and keeps the board inside its box', () => {
    const backWidth = projectPoint(t, 8 * tile, 0).x - projectPoint(t, 0, 0).x;
    const frontWidth = projectPoint(t, 8 * tile, 5 * tile).x - projectPoint(t, 0, 5 * tile).x;
    expect(backWidth).toBeLessThan(frontWidth);
    expect(backWidth / frontWidth).toBeGreaterThan(0.8);
    expect(projectPoint(t, 0, 0).y).toBeGreaterThanOrEqual(0);
    expect(t.lipTop + t.lipHeight).toBeLessThanOrEqual(5 * tile + 0.5);
    expect(frontWidth).toBeCloseTo(8 * tile * TILT_FIT.width, 4);
  });

  it('finds the tile under a tap on the drawn centre of every tile', () => {
    for (let row = 0; row < 5; row++)
      for (let col = 0; col < 8; col++) {
        const drawn = projectPoint(t, (col + 0.5) * tile, (row + 0.5) * tile);
        const flat = unprojectPoint(t, drawn.x, drawn.y);
        expect(Math.floor(flat.x / tile)).toBe(col);
        expect(Math.floor(flat.y / tile)).toBe(row);
      }
  });
});
