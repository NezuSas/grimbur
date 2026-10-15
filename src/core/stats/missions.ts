import { createPRNG } from '../random/prng';

/**
 * Missions: small goals that give a reason to play today and this week. Three daily ones (an easy, a medium and a hard) and
 * two weekly ones, chosen from the local date alone (so they never depend on a server), each paying embers when claimed.
 * Everything here is pure: the stats service feeds it every finished run.
 */
export type MissionMetric =
  | 'runs' // runs finished (adds up)
  | 'gems' // gems collected (adds up)
  | 'wins' // expeditions or dailies won (adds up)
  | 'daily' // daily challenges played (adds up)
  | 'floor' // deepest floor reached in ONE run (best of)
  | 'score' // best score of ONE run (best of)
  | 'relics' // most relics held in ONE run (best of)
  | 'heroes'; // different heroes played (a set)

export type MissionTier = 'easy' | 'medium' | 'hard';

export interface MissionDef {
  id: string;
  metric: MissionMetric;
  target: number;
  tier: MissionTier;
  reward: number;
}

const d = (id: string, metric: MissionMetric, target: number, tier: MissionTier, reward: number): MissionDef => ({ id, metric, target, tier, reward });

export const DAILY_POOL: readonly MissionDef[] = [
  d('d_runs2', 'runs', 2, 'easy', 15),
  d('d_gems20', 'gems', 20, 'easy', 15),
  d('d_floor3', 'floor', 3, 'easy', 15),
  d('d_floor5', 'floor', 5, 'medium', 25),
  d('d_score1500', 'score', 1500, 'medium', 25),
  d('d_gems45', 'gems', 45, 'medium', 25),
  d('d_relics2', 'relics', 2, 'medium', 25),
  d('d_runs4', 'runs', 4, 'medium', 25),
  d('d_floor7', 'floor', 7, 'hard', 40),
  d('d_score3500', 'score', 3500, 'hard', 40),
  d('d_relics3', 'relics', 3, 'hard', 40),
  d('d_win', 'wins', 1, 'hard', 50),
];

export const WEEKLY_POOL: readonly MissionDef[] = [
  d('w_runs12', 'runs', 12, 'medium', 70),
  d('w_gems200', 'gems', 200, 'medium', 80),
  d('w_daily3', 'daily', 3, 'medium', 80),
  d('w_heroes3', 'heroes', 3, 'medium', 70),
  d('w_floor9', 'floor', 9, 'hard', 90),
  d('w_score6000', 'score', 6000, 'hard', 90),
  d('w_win', 'wins', 1, 'hard', 90),
];

/** Extra embers for finishing all three daily missions. */
export const DAILY_BONUS = 30;

export const MISSIONS: readonly MissionDef[] = [...DAILY_POOL, ...WEEKLY_POOL];
export const missionDef = (id: string): MissionDef | undefined => MISSIONS.find(m => m.id === id);

export interface MissionProgress {
  id: string;
  progress: number;
  claimed: boolean;
  /** For the `heroes` metric: the hero indices seen. */
  seen?: number[];
}

export interface MissionsState {
  /** The local day the daily missions belong to, and the Monday of the week the weekly ones do. */
  day: string | null;
  week: string | null;
  daily: MissionProgress[];
  weekly: MissionProgress[];
  /** The all-three bonus of today has been claimed. */
  bonusClaimed: boolean;
}

export const EMPTY_MISSIONS: MissionsState = { day: null, week: null, daily: [], weekly: [], bonusClaimed: false };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** The Monday (local) of the week a `YYYY-MM-DD` day belongs to. */
export function weekKeyOf(day: string): string {
  const [y, m, dd] = day.split('-').map(Number);
  const date = new Date(y, m - 1, dd);
  const back = (date.getDay() + 6) % 7; // Monday = 0
  date.setDate(date.getDate() - back);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) || 1;
}

function pickOne<T>(list: readonly T[], rnd: () => number): T {
  return list[Math.min(list.length - 1, Math.floor(rnd() * list.length))];
}

/** Today's three missions: one of each tier, the same for everyone on the same day. */
export function dailySelection(day: string): MissionDef[] {
  const rnd = createPRNG(hash(`daily:${day}`));
  return (['easy', 'medium', 'hard'] as const).map(tier => pickOne(DAILY_POOL.filter(m => m.tier === tier), rnd));
}

/** This week's two missions (never two of the same metric). */
export function weeklySelection(week: string): MissionDef[] {
  const rnd = createPRNG(hash(`weekly:${week}`));
  const first = pickOne(WEEKLY_POOL, rnd);
  const second = pickOne(WEEKLY_POOL.filter(m => m.id !== first.id && m.metric !== first.metric), rnd);
  return [first, second];
}

const fresh = (defs: MissionDef[]): MissionProgress[] => defs.map(m => ({ id: m.id, progress: 0, claimed: false }));

/** Brings the missions to `today`: a new day replaces the daily ones, a new week the weekly ones. */
export function syncMissions(state: MissionsState, today: string): MissionsState {
  if (!DATE_RE.test(today)) return state;
  const week = weekKeyOf(today);
  let next = state;
  if (state.day !== today) next = { ...next, day: today, daily: fresh(dailySelection(today)), bonusClaimed: false };
  if (state.week !== week) next = { ...next, week, weekly: fresh(weeklySelection(week)) };
  return next;
}

