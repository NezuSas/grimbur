/**
 * How long a floor takes to generate. The generator tries up to 40 boards (each checked by a solver) to find a fair one, so
 * this is the work that runs between floors. Run: npx tsx scripts/benchGenerator.ts [seedsPerFloor]
 */
import { generateBoard } from '../src/core/engine/generator';
import { omenFor } from '../src/core/engine/omens';
import { biomeFor } from '../src/core/engine/biomes';
import { isLairFloor } from '../src/core/engine/lair';

const SEEDS = Number(process.argv[2] ?? 40);

function time<T>(fn: () => T): [T, number] {
  const t = process.hrtime.bigint();
  const out = fn();
  return [out, Number(process.hrtime.bigint() - t) / 1e6];
}

// warm up the JIT so the first floor is not unfairly slow
for (let i = 0; i < 20; i++) generateBoard(5, 1000 + i);

const rows: string[] = [];
let worst = { ms: 0, level: 0, seed: 0, mode: '' };
for (const mode of ['expedition', 'endless'] as const) {
  const last = mode === 'expedition' ? 10 : 40;
  for (let level = 1; level <= last; level++) {
    const ms: number[] = [];
    for (let s = 0; s < SEEDS; s++) {
      const runSeed = 777 + s * 131;
      const seed = runSeed + level * 17;
      const [, took] = time(() =>
        generateBoard(level, seed, {
          boss: isLairFloor(mode, level),
          ascension: s % 6,
          omen: omenFor(runSeed, level, mode),
          biome: biomeFor(level, mode),
          endless: mode === 'endless',
        }),
      );
      ms.push(took);
      if (took > worst.ms) worst = { ms: took, level, seed, mode };
    }
    ms.sort((a, b) => a - b);
    const avg = ms.reduce((a, b) => a + b, 0) / ms.length;
    rows.push(`${mode.padEnd(10)} floor ${String(level).padStart(2)}  avg ${avg.toFixed(1).padStart(6)} ms   p90 ${ms[Math.floor(ms.length * 0.9)].toFixed(1).padStart(6)} ms   max ${ms[ms.length - 1].toFixed(1).padStart(6)} ms`);
  }
}
console.log(rows.join('\n'));
console.log(`\nWorst single floor: ${worst.ms.toFixed(1)} ms (${worst.mode}, floor ${worst.level}, seed ${worst.seed})`);
