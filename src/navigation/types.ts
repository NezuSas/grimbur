import type { GameMode } from "../core/engine/seed";
import type { MetaEffects } from "../core/stats/forge";

export type RootStackParamList = {
  CoverScreen: undefined;
  CharactersScreen: { mode?: GameMode } | undefined;
  TutorialScreen: { characterIndex?: number; replay?: boolean } | undefined;
  GameScreen: { characterIndex?: number; skipLoading?: boolean; mode?: GameMode; ascension?: number; meta?: MetaEffects } | undefined;
  HighScoresScreen: undefined;
  LevelCompleteScreen: {
    score: number;
    level: number;
    coins: number;
    totalCoins: number;
    sessionCoins: number;
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