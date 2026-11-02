import AsyncStorage from '@react-native-async-storage/async-storage';
import { addYulePuzzle } from '../core/events/yule';
import { addFriend, markSeen, removeFriend } from '../core/social/friends';
import { claimSeason, syncSeason } from '../core/stats/season';
import {
  LocalStats,
  MAX_FREEZES,
  RunResult,
  addAchievementEmbers,
  mergeDailyRun,
  mergeRun,
  parseStats,
  streakStatus,
} from '../core/stats/runStats';
import { dailyKey } from '../core/engine/seed';
import { newUnlocks } from '../core/stats/unlocks';
import { nextGoals, newlyAffordable } from '../core/stats/goals';
import { AchievementId, newAchievements, rewardFor, withAchievements } from '../core/stats/achievements';
import { UpgradeId, purchase } from '../core/stats/forge';
import { buySkin, claimUnlockedSkins, equipSkin } from '../core/skins/ownership';
import { spendEmbers } from '../core/stats/spend';
import { applyRun as applyMissionRun, claim as claimMission, syncMissions } from '../core/stats/missions';
import { rankUp } from '../core/stats/rank';
import { masteryOf, masteryUp, tierCrossed, type MasteryTierId } from '../core/stats/mastery';

/** The hero and its new mastery level when a run raised it. */
const masteryRaised = (before: LocalStats, after: LocalStats, hero: number | undefined): { hero: number; level: number; tier?: MasteryTierId } | null => {
  if (hero === undefined) return null;
  const level = masteryUp(before.heroXp[hero] ?? 0, after.heroXp[hero] ?? 0);
  if (!level) return null;
  const tier = tierCrossed(masteryOf(before.heroXp[hero] ?? 0).level, level);
  return tier ? { hero, level, tier: tier.id } : { hero, level };
};
import { HERO_UNLOCKS, isHeroUnlocked } from '../core/stats/heroUnlocks';
import type { SkinId } from '../core/skins/skins';
import { buyCosmetic, equipCosmetic, type CosmeticId, type CosmeticKind } from '../core/cosmetics/cosmetics';
import { buyDeal } from '../core/cosmetics/dailyShop';
import { openChest } from '../core/stats/dailyChest';
import { chronicleUp } from '../core/stats/chronicle';
import { allQuestsDone, questDone } from '../core/stats/heroQuests';
import { petStage } from '../core/cosmetics/petGrowth';
import { withChestOpened, withPuzzleResult, type PuzzleTarget } from '../core/stats/puzzleProgress';

/** The companion a run grew into a new stage, if it did. */
const petGrown = (before: LocalStats, after: LocalStats, pet: string | null | undefined): { pet: string; stage: number } | null => {
  if (!pet) return null;
  const was = petStage(before.petFloors?.[pet]);
  const now = petStage(after.petFloors?.[pet]);
  return now > was ? { pet, stage: now } : null;
};

/** The hero challenges a run completed, and whether that finished the hero's three. */
const questsRaised = (before: LocalStats, after: LocalStats, hero: number | undefined): { hero: number; done: number[]; all: boolean } | null => {
  if (hero === undefined) return null;
  const was = before.heroQuests?.[hero] ?? 0;
  const now = after.heroQuests?.[hero] ?? 0;
  const done = [0, 1, 2].filter(k => questDone(now, k) && !questDone(was, k));
  return done.length > 0 ? { hero, done, all: allQuestsDone(now) } : null;
};

const STORAGE_KEY = 'grimbur.stats.v1';

/** The last stats read or written, kept in memory so a screen can draw its first frame with real data. */
let latest: LocalStats | null = null;

/** The stats as they are right now, if they have been read this session (the splash screen reads them). */
export const peekLocalStats = (): LocalStats | null => latest;

/**
 * A device whose clock was wrong for a moment (set a year ahead, then fixed) leaves dates in the future in the save, and every
 * "only ever forward" rule (daily bonus, streak, welcome-back) then waits for that date. Dates more than a day ahead of now
 * are treated as today, so one wrong clock cannot freeze the daily rewards.
 */
