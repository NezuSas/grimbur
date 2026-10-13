import {
  Fredoka_400Regular,
  Fredoka_500Medium,
  Fredoka_600SemiBold,
  Fredoka_700Bold,
} from '@expo-google-fonts/fredoka';

/**
 * The game's typeface: Fredoka, a rounded, friendly sans that stays legible at small sizes and has enough weight
 * for titles. Each weight is its own font file, so a `fontWeight` is turned into the matching family
 * (see `ui/components/Text.tsx`) instead of letting the platform fake a bold.
 */
export const FONT_FILES = {
  Fredoka_400Regular,
  Fredoka_500Medium,
  Fredoka_600SemiBold,
  Fredoka_700Bold,
};

export type FontFamilyName = keyof typeof FONT_FILES;

/** The family for a CSS-style weight. Anything heavier than 600 uses the bold file. */
export function familyForWeight(weight: unknown): FontFamilyName {
  const w = weight === 'bold' ? 700 : Number(weight);
  if (!Number.isFinite(w) || w <= 400) return 'Fredoka_400Regular';
  if (w <= 500) return 'Fredoka_500Medium';
  if (w <= 600) return 'Fredoka_600SemiBold';
  return 'Fredoka_700Bold';
}
