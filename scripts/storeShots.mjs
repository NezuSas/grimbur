// Regenerates the Google Play screenshots (docs/release/store/screenshots, Spanish, and en/, English) from the running
// web build (`npm run start:lan` or `npm run web`). 1920x1080 each (1280x720 at 1.5x), recipes as in that folder's README.
//
//   node scripts/storeShots.mjs [es|en|both] [only=01,03]
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'docs', 'release', 'store', 'screenshots');
// The dev harness only exists in a development build: point SHOT_BASE at a dev server when the main one runs --no-dev.
const BASE = process.env.SHOT_BASE ?? 'http://localhost:8081';
const WAIT_MS = 180000; // the most to wait: shot.mjs fires as soon as the page has finished loading
const PARALLEL = 2;

const lesson = (biome, entities) => ({ screen: 'LessonScreen', params: { lesson: 'deduce', devHideBanner: true, devBiome: biome, devEntities: entities } });
const RECIPES = {
  '01_grimbur_and_guardians': lesson('magma', [
    { index: 4, type: 'boss', hp: 3 }, { index: 9, type: 'enemy' }, { index: 20, type: 'enemy' }, { index: 16, type: 'stalker' },
    { index: 13, type: 'sleeper' }, { index: 7, type: 'pit' }, { index: 11, type: 'coin' }, { index: 18, type: 'coin' }, { index: 22, type: 'shield' },
  ]),
  '02_read_the_clues': lesson('crystal', [
    { index: 10, type: 'enemy' }, { index: 21, type: 'enemy' }, { index: 8, type: 'pit' }, { index: 5, type: 'coin' }, { index: 17, type: 'coin' }, { index: 12, type: 'coin' },
  ]),
  '03_cover': { screen: 'CoverScreen' },
  '04_hero_mira': { screen: 'CharactersScreen', params: { devHero: 4 } },
  '05_hero_bram': { screen: 'CharactersScreen', params: { devHero: 5 } },
  '06_forge': { screen: 'ForgeScreen' },
  '07_progress': { screen: 'ProgressScreen' },
  '08_achievements': { screen: 'AchievementsScreen' },
};

const [langArg = 'both', onlyArg] = process.argv.slice(2);
const langs = langArg === 'both' ? ['es', 'en'] : [langArg];
const only = onlyArg?.startsWith('only=') ? onlyArg.slice(5).split(',') : null;
const jobs = [];
for (const lang of langs) {
  for (const [name, r] of Object.entries(RECIPES)) {
    if (only && !only.some(p => name.startsWith(p))) continue;
    let url = `${BASE}/?screen=${r.screen}&preset=veteran&lang=${lang}`;
    if (r.params) url += `&params=${encodeURIComponent(JSON.stringify(r.params))}`;
    jobs.push({ out: join(OUT, ...(lang === 'en' ? ['en'] : []), `${name}.png`), url });
  }
}

const run = job => new Promise(resolve => {
  const child = spawn(process.execPath, [join(ROOT, 'scripts', 'shot.mjs'), job.out, '1280x720', 'x', String(WAIT_MS), '1.5'], { env: { ...process.env, SHOT_URL: job.url }, stdio: 'inherit' });
  child.on('exit', resolve);
});
const queue = [...jobs];
await Promise.all(Array.from({ length: PARALLEL }, async () => {
  while (queue.length) await run(queue.shift());
}));
console.log(`${jobs.length} screenshots`);