export function sanitizeClock(stats: LocalStats, now: Date = new Date()): LocalStats {
  const limit = dailyKey(new Date(now.getTime() + 36 * 3600 * 1000));
  const today = dailyKey(now);
  const fix = (day: string | null) => (day !== null && day > limit ? today : day);
  const lastBonusDate = fix(stats.lastBonusDate);
  const lastPlayedDate = fix(stats.lastPlayedDate);
  const lastDailyDate = fix(stats.lastDailyDate);
  if (lastBonusDate === stats.lastBonusDate && lastPlayedDate === stats.lastPlayedDate && lastDailyDate === stats.lastDailyDate) return stats;
  return { ...stats, lastBonusDate, lastPlayedDate, lastDailyDate };
}

/** Counts reads so that a slow, older one never overwrites the newer value kept in memory. */
let readSeq = 0;

export async function getLocalStats(): Promise<LocalStats> {
  const ticket = ++readSeq;
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  // A save that cannot be read must not be silently replaced by an empty one on the next write: keep a copy first.
  if (raw) {
    try {
      JSON.parse(raw);
    } catch {
      await AsyncStorage.setItem(`${STORAGE_KEY}.corrupt`, raw).catch(() => {});
    }
  }
  const stats = sanitizeClock(parseStats(raw));
  if (ticket >= readSeq || latest === null) latest = stats;
  return stats;
}

/**
 * Every read-modify-write goes through this queue, one at a time. Without it, two overlapping updates
 * (the end-of-run save and a quick Forge purchase) would both read the same old stats and the later
 * write would silently erase the earlier one.
 */
let writeQueue: Promise<unknown> = Promise.resolve();
function serialized<T>(work: () => Promise<T>): Promise<T> {
  const result = writeQueue.then(work, work);
  writeQueue = result.catch(() => undefined);
  return result;
}

async function save(stats: LocalStats) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  latest = stats;
}

const unlockedHeroCount = (stats: LocalStats): number => HERO_UNLOCKS.filter((_, i) => isHeroUnlocked(i, stats)).length;

/** Feeds a finished run to the missions of its day (a new day or week replaces the old ones first). */
function withMissions(stats: LocalStats, run: RunResult, day: string): { stats: LocalStats; done: string[] } {
  if (run.progressed === false) return { stats, done: [] };
  const applied = applyMissionRun(syncMissions(stats.missions, day, unlockedHeroCount(stats)), run);
  return { stats: { ...stats, missions: applied.state }, done: applied.done };
}

/** The missions of today (rolled over when the day or week changed), saved. Used by the screens that show them. */
export const getMissions = (day: string = dailyKey()): Promise<LocalStats> =>
  serialized(async () => {
    const before = await getLocalStats();
    const synced = syncMissions(before.missions, day, unlockedHeroCount(before));
    if (synced === before.missions) return before;
    const stats = { ...before, missions: synced };
    await save(stats);
    return stats;
  });

/** Claims a mission reward (or the daily bonus with the id `bonus`) and pays its embers. Resolves with the new stats, or null. */
export const claimMissionReward = (id: string): Promise<LocalStats | null> =>
  serialized(async () => {
    const before = await getLocalStats();
    const result = claimMission(before.missions, id);
    if (result.embers <= 0) return null;
    const stats = { ...before, missions: result.state, embers: before.embers + result.embers, lifetimeEmbers: before.lifetimeEmbers + result.embers };
    await save(stats);
    return stats;
  });

export type AddFriendError = 'invalid' | 'self' | 'duplicate' | 'full';

/** Adds a friend by code; `error` says why not when it fails. */
export const addFriendCode = (code: string, self: string | null): Promise<{ stats: LocalStats; error: AddFriendError | null }> =>
  serialized(async () => {
    const before = await getLocalStats();
    const result = addFriend(before.friends ?? [], code, self);
    if (!result.ok) return { stats: before, error: result.reason };
    const stats = { ...before, friends: result.friends };
    await save(stats);
    return { stats, error: null };
  });

