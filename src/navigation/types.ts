import type { GameMode } from "../core/engine/seed";
import type { MetaEffects } from "../core/stats/forge";
import type { LessonId } from "../core/tutorial/lessons";
import type { SkinId } from "../data/skinArt";

export type RootStackParamList = {
  CoverScreen: undefined;
  /** `devHero`: development only, opens on that hero even when it is locked (for screenshots). */
  CollectionScreen: { hero?: number; skin?: SkinId } | undefined;
  CharactersScreen: { mode?: GameMode; devHero?: number } | undefined;
  TutorialScreen: { characterIndex?: number; skin?: SkinId; replay?: boolean; ascension?: number; meta?: MetaEffects } | undefined;
  /** `devMoves`: development only, plays these steps first so a screenshot can show explored tiles and clues. */
  LessonScreen: { lesson: LessonId; devMoves?: ("UP" | "DOWN" | "LEFT" | "RIGHT")[]; devEntities?: { index: number; type: string }[]; devBiome?: "cave" | "crystal" | "magma" | "lair"; devHideBanner?: boolean; devGameOver?: { hero: number; skin?: SkinId; cause: "enemy" | "stalker" | "sleeper" | "boss" | "pit" } };
  /** `devBiome`: development only, draws the floor as that cave type (for screenshots). */
  GameScreen: { characterIndex?: number; skin?: SkinId; mode?: GameMode; ascension?: number; meta?: MetaEffects; devBiome?: "cave" | "crystal" | "magma" | "lair" } | undefined;
  HighScoresScreen: undefined;
  ProgressScreen: undefined;
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
  InstructionsScreen: undefined;
  AchievementsScreen: undefined;
  ForgeScreen: undefined;
  /** `source` says where the offer was opened from (analytics + the sentence above the pitch); `floor` is the last cleared one. */
  PaywallScreen: { source?: "cover" | "floor" | "demo" | "endless"; floor?: number } | undefined;
  SettingsScreen: undefined;
};