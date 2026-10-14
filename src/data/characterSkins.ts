import characters, { type Character } from './characters';
import { skinArt, type SkinId } from './skinArt';

/** A hero with an outfit on: the same character with the images of that skin (classic = the original art). */
export const characterWithSkin = (heroIndex: number, skin: SkinId = 'classic'): Character => {
  const base = characters[heroIndex] ?? characters[0];
  return skin === 'classic' ? base : { ...base, ...skinArt(heroIndex, skin) };
};