export const removeFriendCode = (pid: string): Promise<LocalStats> =>
  serialized(async () => {
    const before = await getLocalStats();
    const stats = { ...before, friends: removeFriend(before.friends ?? [], pid) };
    await save(stats);
    return stats;
  });

/** Remembers each friend's best score as seen now (so a "new record" badge shows once). */
export const markFriendsSeen = (bests: Record<string, number>): Promise<LocalStats> =>
  serialized(async () => {
    const before = await getLocalStats();
    const stats = { ...before, friends: markSeen(before.friends ?? [], bests) };
    await save(stats);
    return stats;
  });

/** Pays every reached tier of this month's season track; null when nothing was waiting. */
export const claimSeasonReward = (day: string = dailyKey()): Promise<LocalStats | null> =>
  serialized(async () => {
    const before = await getLocalStats();
    const result = claimSeason(syncSeason(before.season, day));
    if (result.embers <= 0) return null;
    const stats = { ...before, season: result.state, embers: before.embers + result.embers, lifetimeEmbers: before.lifetimeEmbers + result.embers };
    await save(stats);
    return stats;
  });

/**
 * Opens today's daily chest. Its embers go to the purse but not to the lifetime count (the rank only counts embers earned by
 * playing). Resolves with the new stats and what the chest gave, or null when it was already opened today.
 */
export const openDailyChest = (day: string = dailyKey()) =>
  serialized(async () => {
    const before = await getLocalStats();
    const opened = openChest(before.chest, day, before.freezes, MAX_FREEZES);
    if (!opened) return null;
    const stats: LocalStats = { ...before, chest: opened.state, embers: before.embers + opened.embers, freezes: before.freezes + (opened.freeze ? 1 : 0) };
    await save(stats);
    return { stats, embers: opened.embers, freeze: opened.freeze, day: opened.day };
  });

/** Persists a finished expedition run and reports whether it beat the previous best score. */
export const recordRun = (run: RunResult) => serialized(() => recordRunNow(run));
async function recordRunNow(run: RunResult) {
  const before = await getLocalStats();
  const day = run.day ?? dailyKey();
  const merged = mergeRun(before, { ...run, day });
  // A quick descent's win is not an expedition's: achievements and missions see it as a run that did not slay the Grimbur.
  const counted = run.mode === 'quick' ? { ...run, victory: false } : run;
  const achievements = newAchievements(merged.stats, counted);
  const claim = claimUnlockedSkins(withAchievements(merged.stats, achievements, day));
  const missioned = withMissions(claim.stats, counted, day);
  const stats = missioned.stats;
  await save(stats);
  const payout = addAchievementEmbers(merged.payout, rewardFor(achievements));
  return {
    stats,
    missionsDone: missioned.done,
    /** The new rank when this run raised it. */
    rankUp: rankUp(before.lifetimeEmbers, stats.lifetimeEmbers),
    masteryUp: masteryRaised(before, stats, run.heroIndex),
    /** The newest chronicle fragment a secret room unveiled. */
    chronicleUp: chronicleUp(before, stats),
    questsDone: questsRaised(before, stats, run.heroIndex),
    petUp: petGrown(before, stats, run.pet),
    /** Skins unlocked by playing (their goal was just met). */
    newSkins: claim.claimed,
    isNewBestScore: merged.isNewBestScore,
    unlocks: newUnlocks(before, stats),
    /** Hero indices unlocked by the run (kept for callers that only care about heroes). */
    unlocked: newUnlocks(before, stats).heroes,
    achievements,
    /** Where the embers came from; `payout.total` is everything the run added to the balance (shown once). */
    payout,
    embers: payout.total,
    bonus: payout.daily,
    affordableNow: newlyAffordable(before, stats),
    goals: nextGoals(stats, 2),
  };
}

