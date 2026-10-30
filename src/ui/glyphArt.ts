import type { ImageSourcePropType } from 'react-native';

/**
 * Painted replacements for the emoji glyphs the UI used to borrow from the system font
 * (which render differently on every phone and clash with the game's art). One Figma
 * sheet, cut by scripts/sliceIconGrid.py; gem/shield/arrows reuse the in-game item art.
 */
export const GLYPHS = {
  trophy: require('../assets/sprites/ui/Icon_Trophy.png'),
  medal: require('../assets/sprites/ui/Icon_Medal.png'),
  calendar: require('../assets/sprites/ui/Icon_Calendar.png'),
  swords: require('../assets/sprites/ui/Icon_Swords.png'),
  padlock: require('../assets/sprites/ui/Icon_Padlock.png'),
  hammer: require('../assets/sprites/ui/Icon_Hammer.png'),
  puzzle: require('../assets/sprites/ui/Icon_Puzzle.png'),
  skull: require('../assets/sprites/ui/Icon_Skull.png'),
  trap: require('../assets/sprites/ui/Icon_Trap.png'),
  monster: require('../assets/sprites/ui/Icon_Monster.png'),
  star: require('../assets/sprites/ui/Icon_Star.png'),
  flag: require('../assets/sprites/ui/Icon_Flag.png'),
  gem: require('../assets/sprites/items/Icon_Gem.png'),
  shield: require('../assets/sprites/items/Icon_Shield.png'),
  arrows: require('../assets/sprites/items/Icon_Arrows.png'),
  play: require('../assets/sprites/ui/Icon_Play.png'),
  infinity: require('../assets/sprites/ui/Icon_Infinity.png'),
  flame: require('../assets/sprites/ui/Icon_Flame.png'),
  bolt: require('../assets/sprites/ui/Icon_Bolt.png'),
  sparkles: require('../assets/sprites/ui/Icon_Sparkles.png'),
  brush: require('../assets/sprites/ui/Icon_Brush.png'),
  tunic: require('../assets/sprites/ui/Icon_Tunic.png'),
  book: require('../assets/sprites/ui/Icon_Book.png'),
  lantern: require('../assets/sprites/relics/lantern.png'),
  frame: require('../assets/sprites/cosmetics/Frame_Gold.png'),
} satisfies Record<string, ImageSourcePropType>;

export type GlyphName = keyof typeof GLYPHS;
