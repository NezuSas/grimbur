import { buildDailyShareText } from "../../core/stats/share";
import { GAME_CONFIG } from "../../config/gameConfig";
import type { TranslationKey } from "../../i18n/en";
import type { Params } from "../../i18n/translate";

interface Run {
  level: number;
  score: number;
  totalCoins: number;
  isVictory: boolean;
}

interface Texts {
  t: (key: TranslationKey, params?: Params) => string;
  plural: (base: never, count: number, params?: Params) => string;
}

/** The text a player shares after a run: the daily challenge has its own format (date, floors reached, streak). */
export function buildShareMessage(run: Run, opts: { isDaily: boolean; dailyDate: string; ascension: number; streak?: number }, { t, plural }: Texts): string {
  if (opts.isDaily) {
    return buildDailyShareText({
      dateKey: opts.dailyDate,
      level: run.level,
      floors: GAME_CONFIG.expedition.floors,
      victory: run.isVictory,
      title: n => t("share.daily.title", { n }),
      scoreText: t("share.daily.score", { score: run.score.toLocaleString() }),
      streakText: opts.streak ? plural("over.streak" as never, opts.streak) : "",
      footer: t("share.daily.footer"),
    });
  }
  return t("share.run", {
    depth: opts.ascension > 0 ? ` · ${t(`ascension.label.${opts.ascension}` as TranslationKey)}` : "",
    result: run.isVictory ? t("share.won") : t("share.reached", { floor: run.level }),
    score: run.score.toLocaleString(),
    gems: plural("common.gems" as never, run.totalCoins),
  });
}
