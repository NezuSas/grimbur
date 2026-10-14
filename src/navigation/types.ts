import type { GameMode } from "../core/engine/seed";
import type { MetaEffects } from "../core/stats/forge";
import type { LessonId } from "../core/tutorial/lessons";

export type RootStackParamList = {
  CoverScreen: undefined;
  CharactersScreen: { mode?: GameMode } | undefined;
  TutorialScreen: { characterIndex?: number; replay?: boolean; ascension?: number; meta?: MetaEffects } | undefined;
  LessonScreen: { lesson: LessonId };
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
  SettingsScreen: undefined;
};