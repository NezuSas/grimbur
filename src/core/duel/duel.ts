/**
 * Live duel: two players run the same cave (the one a challenge code stands for) at the same time and see how far the other has
 * got: floor, score and whether they are still playing. Nobody sees the other's board. Each player keeps one document,
 * `duel_players/<code>_<playerId>`, that they update while they play; the other one listens to it. Limits mirror firestore.rules.
 */
export type DuelState = 'lobby' | 'ready' | 'playing' | 'done';
export const DUEL_STATES: readonly DuelState[] = ['lobby', 'ready', 'playing', 'done'];

export interface DuelPlayer {
  code: string;
  pid: string;
  name: string;
  characterIndex: number;
  state: DuelState;
  /** Floor reached (1 to 10) and score so far. */
  level: number;
  score: number;
  /** The run was won (the Wumpus fell). Only meaningful once `done`. */
  victory: boolean;
  /** Seconds played, set when the player is done (0 before). */
  time: number;
}

/** A player whose last update is older than this is no longer there (closed the app, lost the connection). */
export const AWAY_AFTER_MS = 30_000;
/** How often a player in a run repeats their state even if nothing changed, so the other side knows they are still there. */
export const HEARTBEAT_MS = 10_000;
/** The least time between two updates caused by score changes. */
export const MIN_PUBLISH_MS = 2_500;
/** Seconds of countdown once both players are ready. */
export const COUNTDOWN_SECONDS = 3;

export const isAway = (updatedAtMs: number, nowMs: number): boolean => nowMs - updatedAtMs > AWAY_AFTER_MS;

/** What is wrong with a player's document (empty when fine). */
export function validateDuelPlayer(p: DuelPlayer): string[] {
  const problems: string[] = [];
  if (!/^[0-9A-HJKMNP-TV-Z]{8}$/.test(p.code)) problems.push('code');
  if (!/^[0-9A-HJKMNP-TV-Z]{16}$/.test(p.pid)) problems.push('player');
  if (p.name.length < 1 || p.name.length > 20) problems.push('name');
  if (!Number.isInteger(p.characterIndex) || p.characterIndex < 0 || p.characterIndex > 5) problems.push('hero');
  if (!DUEL_STATES.includes(p.state)) problems.push('state');
  if (!Number.isInteger(p.level) || p.level < 1 || p.level > 10) problems.push('level');
  if (!Number.isInteger(p.score) || p.score < 0 || p.score > p.level * 20000) problems.push('score');
  if (typeof p.victory !== 'boolean') problems.push('victory');
  if (!Number.isInteger(p.time) || p.time < 0 || p.time > 86400) problems.push('time');
  return problems;
}

export type DuelOutcome = 'win' | 'lose' | 'tie';

/**
 * Who got further. Slaying the Wumpus beats everything, then the deeper floor, then the higher score, then the faster run.
 * `me` and `rival` are their results (a rival still playing counts with what they have so far).
 */
export function duelOutcome(me: Pick<DuelPlayer, 'victory' | 'level' | 'score' | 'time'>, rival: Pick<DuelPlayer, 'victory' | 'level' | 'score' | 'time'>): DuelOutcome {
  const key = (p: Pick<DuelPlayer, 'victory' | 'level' | 'score' | 'time'>) => [p.victory ? 1 : 0, p.level, p.score];
  const a = key(me);
  const b = key(rival);
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] > b[i] ? 'win' : 'lose';
  if (me.victory && rival.victory && me.time > 0 && rival.time > 0 && me.time !== rival.time) return me.time < rival.time ? 'win' : 'lose';
  return 'tie';
}

export type RivalStatus = 'waiting' | 'ready' | 'playing' | 'done' | 'away';

/** What to say about the rival: from their document and when it was last updated (null: no document yet). */
export function rivalStatus(rival: { state: DuelState } | null, updatedAtMs: number | null, nowMs: number): RivalStatus {
  if (!rival) return 'waiting';
  if (rival.state === 'done') return 'done';
  if (updatedAtMs !== null && isAway(updatedAtMs, nowMs)) return 'away';
  return rival.state === 'lobby' ? 'waiting' : rival.state;
}

/** Whether the duel is settled for this player: they are done and the rival is done or gone. */
export const duelSettled = (meDone: boolean, status: RivalStatus): boolean => meDone && (status === 'done' || status === 'away');
