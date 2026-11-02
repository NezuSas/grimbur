import { TECHNIQUES } from '../../src/core/puzzles/techniques';
import { deductionRounds, provenMarks } from '../../src/core/engine/solver';
import { hintReason } from '../../src/core/puzzles/hintReason';

describe("the Manual's deduction techniques", () => {
  it.each(TECHNIQUES.map(x => [x.id, x] as const))('%s opens on the move it teaches and is solvable by reading the clues', (id, x) => {
    const p = x.puzzle;
    expect(deductionRounds(p.rows, p.cols, p.entities, p.visited)).toBeGreaterThan(0);
    const marks = provenMarks(p.rows, p.cols, p.entities, p.visited);
    const seen = new Set(p.visited);
    const gem = p.entities.find(e => e.type === 'coin')!.index;
    const isNear = (i: number) => p.visited.some(v => Math.abs(Math.floor(v / p.cols) - Math.floor(i / p.cols)) + Math.abs((v % p.cols) - (i % p.cols)) === 1);
    const firstSafe = [...marks].filter(([i, m]) => m === 'safe' && !seen.has(i) && i !== gem && isNear(i)).map(([i]) => i);
    const dangers = [...marks].filter(([, m]) => m === 'danger').map(([i]) => i);
    expect(firstSafe.length).toBeGreaterThan(0);
    const kinds = new Set(firstSafe.map(t => hintReason(p.rows, p.cols, p.entities, p.visited, t).kind));
    expect([...kinds]).toEqual([id === 'quiet' ? 'empty' : 'full']);
    if (id === 'quiet') expect(dangers).toEqual([]);
    else expect(dangers.length).toBeGreaterThan(0);
    // A planted flag is on a real danger.
    for (const f of x.flags) expect(p.entities.some(e => e.index === f && e.type !== 'coin')).toBe(true);
  });
});