/** Persists a finished daily-challenge run for the given local day (default: today). */
export const recordDailyRun = (run: RunResult, key: string = dailyKey()) => serialized(() => recordDailyRunNow(run, key));
async function recordDailyRunNow(run: RunResult, key: string) {
  const before = await getLocalStats();
  const merged = mergeDailyRun(before, key, { ...run, mode: 'daily', day: run.day ?? key });
  const achievements = newAchievements(merged.stats, run);
  const claim = claimUnlockedSkins(withAchievements(merged.stats, achievements, key));
  const missioned = withMissions(claim.stats, { ...run, mode: 'daily' }, key);
  const stats = missioned.stats;
  await save(stats);
  const payout = addAchievementEmbers(merged.payout, rewardFor(achievements));
  const status = streakStatus(stats, key);
  const unlocks = newUnlocks(before, stats);
  return {
    stats,
    missionsDone: missioned.done,
    rankUp: rankUp(before.lifetimeEmbers, stats.lifetimeEmbers),
    masteryUp: masteryRaised(before, stats, run.heroIndex),
    chronicleUp: chronicleUp(before, stats),
    questsDone: questsRaised(before, stats, run.heroIndex),
    petUp: petGrown(before, stats, run.pet),
    newSkins: claim.claimed,
    achievements,
    payout,
    embers: payout.total,
    bonus: payout.daily,
    unlocks,
    unlocked: unlocks.heroes,
    isNewDailyBest: merged.isNewDailyBest,
    dailyBest: stats.daily?.bestScore ?? 0,
    streak: status.current,
    bestStreak: status.best,
    /** Length of the streak this run found broken (0 when it was alive). */
    streakLost: merged.streakEvent.lost,
    freezeUsed: merged.streakEvent.freezeUsed,
    freezeEarned: merged.streakEvent.freezeEarned,
    affordableNow: newlyAffordable(before, stats),
    goals: nextGoals(stats, 2),
  };
}

/**
 * Unlocks the achievements the stored numbers already satisfy. They are normally evaluated when a run ends or something is
 * bought, so one that was added later (or whose number was reached by a restored backup) would show a full bar and stay
 * locked until the next run. Resolves with the achievements it just unlocked (their embers are paid).
 */
export const syncAchievements = (): Promise<{ stats: LocalStats; achievements: AchievementId[] }> =>
  serialized(async () => {
    const before = await getLocalStats();
    const achievements = newAchievements(before, { score: 0, level: 1 });
    if (achievements.length === 0) return { stats: before, achievements };
    const stats = claimUnlockedSkins(withAchievements(before, achievements, dailyKey())).stats;
    await save(stats);
    return { stats, achievements };
  });

/**
 * Saves a solved puzzle (its best stars) and pays what is new: embers for new stars on the path, or for the day's puzzle the
 * first time. Puzzles are playing, so their embers count for the rank like any run's. Evaluates the puzzle achievements.
 */
export const recordPuzzle = (
  target: PuzzleTarget,
  stars: number,
  seconds = 0,
): Promise<{ stats: LocalStats; embers: number; achievementEmbers: number; achievements: AchievementId[]; record: boolean; best: number }> =>
  serialized(async () => {
    const before = await getLocalStats();
    const { progress, embers, record, best } = withPuzzleResult(before.puzzles, target, stars, seconds);
    // A first solve of the puzzle of the day counts toward Christmas in the cave (only while it runs).
    const firstDaily = target.kind === 'daily' && before.puzzles?.daily?.date !== target.date && progress.daily?.date === target.date;
    const events = firstDaily ? addYulePuzzle(before.events, target.date) : before.events;
    const solved: LocalStats = { ...before, puzzles: progress, events, embers: before.embers + embers, lifetimeEmbers: before.lifetimeEmbers + embers };
    const achievements = newAchievements(solved, { score: 0, level: 1 });
    const stats = claimUnlockedSkins(withAchievements(solved, achievements, dailyKey())).stats;
    await save(stats);
    return { stats, embers, achievementEmbers: rewardFor(achievements), achievements, record, best };
  });