export interface MissionRun {
  score: number;
  level: number;
  victory?: boolean;
  gems?: number;
  relics?: number;
  heroIndex?: number;
  mode?: 'expedition' | 'daily' | 'endless';
}

function advance(p: MissionProgress, def: MissionDef, run: MissionRun): MissionProgress {
  if (p.claimed && p.progress >= def.target) return p;
  switch (def.metric) {
    case 'runs':
      return { ...p, progress: p.progress + 1 };
    case 'gems':
      return { ...p, progress: p.progress + Math.max(0, Math.trunc(run.gems ?? 0)) };
    case 'wins':
      return run.victory ? { ...p, progress: p.progress + 1 } : p;
    case 'daily':
      return run.mode === 'daily' ? { ...p, progress: p.progress + 1 } : p;
    // The expedition's floors and score are what these goals are about; the endless descent has its own records.
    case 'floor':
      return run.mode === 'endless' ? p : { ...p, progress: Math.max(p.progress, Math.trunc(run.level)) };
    case 'score':
      return run.mode === 'endless' ? p : { ...p, progress: Math.max(p.progress, Math.trunc(run.score)) };
    case 'relics':
      return { ...p, progress: Math.max(p.progress, Math.trunc(run.relics ?? 0)) };
    case 'heroes': {
      if (run.heroIndex === undefined) return p;
      const seen = p.seen ?? [];
      if (seen.includes(run.heroIndex)) return p;
      const all = [...seen, run.heroIndex];
      return { ...p, seen: all, progress: all.length };
    }
  }
}

/** Adds a finished run to every mission. `done` lists the missions that reached their target with this run. */
export function applyRun(state: MissionsState, run: MissionRun): { state: MissionsState; done: string[] } {
  const done: string[] = [];
  const step = (list: MissionProgress[]) =>
    list.map(p => {
      const def = missionDef(p.id);
      if (!def) return p;
      const next = advance(p, def, run);
      if (p.progress < def.target && next.progress >= def.target) done.push(def.id);
      return next;
    });
  return { state: { ...state, daily: step(state.daily), weekly: step(state.weekly) }, done };
}

export const isComplete = (p: MissionProgress): boolean => {
  const def = missionDef(p.id);
  return !!def && p.progress >= def.target;
};

/** Every daily mission is done and claimed: the bonus can be taken. */
export const bonusReady = (state: MissionsState): boolean => !state.bonusClaimed && state.daily.length > 0 && state.daily.every(p => p.claimed);

/** Missions waiting to be claimed (the bonus counts as one). */
export function claimableCount(state: MissionsState): number {
  return [...state.daily, ...state.weekly].filter(p => isComplete(p) && !p.claimed).length + (bonusReady(state) ? 1 : 0);
}

/**
 * Marks a mission claimed and returns the embers it pays (0 when it cannot be claimed: unknown, not done yet, or already
 * claimed). The bonus uses the id `bonus`.
 */
export function claim(state: MissionsState, id: string): { state: MissionsState; embers: number } {
  if (id === 'bonus') {
    return bonusReady(state) ? { state: { ...state, bonusClaimed: true }, embers: DAILY_BONUS } : { state, embers: 0 };
  }
  const def = missionDef(id);
  if (!def) return { state, embers: 0 };
  let paid = 0;
  const mark = (list: MissionProgress[]) =>
    list.map(p => {
      if (p.id !== id || p.claimed || p.progress < def.target) return p;
      paid = def.reward;
      return { ...p, claimed: true };
    });
  const next = { ...state, daily: mark(state.daily), weekly: mark(state.weekly) };
  return paid > 0 ? { state: next, embers: paid } : { state, embers: 0 };
}

/** Defensive parse of whatever was persisted. */
export function parseMissions(raw: unknown): MissionsState {
  if (!raw || typeof raw !== 'object') return EMPTY_MISSIONS;
  const v = raw as Record<string, unknown>;
  const date = (x: unknown) => (typeof x === 'string' && DATE_RE.test(x) ? x : null);
  const list = (x: unknown): MissionProgress[] =>
    Array.isArray(x)
      ? x
          .filter((p): p is Record<string, unknown> => !!p && typeof p === 'object')
          .map(p => ({
            id: typeof p.id === 'string' ? p.id : '',
            progress: typeof p.progress === 'number' && Number.isFinite(p.progress) ? Math.max(0, Math.trunc(p.progress)) : 0,
            claimed: p.claimed === true,
            ...(Array.isArray(p.seen) ? { seen: p.seen.filter((n): n is number => Number.isInteger(n) && n >= 0 && n < 64).slice(0, 16) } : {}),
          }))
          .filter(p => !!missionDef(p.id))
          .slice(0, 5)
      : [];
  return { day: date(v.day), week: date(v.week), daily: list(v.daily), weekly: list(v.weekly), bonusClaimed: v.bonusClaimed === true };
}
