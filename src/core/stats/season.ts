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
}

export const EMPTY_SEASON: SeasonState = { key: null, points: 0, claimed: 0, completed: 0 };

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

/** The state for the season of `day`: a new month starts a new track (the completed count is kept). */
export function syncSeason(state: SeasonState, day: string): SeasonState {
  const key = seasonKeyOf(day);
  return state.key === key ? state : { key, points: 0, claimed: 0, completed: state.completed };
}

/** Adds a run played on `day` to the season. */
export const addSeasonRun = (state: SeasonState, day: string, points: number): SeasonState => {
  const s = syncSeason(state, day);
  return points > 0 ? { ...s, points: s.points + points } : s;
};

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
  return { state: { ...state, claimed: reached, completed: state.completed + (done ? 1 : 0) }, embers };
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
  return { key, points: num(r.points), claimed: Math.min(SEASON_TIERS.length, num(r.claimed)), completed: num(r.completed) };
}
