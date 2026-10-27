import { buildDailyShareText, dailyNumber, dailyPips } from "../../core/stats/share";
import { GAME_CONFIG } from "../../config/gameConfig";
import { formatChallengeCode } from "../../core/challenge/code";
import { formatTime } from "../../shared/utils/formatTime";
import type { TranslationKey } from "../../i18n/en";
import type { Params } from "../../i18n/translate";
import type { Character } from "../../data/characters";
import type { ShareCardData } from "../../ui/components/ShareCard";
import { buildRouteGrid, type RouteMark } from "./routeGrid";

interface Run {
  level: number;
  score: number;
  totalCoins: number;
  isVictory: boolean;
  /** Seconds played. */
  time: number;
}

interface Opts {
  isDaily: boolean;
  dailyDate: string;
  ascension: number;
  streak?: number;
  endless?: boolean;
  heroName: string;
  /** The friend challenge the run belonged to: the message invites to the same cave. */
  challengeCode?: string;
  /** The daily's route, one list of marks per floor: drawn instead of one square per floor when there is one. */
  route?: RouteMark[][];
}

interface Texts {
  t: (key: TranslationKey, params?: Params) => string;
  plural: (base: never, count: number, params?: Params) => string;
}

const depthLabel = (ascension: number, t: Texts["t"]) => (ascension > 0 ? t(`ascension.label.${ascension}` as TranslationKey) : "");
const resultOf = (run: Run, endless: boolean, t: Texts["t"]) => (endless ? t("share.endless", { floor: run.level }) : run.isVictory ? t("share.won") : t("share.reached", { floor: run.level }));

/** The text a player shares after a run: the daily challenge has its own format (date, floors reached, streak). */
export function buildShareMessage(run: Run, opts: Opts, { t, plural }: Texts): string {
  if (opts.isDaily) {
    const text = buildDailyShareText({
      dateKey: opts.dailyDate,
      level: run.level,
      floors: GAME_CONFIG.expedition.floors,
      victory: run.isVictory,
      title: n => t("share.daily.title", { n }),
      scoreText: t("share.daily.score", { score: run.score.toLocaleString() }),
      streakText: opts.streak ? plural("over.streak" as never, opts.streak) : "",
      footer: t("share.daily.footer"),
    });
    const grid = opts.route ? buildRouteGrid(opts.route, run.isVictory ? "victory" : "defeat") : "";
    const withRoute = grid ? text.replace(dailyPips(run.level, GAME_CONFIG.expedition.floors, run.isVictory), grid) : text;
    return `${withRoute}\n${GAME_CONFIG.store.url}`;
  }
  const depth = depthLabel(opts.ascension, t);
  const lines = [t("share.title", { hero: opts.heroName, depth: depth ? ` · ${depth}` : "" })];
  if (!opts.endless) lines.push(dailyPips(run.level, GAME_CONFIG.expedition.floors, run.isVictory));
  lines.push(t("share.line", { result: resultOf(run, !!opts.endless, t), score: run.score.toLocaleString(), gems: plural("common.gems" as never, run.totalCoins), time: formatTime(run.time) }));
  lines.push(opts.challengeCode ? t("share.challenge", { code: formatChallengeCode(opts.challengeCode) }) : t("share.invite"));
  lines.push(GAME_CONFIG.store.url);
  return lines.join("\n");
}

/** The same result as the data of the picture that is shared. */
export function buildShareCard(run: Run, opts: Opts, { t, plural }: Texts, character: Character): ShareCardData {
  const depth = depthLabel(opts.ascension, t);
  return {
    character,
    heroName: opts.heroName,
    headline: opts.isDaily ? (run.isVictory ? t("share.won") : t("share.reached", { floor: run.level })) : resultOf(run, !!opts.endless, t),
    score: run.score,
    level: run.level,
    floors: opts.endless ? 0 : GAME_CONFIG.expedition.floors,
    victory: run.isVictory && !opts.endless,
    gems: plural("common.gems" as never, run.totalCoins),
    time: formatTime(run.time),
    depth: depth || undefined,
    daily: opts.isDaily ? t("share.daily.label", { n: dailyNumber(opts.dailyDate) }) : undefined,
    streak: opts.isDaily && opts.streak ? plural("over.streak" as never, opts.streak) : undefined,
    invite: opts.challengeCode ? t("share.challenge", { code: formatChallengeCode(opts.challengeCode) }) : opts.isDaily ? t("share.daily.footer") : t("share.invite"),
    scoreLabel: t("share.score"),
  };
}
