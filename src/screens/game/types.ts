import type { PopupType } from "../../ui/components/game/ScorePopup";
import type { RunPayout } from "../../core/stats/runStats";
import type { Goal } from "../../core/stats/goals";
import type { Unlocks } from "../../core/stats/unlocks";
import type { biomeFor } from "../../core/engine/biomes";

/** The dark wash over the cave picture: each cave type has its own picture (ui/biomeArt.ts); this layer only keeps the board readable. */
export const BIOME_TINT: Record<ReturnType<typeof biomeFor>, string> = {
  cave: "rgba(0,0,0,0.55)",
  crystal: "rgba(0,0,0,0.5)",
  magma: "rgba(0,0,0,0.5)",
  lair: "rgba(0,0,0,0.5)",
};

/** How long the board stays on screen after a death (the red edge, the shake and the killer in view) before the defeat card covers it. */
export const GAME_OVER_CARD_DELAY_MS = 1100;
/**
 * How long the board stays after the Grimbur falls: the arrow lands, the Grimbur crumbles (BOSS_FALL_MS) and the cave holds
 * its breath a moment before the victory card.
 */
export const VICTORY_CARD_DELAY_MS = 2300;
/** The run is saved this long after a death, once the killer's strike on the board has played. */
export const RECORD_AFTER_STRIKE_MS = 650;
/** How long the top-10 check may delay the entry modal; the game-over card never waits for it. */
export const TOP_TEN_CHECK_TIMEOUT_MS = 1500;

/** A floating label: where it rises from, and how it looks. */
export type Popup = {
  id: number;
  points: number;
  type: PopupType;
  /** Screen position of the tile it rises from (undefined until the board has been measured). */
  x?: number;
  y?: number;
  slot: number;
  at: number;
  sub?: string | null;
  subColor?: string;
  popScale?: number;
};

/** What the game-over card shows about the run that just ended (built from what the stats service returns). */
export type RunResult = {
  bestScore: number;
  isNewBest: boolean;
  streak?: number;
  unlocked?: number[];
  achievements?: string[];
  embers?: number;
  bonus?: number;
  payout?: RunPayout;
  streakLost?: number;
  bestStreak?: number;
  freezeUsed?: boolean;
  freezeEarned?: boolean;
  unlocks?: Unlocks;
  goals?: Goal[];
  canBuyNow?: boolean;
  /** Missions this run completed, and the new rank when it was raised. */
  missionsDone?: string[];
  rankUp?: number | null;
  /** One of the first runs: the game over explains gems versus embers. */
  early?: boolean;
};
