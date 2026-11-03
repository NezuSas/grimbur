import type { ImageSourcePropType } from 'react-native';

/**
 * Painted replacements for the emoji glyphs the UI used to borrow from the system font
 * (which render differently on every phone and clash with the game's art). One Figma
 * sheet, cut by scripts/sliceIconGrid.py; gem/shield/arrows reuse the in-game item art.
 */
export const GLYPHS = {
  trophy: require('../assets/sprites/ui/Icon_Trophy.webp'),
  medal: require('../assets/sprites/ui/Icon_Medal.webp'),
  calendar: require('../assets/sprites/ui/Icon_Calendar.webp'),
  swords: require('../assets/sprites/ui/Icon_Swords.webp'),
  padlock: require('../assets/sprites/ui/Icon_Padlock.webp'),
  hammer: require('../assets/sprites/ui/Icon_Hammer.webp'),
  puzzle: require('../assets/sprites/ui/Icon_Puzzle.webp'),
  riddle: require('../assets/sprites/ui/Icon_Riddle.webp'),
  skull: require('../assets/sprites/ui/Icon_Skull.webp'),
  trap: require('../assets/sprites/ui/Icon_Trap.webp'),
  monster: require('../assets/sprites/ui/Icon_Monster.webp'),
  star: require('../assets/sprites/ui/Icon_Star.webp'),
  flag: require('../assets/sprites/ui/Icon_Flag.webp'),
  gem: require('../assets/sprites/items/Icon_Gem.webp'),
  shield: require('../assets/sprites/items/Icon_Shield.webp'),
  arrows: require('../assets/sprites/items/Icon_Arrows.webp'),
  play: require('../assets/sprites/ui/Icon_Play.webp'),
  infinity: require('../assets/sprites/ui/Icon_Infinity.webp'),
  flame: require('../assets/sprites/ui/Icon_Flame.webp'),
  bolt: require('../assets/sprites/ui/Icon_Bolt.webp'),
  sparkles: require('../assets/sprites/ui/Icon_Sparkles.webp'),
  brush: require('../assets/sprites/ui/Icon_Brush.webp'),
  tunic: require('../assets/sprites/ui/Icon_Tunic.webp'),
  book: require('../assets/sprites/ui/Icon_Book.webp'),
  lantern: require('../assets/sprites/relics/lantern.webp'),
  frame: require('../assets/sprites/cosmetics/Frame_Gold.png'),
} satisfies Record<string, ImageSourcePropType>;

export type GlyphName = keyof typeof GLYPHS;
