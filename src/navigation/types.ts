import type { GameMode } from "../core/engine/seed";
import type { MetaEffects } from "../core/stats/forge";
import type { LessonId } from "../core/tutorial/lessons";
import type { SkinId } from "../data/skinArt";
import type { Direction } from "../core/engine/types";
import type { RelicId } from "../core/engine/relics";

/** A friend challenge being played: its code, the run seed and the difficulty it stands for (see core/challenge/code.ts). */
export type ChallengeParam = { code: string; seed: number; depth: number };

export type RootStackParamList = {
  CoverScreen: { devChest?: boolean | "open"; devNews?: boolean; devYule?: boolean } | undefined;
  /** `devHero`: development only, opens on that hero even when it is locked (for screenshots). */
  CollectionScreen: { hero?: number; skin?: SkinId; category?: "deals" | "rewards" | "skins" | "trail" | "frame" | "title" | "board" | "flag" | "attack" | "celebration" | "pet" } | undefined;
  /** The opening story; `replay` returns to the previous screen instead of starting a run. */
  MissionsScreen: undefined;
  StoryScreen: { replay?: boolean } | undefined;
  CharactersScreen: { mode?: GameMode; devHero?: number; challenge?: ChallengeParam; duel?: ChallengeParam & { stake?: number } } | undefined;
  FriendsScreen: undefined;
  ChallengeScreen: { code?: string } | undefined;
  /** The live duel: no code to create or join one; with a code and a hero, its lobby. */
  DuelScreen: { code?: string; characterIndex?: number; skin?: SkinId; stake?: number } | undefined;
  TutorialScreen: { characterIndex?: number; skin?: SkinId; replay?: boolean; ascension?: number; meta?: MetaEffects } | undefined;
  /** `devMoves`: development only, plays these steps first so a screenshot can show explored tiles and clues. */
  LessonScreen: { lesson: LessonId; /** Part of the first-run campaign: the chapters still to come and the run that follows. */ chain?: { next: LessonId[]; total: number; game: { characterIndex: number; skin?: SkinId; ascension?: number; meta?: MetaEffects } }; devMoves?: ("UP" | "DOWN" | "LEFT" | "RIGHT")[]; devEntities?: { index: number; type: string }[]; devBiome?: "cave" | "crystal" | "magma" | "lair"; devHideBanner?: boolean; devAim?: Direction; devHoldDeath?: boolean; devShoot?: number; devDraft?: RelicId[]; devRevive?: boolean; devPause?: boolean; devNameEntry?: boolean; devShare?: { hero: number; victory?: boolean; daily?: boolean }; devGameOver?: { hero: number; skin?: SkinId; cause: "enemy" | "stalker" | "sleeper" | "boss" | "pit"; victory?: boolean; full?: boolean; parade?: number | "grid"; near?: boolean } };
  /** `devBiome`: development only, draws the floor as that cave type (for screenshots). */
  /** `resume`: continue the expedition saved on disk instead of starting a new run (see services/savedRun.ts). */
  GameScreen: { characterIndex?: number; skin?: SkinId; mode?: GameMode; ascension?: number; meta?: MetaEffects; resume?: boolean; challenge?: ChallengeParam; duel?: { code: string; name: string; stake: number; members: string[]; matchId: string }; devBiome?: "cave" | "crystal" | "magma" | "lair"; devReveal?: boolean; devUnveil?: boolean; devIntermission?: boolean; devBanner?: boolean; devHint?: boolean; devFanfare?: "family" | "beast"; devEncounter?: import("../core/engine/encounters").Encounter; devDoors?: [import("../core/engine/shop").Door, import("../core/engine/shop").Door] } | undefined;
  HighScoresScreen: undefined;
  /** The cave's puzzles: the day's one and the numbered path. */
  /** Development only: `devStars` replaces the path's stars, and `devSolve` plays the return from solving its last N puzzles. */
  PuzzlesScreen: { devStars?: number[]; devSolve?: number; /** Back from a solved puzzle with Continue: open this one once the map has shown what changed. */ continueTo?: number } | undefined;
  /** One puzzle: the day's, or a number on the path (0-based). */
  /** `endless` plays endless puzzle number `n`. */
  /** `archive` replays the puzzle of the day of `date` (a past day, from the archive). */
  PuzzleScreen: { target: "daily" | "endless" | "technique" | "archive" | "weekly" | number; n?: number; tech?: string; date?: string; /** The weekly challenge played again after its counted try. */ practice?: boolean; devHold?: boolean; /** Development only: play the end of the puzzle as solved (with this many slips), or a step onto a hazard. */ devWin?: number; devFail?: boolean };
  ProgressScreen: { devOpenRun?: number } | undefined;
  LevelCompleteScreen: {
    skin?: SkinId;
    score: number;
    level: number;
    coins: number;
    totalCoins: number;
    characterIndex: number;
    kills?: number;
    totalEnemies: number;
    time: number;
  };
  /** `topic` opens the manual on that topic (the puzzles screen opens the deduction techniques). */
  InstructionsScreen: { topic?: import("../screens/manual/kit").TopicId } | undefined;
  AchievementsScreen: undefined;
  ForgeScreen: undefined;
  /** `source` says where the offer was opened from (analytics + the sentence above the pitch); `floor` is the last cleared one. */
  PaywallScreen: { source?: "cover" | "floor" | "demo" | "endless"; floor?: number } | undefined;
  SettingsScreen: undefined;
};