/** Opens a mastered chapter's chest (its title is owned from the moment the chapter is mastered; this is the moment it is shown). */
export const openPuzzleChest = (tier: number): Promise<LocalStats> =>
  serialized(async () => {
    const before = await getLocalStats();
    const stats = { ...before, puzzles: withChestOpened(before.puzzles, tier) };
    if (stats.puzzles !== before.puzzles) await save(stats);
    return stats;
  });

/**
 * Buys the next level of a Forge upgrade and evaluates the achievements it may complete (first_forge, smith...).
 * Resolves with the new stats and the achievements earned, or null when it cannot be bought.
 */
export const buyUpgrade = (id: UpgradeId): Promise<{ stats: LocalStats; achievements: AchievementId[] } | null> =>
  serialized(async () => {
    const bought = purchase(await getLocalStats(), id);
    if (!bought) return null;
    const achievements = newAchievements(bought, { score: 0, level: 1 });
    const stats = withAchievements(bought, achievements, dailyKey());
    await save(stats);
    return { stats, achievements };
  });

/** Spends embers on a revive; resolves with the new stats, or null when the purse is short. */
export const spendEmbersFor = (amount: number): Promise<LocalStats | null> =>
  serialized(async () => {
    const stats = spendEmbers(await getLocalStats(), amount);
    if (!stats) return null;
    await save(stats);
    return stats;
  });

/** Adds embers won in a duel (they do not count for the rank: only embers earned by playing do). Resolves with the new stats. */
export const creditEmbersFor = (amount: number): Promise<LocalStats | null> =>
  serialized(async () => {
    const n = Math.trunc(amount);
    if (!Number.isFinite(n) || n <= 0) return null;
    const current = await getLocalStats();
    const stats = { ...current, embers: current.embers + n };
    await save(stats);
    return stats;
  });

/** Buys a hero skin with embers; resolves with the new stats, or null when it cannot be bought. */
export const buySkinFor = (hero: number, skin: SkinId): Promise<LocalStats | null> =>
  serialized(async () => {
    const stats = buySkin(await getLocalStats(), hero, skin);
    if (!stats) return null;
    await save(stats);
    return stats;
  });

/** Buys a trail, frame, title or board theme at its full price; resolves with the new stats, or null. */
export const buyCosmeticFor = (id: CosmeticId): Promise<LocalStats | null> =>
  serialized(async () => {
    const stats = buyCosmetic(await getLocalStats(), id);
    if (!stats) return null;
    await save(stats);
    return stats;
  });

/** Wears a cosmetic in its slot (or takes the slot off with null); resolves with the new stats, or null. */
export const equipCosmeticFor = (kind: CosmeticKind, id: CosmeticId | null): Promise<LocalStats | null> =>
  serialized(async () => {
    const stats = equipCosmetic(await getLocalStats(), kind, id);
    if (!stats) return null;
    await save(stats);
    return stats;
  });

/** Buys one of today's daily-shop deals; resolves with the new stats, or null. */
export const buyDealFor = (key: string): Promise<LocalStats | null> =>
  serialized(async () => {
    const stats = buyDeal(await getLocalStats(), dailyKey(), key);
    if (!stats) return null;
    await save(stats);
    return stats;
  });

/** Wears an owned skin; resolves with the new stats, or null when the skin is not owned. */
export const equipSkinFor = (hero: number, skin: SkinId): Promise<LocalStats | null> =>
  serialized(async () => {
    const stats = equipSkin(await getLocalStats(), hero, skin);
    if (!stats) return null;
    await save(stats);
    return stats;
  });

/** Deletes everything stored on the device: progress, embers, achievements and records. */
export async function resetLocalStats(): Promise<void> {
  await serialized(async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    await AsyncStorage.removeItem(`${STORAGE_KEY}.corrupt`).catch(() => {});
    latest = null; // the screens must not draw the deleted progress on their first frame
  });
}

/** Replaces the saved progress with already-validated stats (a restored backup). */
export const replaceLocalStats = (stats: LocalStats): Promise<void> => serialized(() => save(stats));
