import {
  AlegreyaSans_400Regular,
  AlegreyaSans_500Medium,
  AlegreyaSans_700Bold,
  AlegreyaSans_800ExtraBold,
  AlegreyaSans_900Black,
} from '@expo-google-fonts/alegreya-sans';
import { Cinzel_700Bold, Cinzel_900Black } from '@expo-google-fonts/cinzel';

/**
 * The game's typefaces, matching the dark-fantasy art: Alegreya Sans (a humanist sans with calligraphic roots that stays
 * legible at small sizes) for text and numbers, and Cinzel (letters cut like a stone inscription) for titles. Each weight
 * is its own font file, so a `fontWeight` is turned into the matching family (see `ui/components/Text.tsx`) instead of
 * letting the platform fake a bold. The previous rounded face (Fredoka) is in tag style-v1.
 */
export const FONT_FILES = {
  AlegreyaSans_400Regular,
  AlegreyaSans_500Medium,
  AlegreyaSans_700Bold,
  AlegreyaSans_800ExtraBold,
  AlegreyaSans_900Black,
  Cinzel_700Bold,
  Cinzel_900Black,
};

export type FontFamilyName = keyof typeof FONT_FILES;

/** Text this large and heavy is a title and gets the inscription face. */
const TITLE_SIZE = 20;

function weightOf(weight: unknown): number {
  const w = weight === 'bold' ? 700 : Number(weight);
  return Number.isFinite(w) ? w : 400;
}

/** The family for a CSS-style weight (and, when given, a font size: large heavy text is a title). */
export function familyForWeight(weight: unknown, fontSize?: unknown): FontFamilyName {
  const w = weightOf(weight);
  if (typeof fontSize === 'number' && fontSize >= TITLE_SIZE && w >= 800) {
    return w >= 900 ? 'Cinzel_900Black' : 'Cinzel_700Bold';
  }
  if (w <= 400) return 'AlegreyaSans_400Regular';
  if (w <= 500) return 'AlegreyaSans_500Medium';
  if (w <= 700) return 'AlegreyaSans_700Bold';
  if (w <= 800) return 'AlegreyaSans_800ExtraBold';
  return 'AlegreyaSans_900Black';
}

