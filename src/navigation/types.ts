export type RootStackParamList = {
  CoverScreen: undefined;
  CharactersScreen: undefined;
  GameScreen: { characterIndex?: number; skipLoading?: boolean } | undefined;
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