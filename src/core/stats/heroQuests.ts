import type { RunResult } from './runStats';

/**
 * Hero challenges: three per hero, each asking to play that hero's way in a single run (Vael reads the cave, Sera hunts, Borin
 * holds the line, Auric hoards, Mira explores, Bram blows things up). Each pays embers once; all three earn the hero's own title
 * and frame. Kept as one bitmask per hero (bit k = challenge k done).
 */
export interface HeroQuest {
  /** Interpolated into its text (`quest.<hero>.<k>`). */
  n: number;
  done: (run: RunResult) => boolean;
}

export const QUEST_EMBERS = 50;
export const QUESTS_PER_HERO = 3;

const slain = (run: RunResult, beast: string) => run.slain?.[beast] ?? 0;
const slainTotal = (run: RunResult) => Object.values(run.slain ?? {}).reduce((sum: number, n) => sum + (n ?? 0), 0);
const scenes = (run: RunResult, id: string, outcome?: string) => (run.encounters ?? []).filter(e => e.id === id && (!outcome || e.outcome === outcome)).length;
const won = (run: RunResult) => run.victory === true && (run.mode ?? 'expedition') !== 'endless';

export const HERO_QUESTS: readonly (readonly [HeroQuest, HeroQuest, HeroQuest])[] = [
  // Vael, the tracker
  [
    { n: 6, done: r => r.level >= 6 },
    { n: 2, done: r => (r.secrets ?? 0) >= 2 },
    { n: 2, done: r => won(r) && (r.ascension ?? 0) >= 2 },
  ],
  // Sera, the archer
  [
    { n: 8, done: r => slainTotal(r) >= 8 },
    { n: 3, done: r => slain(r, 'stalker') >= 3 },
    { n: 0, done: won },
  ],
  // Borin, the bulwark
  [
    { n: 8, done: r => r.level >= 8 },
    { n: 1, done: r => slain(r, 'brute') >= 1 },
    { n: 2, done: r => won(r) && (r.ascension ?? 0) >= 2 },
  ],
  // Auric, the gold-seeker
  [
    { n: 25, done: r => (r.gems ?? 0) >= 25 },
    { n: 1, done: r => scenes(r, 'gambler', 'win') >= 1 },
    { n: 40, done: r => won(r) && (r.gems ?? 0) >= 40 },
  ],
  // Mira, the lamplighter
  [
    { n: 1, done: r => (r.secrets ?? 0) >= 1 },
    { n: 2, done: r => (r.encounters ?? []).length >= 2 },
    { n: 12, done: r => won(r) && r.time !== undefined && r.time < 12 * 60 },
  ],
  // Bram, the artillerist
  [
    { n: 5, done: r => slain(r, 'enemy') >= 5 },
    { n: 1, done: r => scenes(r, 'miner') >= 1 && (r.encounters ?? []).some(e => e.id === 'miner' && e.outcome !== 'skip') },
    { n: 0, done: won },
  ],
];

export const questDone = (mask: number | undefined, k: number): boolean => ((mask ?? 0) & (1 << k)) !== 0;
export const allQuestsDone = (mask: number | undefined): boolean => [0, 1, 2].every(k => questDone(mask, k));

/** The challenges a run completes for its hero (indices), given what was already done. */
export function newQuests(masks: readonly number[] | undefined, run: RunResult): number[] {
  const hero = run.heroIndex;
  if (hero === undefined || !HERO_QUESTS[hero] || run.progressed === false) return [];
  const mask = masks?.[hero] ?? 0;
  return HERO_QUESTS[hero].map((q, k) => (!questDone(mask, k) && q.done(run) ? k : -1)).filter(k => k >= 0);
}

/** The masks with those challenges marked done. */
export function withQuests(masks: readonly number[] | undefined, hero: number, done: readonly number[]): number[] {
  const out = Array.from({ length: HERO_QUESTS.length }, (_, i) => masks?.[i] ?? 0);
  for (const k of done) out[hero] |= 1 << k;
  return out;
}

export function parseQuests(raw: unknown): number[] {
  return Array.from({ length: HERO_QUESTS.length }, (_, i) => {
    const v = Array.isArray(raw) ? raw[i] : 0;
    return Number.isInteger(v) && v >= 0 && v < 8 ? v : 0;
  });
}
