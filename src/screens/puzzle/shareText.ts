import { GAME_CONFIG } from "../../config/gameConfig";
import type { TranslationKey } from "../../i18n/en";

type T = (key: TranslationKey, params?: Record<string, string | number>) => string;

/** m:ss, for a solve of `seconds`. */
export const formatSolveTime = (seconds: number): string => {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

/**
 * The day's puzzle as a few lines to paste in a chat, the way word puzzles are shared: its number and level, the stars and time,
 * the slips as icons (no words to translate in the middle), the streak, and a dare with the store link.
 */
export function puzzleShareText(
  t: T,
  r: { number: number; tier: string; stars: number; seconds: number; mistakes: number; hints: number; streak: number },
): string {
  const stars = "⭐".repeat(r.stars) + "▫️".repeat(Math.max(0, 3 - r.stars));
  const lines = [
    t("puzzle.shareTitle", { n: r.number, tier: r.tier }),
    `${stars}  ⏱ ${formatSolveTime(r.seconds)}`,
    r.mistakes === 0 && r.hints === 0 ? t("puzzle.shareClean") : `❌ ${r.mistakes}  💡 ${r.hints}`,
  ];
  if (r.streak > 1) lines.push(`🔥 ${t("puzzle.shareStreak", { n: r.streak })}`);
  lines.push("", t("puzzle.shareDare"), GAME_CONFIG.store.url);
  return lines.join("\n");
}

/** The weekly challenge's counted try, to paste in a chat: beaten (and how fast) or not, and the dare. */
export function weeklyShareText(t: T, r: { number: number; solved: boolean; seconds: number }): string {
  const lines = [t("puzzle.shareWeeklyTitle", { n: r.number }), r.solved ? `💀 ✅  ⏱ ${formatSolveTime(r.seconds)}` : "💀 ❌", "", t("puzzle.shareWeeklyDare"), GAME_CONFIG.store.url];
  return lines.join("\n");
}

/** A crowned puzzle of the path, to paste in a chat: its number and level, the crown and the time, and the dare. */
export function crownShareText(t: T, r: { number: number; tier: string; seconds: number }): string {
  const lines = [t("puzzle.shareCrownTitle", { n: r.number, tier: r.tier }), `⭐⭐⭐ 👑  ⏱ ${formatSolveTime(r.seconds)}`, "", t("puzzle.shareDare"), GAME_CONFIG.store.url];
  return lines.join("\n");
}
