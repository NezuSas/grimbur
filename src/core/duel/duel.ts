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
  /** The run was won (the Grimbur fell). Only meaningful once `done`. */
  victory: boolean;
  /** Seconds played, set when the player is done (0 before). */
  time: number;
  /** Embers each player puts in the pot (0: a friendly duel). Always the room's stake (`duels/<code>`), the one its creator chose. */
  stake: number;
}

/** A player whose last update is older than this (by the server's clock) shows as disconnected: closed the app, lost the connection. */
export const AWAY_AFTER_MS = 30_000;
/** A disconnected player this long (a phone in the background pauses its timers) counts as having left: the duel stops waiting for them. */
export const GONE_AFTER_MS = 120_000;
/** How often a player in a run repeats their state even if nothing changed, so the other side knows they are still there. */
export const HEARTBEAT_MS = 10_000;
/** The least time between two updates caused by score changes. */
export const MIN_PUBLISH_MS = 2_500;
/** Players in a duel (the room lists up to this many). */
export const MAX_PLAYERS = 4;
/** The stakes a duel can have, in embers, and the most the rules accept. */
export const STAKES: readonly number[] = [0, 10, 50, 100, 500, 1_000, 5_000, 10_000, 50_000, 100_000];
export const MAX_STAKE = 100_000;
/** From this stake on the player must confirm what they are risking. */
export const CONFIRM_STAKE = 1_000;
/** The share of the pot the game keeps (the embers disappear: it keeps the economy from only growing). */
export const DUEL_FEE_PERCENT = 10;
/** Seconds of countdown once everyone is ready. */
export const COUNTDOWN_SECONDS = 3;

export const isAway = (updatedAtMs: number, nowMs: number): boolean => nowMs - updatedAtMs > AWAY_AFTER_MS;
export const isGone = (updatedAtMs: number, nowMs: number): boolean => nowMs - updatedAtMs > GONE_AFTER_MS;

/** What is wrong with a player's document (empty when fine). */
export function validateDuelPlayer(p: DuelPlayer): string[] {
  const problems: string[] = [];
  if (!/^[0-9A-HJKMNP-TV-Z]{8}$/.test(p.code)) problems.push('code');
  if (!/^[A-Za-z0-9]{10,64}$/.test(p.pid)) problems.push('player');
  if (p.name.length < 1 || p.name.length > 20) problems.push('name');
  if (!Number.isInteger(p.characterIndex) || p.characterIndex < 0 || p.characterIndex > 5) problems.push('hero');
  if (!DUEL_STATES.includes(p.state)) problems.push('state');
  if (!Number.isInteger(p.level) || p.level < 1 || p.level > 10) problems.push('level');
  if (!Number.isInteger(p.score) || p.score < 0 || p.score > p.level * 20000) problems.push('score');
  if (typeof p.victory !== 'boolean') problems.push('victory');
  if (!Number.isInteger(p.time) || p.time < 0 || p.time > 86400) problems.push('time');
  if (!Number.isInteger(p.stake) || p.stake < 0 || p.stake > MAX_STAKE) problems.push('stake');
  return problems;
}

export type DuelOutcome = 'win' | 'lose' | 'tie';

/**
 * Who got further. Slaying the Grimbur beats everything, then the deeper floor, then the higher score, then the faster run.
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

type Result = Pick<DuelPlayer, 'victory' | 'level' | 'score' | 'time'>;

export type Standing = {
  /** `won`/`lost`/`tie`: the duel is settled for this player. `leading`/`trailing`: it is not (somebody is still playing). */
  state: 'won' | 'lost' | 'tie' | 'leading' | 'trailing';
  /** The result cannot change any more (everyone finished, or somebody has already beaten this player for good). */
  decided: boolean;
  /** 1 is the best. Counts the rivals who beat this player as things stand. */
  placement: number;
  total: number;
  /** Players sharing the first place (this player included) when it is a tie, otherwise 1. */
  tiedFirst: number;
};

/**
 * How a duel stands for a player against any number of rivals, winner takes all. `rivals` carry their result so far and whether they
 * are finished (done, or gone: a rival who stopped updating counts as finished where they stopped). A rival whose floor is already
 * above the player's, or who slew the Grimbur first, has beaten the player for good (a floor never goes back), so a player who is
 * finished does not have to wait for the others to learn they lost.
 */
export function duelStanding(me: Result, meDone: boolean, rivals: readonly { result: Result; finished: boolean }[]): Standing {
  const total = rivals.length + 1;
  const outcomes = rivals.map(r => duelOutcome(me, r.result));
  const placement = 1 + outcomes.filter(o => o === 'lose').length;
  const tiedFirst = placement === 1 ? 1 + outcomes.filter(o => o === 'tie').length : 1;
  const tied = tiedFirst > 1;
  const beatenForGood = rivals.some((r, i) => outcomes[i] === 'lose' && (r.finished || r.result.level > me.level || (r.result.victory && !me.victory)));
  const everyoneDone = meDone && rivals.every(r => r.finished);
  if (meDone && beatenForGood) return { state: 'lost', decided: true, placement, total, tiedFirst };
  if (everyoneDone) return { state: placement > 1 ? 'lost' : tied ? 'tie' : 'won', decided: true, placement, total, tiedFirst };
  return { state: placement === 1 ? 'leading' : 'trailing', decided: false, placement, total, tiedFirst };
}

/** The embers a winner takes: everybody's stake. Only players who started count. */
export const potOf = (stake: number, players: number): number => Math.max(0, stake) * Math.max(0, players);

/** What each of the players tied for first takes: the whole pot shared between them (no fee on a tie). */
export const tieShare = (stake: number, players: number, tiedFirst: number): number => Math.floor(potOf(stake, players) / Math.max(1, tiedFirst));

/** What the winner takes home: the pot minus the game's fee. */
export const prizeOf = (stake: number, players: number): number => {
  const pot = potOf(stake, players);
  return pot - Math.floor((pot * DUEL_FEE_PERCENT) / 100);
};
