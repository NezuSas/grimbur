import { NORMAL_RELICS, type RelicId } from '../engine/relics';
/**
 * Seasons: every calendar month is a season with its own track. Every finished run adds season points (how deep it got,
 * a victory, the depth it was won at); ten tiers on the track pay embers, and finishing the track earns the season title
 * for good. The track starts over with the month, so a returning player always has something fresh to climb. Local and
 * derived from runs only: nothing here changes a run.
 */
export interface SeasonState {
  /** The season the points belong to (`YYYY-MM`), or null before the first run. */
  key: string | null;
  points: number;
  /** Tiers of this season already paid out (0..SEASON_TIERS.length). */
  claimed: number;
  /** Seasons whose whole track was claimed, over all time. */
  completed: number;
  /** The seasons (`YYYY-MM`) whose track was completed: each month has its own title. */
  months: string[];
}

export const EMPTY_SEASON: SeasonState = { key: null, points: 0, claimed: 0, completed: 0, months: [] };

/** Points at which each tier is reached, and the embers each one pays (the last one also completes the season). */
export const SEASON_TIERS: readonly number[] = [50, 130, 240, 380, 550, 750, 980, 1240, 1530, 1850];
export const SEASON_REWARDS: readonly number[] = [20, 25, 30, 35, 45, 55, 65, 75, 90, 150];

export const SEASON_PER_FLOOR = 8;
export const SEASON_VICTORY = 50;
export const SEASON_PER_DEPTH = 15;

export const seasonKeyOf = (day: string): string => day.slice(0, 7);

/** Season points a finished run is worth (a run that never started is worth none). */
export function seasonPointsFor(run: { level: number; victory?: boolean; ascension?: number }, progressed = true): number {
  if (!progressed) return 0;
  const floors = Math.min(10, Math.max(1, Math.trunc(Number.isFinite(run.level) ? run.level : 1)));
  const won = run.victory ? SEASON_VICTORY + SEASON_PER_DEPTH * Math.max(0, Math.trunc(run.ascension ?? 0)) : 0;
  return floors * SEASON_PER_FLOOR + won;
}

/**
 * Moves the season to the month of `day`. When the month has turned, the old track is settled first: its reached tiers that
 * were never claimed are paid (`embers`) and, if it was finished, its month counts as completed (so its title is kept). The
 * new month then starts a fresh track (the completed count and months are kept).
 */
export function rolloverSeason(state: SeasonState, day: string): { state: SeasonState; embers: number } {
  const key = seasonKeyOf(day);
  if (state.key === key) return { state, embers: 0 };
  const settled = state.key ? claimSeason(state) : { state, embers: 0 };
  const old = settled.state;
  return { state: { key, points: 0, claimed: 0, completed: old.completed, months: old.months ?? [] }, embers: settled.embers };
}

/** The state for the season of `day` (see `rolloverSeason`; the embers of an old track are paid by whoever saves it). */
export const syncSeason = (state: SeasonState, day: string): SeasonState => rolloverSeason(state, day).state;

/** Adds a run played on `day` to the season, with the embers a settled old track paid. */
export const addSeasonRunPaid = (state: SeasonState, day: string, points: number): { state: SeasonState; embers: number } => {
  const rolled = rolloverSeason(state, day);
  const s = rolled.state;
  return { state: points > 0 ? { ...s, points: s.points + points } : s, embers: rolled.embers };
};

/** Adds a run played on `day` to the season. */
export const addSeasonRun = (state: SeasonState, day: string, points: number): SeasonState => addSeasonRunPaid(state, day, points).state;

/** Tiers reached by `points`. */
export const tiersReached = (points: number): number => SEASON_TIERS.filter(p => points >= p).length;

/** Embers waiting to be claimed. */
export const seasonClaimable = (state: SeasonState): number =>
  SEASON_REWARDS.slice(state.claimed, tiersReached(state.points)).reduce((a, b) => a + b, 0);

/** Claims every reached tier at once; claiming the last tier completes the season. */
export function claimSeason(state: SeasonState): { state: SeasonState; embers: number } {
  const reached = tiersReached(state.points);
  const embers = seasonClaimable(state);
  if (embers <= 0) return { state, embers: 0 };
  const done = reached === SEASON_TIERS.length && state.claimed < reached;
  const months = done && state.key && !(state.months ?? []).includes(state.key) ? [...(state.months ?? []), state.key] : state.months ?? [];
  return { state: { ...state, claimed: reached, completed: state.completed + (done ? 1 : 0), months }, embers };
}

/** True when the track of some season of `month` (1-12, any year) was completed. */
export const completedMonth = (state: SeasonState | undefined, month: number): boolean =>
  !!state?.months?.some(m => Number(m.slice(5, 7)) === month);

/**
 * The relic the season features: it is offered in the first draft of every run of that month (the same for everyone, so a
 * daily or a duel stays fair).
 */
export function seasonRelicFor(key: string): RelicId {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return NORMAL_RELICS[(h >>> 0) % NORMAL_RELICS.length];
}

/** Whole days until the next season begins (1 on the last day of the month). */
export function daysLeftInSeason(day: string): number {
  const [y, m, d] = day.split('-').map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return last - d + 1;
}

export function parseSeason(raw: unknown): SeasonState {
  if (!raw || typeof raw !== 'object') return EMPTY_SEASON;
  const r = raw as Record<string, unknown>;
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.trunc(v) : 0);
  const key = typeof r.key === 'string' && /^\d{4}-\d{2}$/.test(r.key) ? r.key : null;
  const months = Array.isArray(r.months) ? [...new Set(r.months.filter((m): m is string => typeof m === 'string' && /^\d{4}-\d{2}$/.test(m)))] : [];
  return { key, points: num(r.points), claimed: Math.min(SEASON_TIERS.length, num(r.claimed)), completed: num(r.completed), months };
}
