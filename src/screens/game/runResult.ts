import type { recordDailyRun, recordRun } from "../../services/localStats";
import type { GameMode } from "../../core/engine/seed";
import type { RunResult } from "./types";

type Settled<T extends (...args: never[]) => Promise<unknown>> = Awaited<ReturnType<T>>;

/** The game-over summary of a finished daily-challenge run. */
export function dailyRunResult(r: Settled<typeof recordDailyRun>): RunResult {
  return {
    bestScore: r.dailyBest,
    isNewBest: r.isNewDailyBest,
    streak: r.streak,
    unlocked: r.unlocked,
    achievements: r.achievements,
    embers: r.embers,
    bonus: r.bonus,
    payout: r.payout,
    streakLost: r.streakLost,
    bestStreak: r.bestStreak,
    freezeUsed: r.freezeUsed,
    freezeEarned: r.freezeEarned,
    unlocks: { ...r.unlocks, skins: r.newSkins },
    goals: r.goals,
    canBuyNow: r.affordableNow.length > 0,
    missionsDone: r.missionsDone,
    rankUp: r.rankUp,
    masteryUp: r.masteryUp,
    early: r.stats.gamesPlayed <= 2,
  };
}

/** The game-over summary of a finished expedition or endless run (the endless descent keeps its own record, in floors). */
export function runResultOf(r: Settled<typeof recordRun>, mode: GameMode): RunResult {
  return {
    bestScore: mode === "endless" ? r.stats.bestEndlessFloor : r.stats.bestScore,
    isNewBest: r.isNewBestScore,
    unlocked: r.unlocked,
    achievements: r.achievements,
    embers: r.embers,
    bonus: r.bonus,
    payout: r.payout,
    unlocks: { ...r.unlocks, skins: r.newSkins },
    goals: r.goals,
    canBuyNow: r.affordableNow.length > 0,
    missionsDone: r.missionsDone,
    rankUp: r.rankUp,
    masteryUp: r.masteryUp,
    early: r.stats.gamesPlayed <= 2,
  };
}
