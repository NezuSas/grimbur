import type { ImageSourcePropType } from 'react-native';
import type { AchievementInfo, DescKind } from '../core/stats/achievements';
import characters from '../data/characters';

const art = {
  games: require('../assets/sprites/achievements/Ach_Games.png'),
  floor: require('../assets/sprites/achievements/Ach_Floor.png'),
  gems: require('../assets/sprites/achievements/Ach_Gems.png'),
  relics: require('../assets/sprites/achievements/Ach_Relics.png'),
  forge: require('../assets/sprites/achievements/Ach_Forge.png'),
  embers: require('../assets/sprites/achievements/Ach_Embers.png'),
  wins: require('../assets/sprites/achievements/Ach_Wins.png'),
  score: require('../assets/sprites/achievements/Ach_Score.png'),
  depthWin: require('../assets/sprites/achievements/Ach_Depth.png'),
  streak: require('../assets/sprites/achievements/Ach_Streak.png'),
  dailyRuns: require('../assets/sprites/achievements/Ach_Daily.png'),
  dailyWins: require('../assets/sprites/achievements/Ach_DailyWin.png'),
  endless: require('../assets/sprites/achievements/Ach_Endless.png'),
  achCount: require('../assets/sprites/achievements/Ach_Collector.png'),
  speed: require('../assets/sprites/achievements/Ach_Speed.png'),
  heroes: require('../assets/sprites/achievements/Ach_Heroes.png'),
} as const;

/** Achievements whose shared description does not name their theme. */
const BY_ID: Partial<Record<string, ImageSourcePropType>> = {
  speedrunner: art.speed,
  lightning: art.speed,
  swift: art.speed,
  blink: art.speed,
  hero_variety: art.heroes,
  all_hero_wins: art.heroes,
  first_steps: art.games,
  first_descent: art.floor,
  first_relic: art.relics,
  first_forge: art.forge,
  first_gems: art.gems,
};

/** The win-with-a-hero achievements show that hero's own portrait. */
const HERO_WIN: Record<string, number> = { win_vael: 0, win_sera: 1, win_borin: 2, win_auric: 3, win_mira: 4, win_bram: 5 };

const BY_KIND: Partial<Record<DescKind, ImageSourcePropType>> = {
  games: art.games,
  floor: art.floor,
  gems: art.gems,
  relics: art.relics,
  forge: art.forge,
  embers: art.embers,
  wins: art.wins,
  score: art.score,
  depthWin: art.depthWin,
  streak: art.streak,
  dailyRuns: art.dailyRuns,
  dailyWins: art.dailyWins,
  endless: art.endless,
  achCount: art.achCount,
  winTime: art.speed,
  heroWin: art.heroes,
};

/** The painted emblem of an achievement (every one has one: by id, by its hero, or by the theme of its description). */
export function achievementArt(a: Pick<AchievementInfo, 'id' | 'desc'>): ImageSourcePropType {
  if (a.id in HERO_WIN) return characters[HERO_WIN[a.id]].scoreImage;
  return BY_ID[a.id] ?? (a.desc ? BY_KIND[a.desc] : undefined) ?? art.games;
}

export const allAchievementArt = (): ImageSourcePropType[] => Object.values(art);
