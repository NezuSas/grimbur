/**
 * Christmas in the cave: an event all through December (the player's local calendar). While it runs the cave has snow, the
 * puzzle of the day carries a gift of embers, and three keepsakes can be earned only that month by playing:
 *  - the Yule frame, for clearing YULE_FLOORS floors in December (any run that counts);
 *  - the crystal reindeer companion, for solving YULE_PUZZLES puzzles of the day in December;
 *  - the Yule title, for both.
 * Progress is kept per year (`yule2026`...), and what was earned stays forever. Looks only: never any power in a run.
 */
export const YULE_MONTH = 12;
export const YULE_FLOORS = 25;
export const YULE_PUZZLES = 10;
/** Extra embers for the first solve of the puzzle of the day while the event runs. */
export const YULE_GIFT_EMBERS = 10;

export interface YuleProgress {
  floors: number;
  puzzles: number;
}
/** Event progress by event and year (`yule2026`). */
export type EventProgress = Record<string, YuleProgress>;

let forced: boolean | null = null;
/** Development only: show the event whatever the date (the screenshot harness's `event=yule`). */
export const forceYule = (on: boolean | null): void => {
  forced = on;
};

/** Whether the event is being forced on for testing (development builds only). */
export const isYuleForced = (): boolean => forced === true;

/** The event runs on this local day (`YYYY-MM-DD`). */
export const isYuleDay = (dateKey: string | undefined): boolean => {
  if (forced !== null) return forced;
  return !!dateKey && Number(dateKey.slice(5, 7)) === YULE_MONTH;
};

export const yuleKey = (dateKey: string): string => `yule${dateKey.slice(0, 4)}`;

/** This year's progress (zeros before any play). */
export const yuleProgress = (events: EventProgress | undefined, dateKey: string): YuleProgress => events?.[yuleKey(dateKey)] ?? { floors: 0, puzzles: 0 };

const add = (events: EventProgress | undefined, dateKey: string | undefined, patch: Partial<YuleProgress>): EventProgress => {
  const base = events ?? {};
  if (!dateKey || !isYuleDay(dateKey)) return base;
  const now = yuleProgress(base, dateKey);
  return { ...base, [yuleKey(dateKey)]: { floors: now.floors + (patch.floors ?? 0), puzzles: now.puzzles + (patch.puzzles ?? 0) } };
};

/** A run of `floors` floors played on `dateKey` (counted only during the event). */
export const addYuleFloors = (events: EventProgress | undefined, dateKey: string | undefined, floors: number): EventProgress =>
  add(events, dateKey, { floors: Math.max(0, Math.trunc(floors)) });

/** A puzzle of the day solved for the first time on `dateKey`. */
export const addYulePuzzle = (events: EventProgress | undefined, dateKey: string): EventProgress => add(events, dateKey, { puzzles: 1 });

export type YuleGoal = 'floors' | 'puzzles' | 'both';
/** A keepsake's goal was met in some December (earned for good). */
export const yuleGoalMet = (events: EventProgress | undefined, goal: YuleGoal): boolean =>
  Object.entries(events ?? {}).some(([key, p]) => {
    if (!key.startsWith('yule')) return false;
    const floors = p.floors >= YULE_FLOORS;
    const puzzles = p.puzzles >= YULE_PUZZLES;
    return goal === 'floors' ? floors : goal === 'puzzles' ? puzzles : floors && puzzles;
  });

/** Reads the saved progress back, dropping anything malformed. */
export function parseEvents(raw: unknown): EventProgress {
  if (!raw || typeof raw !== 'object') return {};
  const out: EventProgress = {};
  for (const [key, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!/^yule\d{4}$/.test(key) || !v || typeof v !== 'object') continue;
    const r = v as Record<string, unknown>;
    const n = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) ? Math.max(0, Math.trunc(x)) : 0);
    out[key] = { floors: n(r.floors), puzzles: n(r.puzzles) };
  }
  return out;
}
