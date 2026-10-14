import type { GameMode } from "../core/engine/seed";
import type { MetaEffects } from "../core/stats/forge";
import type { LessonId } from "../core/tutorial/lessons";

export type RootStackParamList = {
  CoverScreen: undefined;
  CharactersScreen: { mode?: GameMode } | undefined;
  TutorialScreen: { characterIndex?: number; replay?: boolean; ascension?: number; meta?: MetaEffects } | undefined;
  /** `devMoves`: development only, plays these steps first so a screenshot can show explored tiles and clues. */
  LessonScreen: { lesson: LessonId; devMoves?: ("UP" | "DOWN" | "LEFT" | "RIGHT")[] };
  GameScreen: { characterIndex?: number; mode?: GameMode; ascension?: number; meta?: MetaEffects } | undefined;
  HighScoresScreen: undefined;
  ProgressScreen: undefined;
  LevelCompleteScreen: {
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