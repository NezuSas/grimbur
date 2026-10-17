import type { Standing } from "../../core/duel/duel";
import type { TranslationKey } from "../../i18n/en";
import type { Params } from "../../i18n/translate";
import type { RivalView } from "./useDuel";

export interface DuelResultView {
  headline: string;
  line: string;
  /** A second line about the embers (empty without a stake). */
  prize: string;
  color: string;
}

const best = (rivals: readonly RivalView[]): RivalView | null =>
  [...rivals].sort((a, b) => (b.victory ? 1 : 0) - (a.victory ? 1 : 0) || b.level - a.level || b.score - a.score)[0] ?? null;

/**
 * What the result card says about a duel once this player's run is over. A player who has already been beaten for good is told at once
 * (they do not wait for the others to finish); one who is ahead is told so, and that it is not final yet.
 */
export function duelResultView(
  standing: Standing | null,
  rivals: readonly RivalView[],
  stake: number,
  prize: number,
  code: string,
  t: (key: TranslationKey, params?: Params) => string,
): DuelResultView | null {
  if (!standing) return null;
  const top = best(rivals);
  if (!top) return { headline: t("duel.label", { code }), line: t("duel.result.noRival"), prize: "", color: "#b9b4d4" };
  const params = { name: top.name, floor: top.level, score: top.score.toLocaleString() };
  const place = standing.total > 2 ? `${t("duel.result.place", { n: standing.placement, total: standing.total })} · ` : "";
  const rivalLine = top.status === "away" ? t("duel.result.away", params) : top.status === "done" ? t("duel.result.final", params) : t("duel.result.waiting", params);
  switch (standing.state) {
    case "won":
      return { headline: t("duel.result.win"), line: rivalLine, prize: stake > 0 ? t("duel.result.prize", { n: prize > 0 ? prize : "…" }) : "", color: "#9EE37D" };
    case "lost":
      return { headline: t("duel.result.lose"), line: place + rivalLine, prize: stake > 0 ? t("duel.result.lostStake", { n: stake }) : "", color: "#FF8A80" };
    case "tie":
      return { headline: t("duel.result.tie"), line: rivalLine, prize: stake > 0 ? t("duel.result.refund", { n: stake }) : "", color: "#FFD54F" };
    case "leading":
      return { headline: t("duel.result.leading"), line: rivalLine, prize: "", color: "#9EE37D" };
    default:
      return { headline: t("duel.result.trailing"), line: place + rivalLine, prize: "", color: "#FFAB91" };
  }
}
