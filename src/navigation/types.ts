import type { GameMode } from "../core/engine/seed";

export type RootStackParamList = {
  CoverScreen: undefined;
  CharactersScreen: { mode?: GameMode } | undefined;
  GameScreen: { characterIndex?: number; skipLoading?: boolean; mode?: GameMode } | undefined;
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
  SettingsScreen: undefined;
};