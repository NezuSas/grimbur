import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import Snowfall from "../ui/components/Snowfall";
import { isYuleDay } from "../core/events/yule";
import { ImageBackground, Platform, Share, StatusBar, StyleSheet, TouchableOpacity, View } from "react-native";
import { useWindowDimensions } from "../ui/layout/scaledWindow";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Text from "../ui/components/Text";
import SpriteImage from "../ui/components/SpriteImage";
import EmberIcon from "../ui/components/EmberIcon";
import BoardView from "../ui/components/BoardView";
import { CLUE_ART } from "../ui/components/GridCell";
import DangerVignette from "../ui/components/game/DangerVignette";
import { getNearbyHazards } from "../core/engine/proximity";
import { useHeartbeat } from "./game/useHeartbeat";
import Controls from "../ui/components/DirectionPad";
import OverlayContainer from "../ui/components/game/OverlayContainer";
import { PopButton, PopLink, PopupPanel, popupTitleStyle } from "../ui/components/game/popup";
import { GAME_ROW_PADDING, MIN_TOUCH, useGameLayout } from "../ui/layout/useGameLayout";
import { RootStackParamList } from "../navigation/types";
import { gameReducer, initialState } from "../core/engine/reducer";
import { Direction, GameAction, GameState } from "../core/engine/types";
import { NO_PERKS } from "../core/engine/heroes";
import { stepTarget, travelPath } from "../core/engine/travel";
import { provenByLevel } from "../core/puzzles/deduction";
import { dailyKey } from "../core/engine/seed";
import { PUZZLE_COUNT, PUZZLES_PER_TIER, dailyPuzzle, endlessPuzzle, isStrictTier, legendTime, pathPuzzle, puzzleStars, type Puzzle } from "../core/puzzles/puzzles";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { finishWeeklyTry, peekLocalStats, recordPuzzle, startWeeklyTry } from "../services/localStats";
import { submitWeeklyScore } from "../services/weeklyScores";
import { weekOf, weeklyNumber, weeklyPuzzle } from "../core/puzzles/weekly";
import characters from "../data/characters";
import { emitSound } from "../audio/audioEventBus";
import { haptic, NotificationFeedbackType } from "../shared/haptics";
import { useSettingsStore } from "../state/settings/store";
import { useT } from "../i18n/useT";
import type { TranslationKey } from "../i18n/en";
import { analytics } from "../services/analytics";
import { achievementText } from "../i18n/keys";
import type { AchievementId } from "../core/stats/achievements";
import { dailyPuzzleNumber, dailyPuzzleStreak, weeklyState } from "../core/stats/puzzleProgress";
import { crownShareText, formatSolveTime, puzzleShareText, weeklyShareText } from "./puzzle/shareText";
import { besideOf, failWarning, hintReason, type HintReason } from "../core/puzzles/hintReason";
import PuzzleIntro from "./puzzle/PuzzleIntro";
import LiveStars from "./puzzle/LiveStars";
import ToolBar, { type PuzzleTool } from "./puzzle/ToolBar";
import { actionOf } from "../core/input/keyBindings";
import PuzzleGuide from "./puzzle/PuzzleGuide";
import KeyHint from "../ui/components/KeyHint";
import type { TileNote } from "../ui/components/BoardView";
import { CountUp, DropIn, FlyingStars, numbersAt } from "./puzzle/resultParts";
import GemShower from "../ui/components/game/GemShower";
import { TIER_TINTS } from "./puzzle/ChapterMap";
import { hasCrown, puzzleBestTime } from "../core/stats/puzzleProgress";
import { submitPuzzleScore } from "../services/puzzleScores";
import { techniqueOf } from "../core/puzzles/techniques";

type Props = NativeStackScreenProps<RootStackParamList, "PuzzleScreen">;

const TINT = "#4DD0E1";
const HAZARDS = new Set(["enemy", "pit"]);
/** The pause after the last gem, while the board shows where the hazards were, before the result card. */
const REVEAL_MS = 1500;

/** A puzzle restarts from its own opening board, which the game reducer does not know about. */
type PuzzleAction = GameAction | { type: "PUZZLE_SET"; state: GameState };
const puzzleReducer = (state: GameState, action: PuzzleAction): GameState => (action.type === "PUZZLE_SET" ? action.state : gameReducer(state, action));

/** The opening board: the real game state, with the hero on the puzzle's start and its patch already explored. */
function openingState(p: Puzzle, hero: number): GameState {
  const reset = gameReducer(initialState, {
    type: "RESET",
    character: characters[hero] ?? characters[0],
    rows: p.rows,
    cols: p.cols,
    entities: p.entities.map(e => ({ ...e })),
    coins: p.entities.filter(e => e.type === "coin").length,
    attack: 0,
    seed: 1,
    perks: NO_PERKS,
  });
  return { ...reset, playerIndex: p.start, visited: [...p.visited], undo: null, secret: null, encounter: null };
}

/**
 * A puzzle of the cave: a half-explored floor where every gem can be reached by reading the clues alone. The hero walks with the
 * pad or by tapping a tile (a known tile is reached by the safe way round); a long press flags a tile. Stepping on a hazard is a
 * mistake: the hazard shows and the puzzle starts over. The hint lights one tile the clues already prove safe.
 */
export default function PuzzleScreen({ navigation, route }: Props) {
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const { controlPanelWidth, hudHeight } = useGameLayout();
  const { width: winWidth, height: winHeight } = useWindowDimensions();
  const ui = Math.max(1, Math.min(1.5, winWidth / 900, winHeight / 540));
  const controlPosition = useSettingsStore(s => s.controlPosition);
  const calm = useSettingsStore(s => s.reduceFlash);
  const hero = useSettingsStore(s => s.lastHero);
  // The first puzzle of the path explains itself once.
  const guideSeen = useSettingsStore(s => s.hintsSeen.includes("puzzle-guide"));
  const markHintSeen = useSettingsStore(s => s.markHintSeen);

  const target = route.params.target;
  const today = useMemo(() => dailyKey(), []);
  const isDaily = target === "daily";
  // A past puzzle of the day, replayed from the archive: stars only (no embers, no streak, not on the friends' board).
  const archiveDate = target === "archive" && route.params.date && /^\d{4}-\d{2}-\d{2}$/.test(route.params.date) ? route.params.date : null;
  const isArchive = !!archiveDate;
  // The Grimbur's weekly challenge: its counted try (one mistake ends it, no hints, leaving it is a failed try) or practice.
  const isWeekly = target === "weekly";
  const week = useMemo(() => weekOf(today), [today]);
  const practice = isWeekly && !!route.params.practice;
  const counted = useRef(isWeekly && !practice);
  const isEndless = target === "endless";
  // A technique of the Manual: a small practice board, no stars or embers.
  const technique = target === "technique" ? techniqueOf(route.params.tech) : undefined;
  const isTechnique = !!technique;
  const endlessN = Math.max(0, Math.trunc(route.params.n ?? 0));
  const index = typeof target === "number" ? Math.max(0, Math.min(PUZZLE_COUNT - 1, Math.trunc(target))) : -1;
  const puzzle = useMemo(
    () => (technique ? technique.puzzle : isWeekly ? weeklyPuzzle(week) : isDaily ? dailyPuzzle(today) : archiveDate ? dailyPuzzle(archiveDate) : isEndless ? endlessPuzzle(endlessN) : pathPuzzle(Math.max(0, index))),
    [technique, isWeekly, week, isDaily, archiveDate, isEndless, endlessN, today, index],
  );
  const gems = puzzle.entities.filter(e => e.type === "coin").length;
  const strict = isWeekly || (!technique && index >= 0 && isStrictTier(puzzle.tier));
  // The path's puzzles have a legend time: three stars under it win the crown. The clock runs in the banner.
  const legend = useMemo(() => (index >= 0 && !technique ? legendTime(puzzle) : 0), [index, technique, puzzle]);

  const [state, dispatch] = useReducer(puzzleReducer, puzzle, p => openingState(p, hero));
  // The opening card first (not for a Manual technique, which teaches from its banner); the board then opens from the fog in a
  // ripple, and opens that way again after every restart.
  const [introDone, setIntroDone] = useState(isTechnique);
  const [boardLevel, setBoardLevel] = useState(isTechnique ? 1 : 0);
  const [introInfo] = useState(() => {
    const saved = peekLocalStats()?.puzzles;
    return { best: index >= 0 ? puzzleBestTime(saved, index) : 0, crowned: index >= 0 && hasCrown(saved, index) };
  });
  // Why the last step was a mistake: the clue that warned of it (shown as a red ray while the hazard shows).
  const [failWhy, setFailWhy] = useState<ReturnType<typeof failWarning>>(null);
  const [mistakes, setMistakes] = useState(0);
  const [hints, setHints] = useState(0);
  const [hintTile, setHintTile] = useState<number | null>(null);
  const [hintWhy, setHintWhy] = useState<HintReason | null>(null);
  const [fail, setFail] = useState<{ tile: number; kind: string } | null>(null);
  // A strict puzzle (the Legend): one mistake ends the try, and it is started again only by choice.
  const [failedOut, setFailedOut] = useState(false);
  const [flags, setFlags] = useState<ReadonlySet<number>>(() => new Set(technique?.flags ?? []));
  // What a tap on the board does, and the player's pencil marks on hidden tiles.
  const [tool, setTool] = useState<PuzzleTool>("walk");
  const [notes, setNotes] = useState<ReadonlyMap<number, TileNote>>(() => new Map());
  const [result, setResult] = useState<{ stars: number; embers: number; achievements: AchievementId[]; seconds: number; streak: number; run: number; record?: boolean; best?: number; crown?: boolean; weeklyWon?: boolean } | null>(null);
  // The result card's main way on (Enter on a keyboard presses it).
  const resultPrimary = useRef<null | (() => void)>(null);
  // The whole time spent on it, restarts included: what a shared result tells.
  const startedAt = useRef(0);
  useEffect(() => {
    startedAt.current = Date.now();
  }, []);
  // The weekly challenge's counted try is spent from the moment the board opens; left before it ends, it ends as failed.
  const weeklyOpen = useRef(false);
  useEffect(() => {
    if (!counted.current) return;
    // Opened from a stale screen after the try was spent: it is practice.
    if (weeklyState(peekLocalStats()?.puzzles, week).kind === "used") {
      counted.current = false;
      return;
    }
    weeklyOpen.current = true;
    void startWeeklyTry(week);
    return () => {
      if (!weeklyOpen.current) return;
      weeklyOpen.current = false;
      const seconds = (Date.now() - startedAt.current) / 1000;
      void finishWeeklyTry(week, false, seconds);
      void submitWeeklyScore({ week, solved: false, seconds, characterIndex: hero });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const walking = useRef<ReturnType<typeof setTimeout> | null>(null);
  const failTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  const solved = state.coins === 0 && gems > 0;

  useEffect(() => {
    analytics.track("screen_view", { screen: isDaily ? "puzzle_daily" : isArchive ? "puzzle_archive" : isEndless ? "puzzle_endless" : `puzzle_${index + 1}` });
    return () => {
      if (walking.current) clearTimeout(walking.current);
      if (failTimer.current) clearTimeout(failTimer.current);
    };
  }, [isDaily, isEndless, index]);

  const stopWalking = () => {
    if (walking.current) clearTimeout(walking.current);
    walking.current = null;
  };

  // Back to the opening board. After a mistake the player's flags and notes stay (the board is the same, and so is what they
  // worked out); the restart button clears them too.
  const restart = useCallback(
    (keepMarks: boolean) => {
      stopWalking();
      dispatch({ type: "PUZZLE_SET", state: openingState(puzzle, hero) });
      setFail(null);
      setFailWhy(null);
      setHintTile(null);
      setBoardLevel(l => l + 1);
      if (!keepMarks) {
        setFlags(new Set(technique?.flags ?? []));
        setNotes(new Map());
      }
    },
    [puzzle, hero, technique],
  );

  // Same sounds as a run for the few things a puzzle does.
  const lastState = useRef(state);
  useEffect(() => {
    const prev = lastState.current;
    lastState.current = state;
    if (prev === state) return;
    if (state.totalCoins > prev.totalCoins) emitSound("COIN_COLLECTED");
    else if (state.playerIndex !== prev.playerIndex) emitSound("MOVE");
    if (hintTile !== null && state.visited.includes(hintTile)) setHintTile(null);
  }, [state, hintTile]);

  // Every gem collected: the stars are counted and saved once.
  const saved = useRef(false);
  useEffect(() => {
    if (!solved || saved.current) return;
    saved.current = true;
    stopWalking();
    const stars = puzzleStars(mistakes, hints);
    haptic.notify(NotificationFeedbackType.Success);
    emitSound("LEVEL_UP");
    // The board shows where every hazard was (and whether each flag was right) before the card comes up.
    analytics.track("puzzle_solved", { puzzle: isTechnique ? "technique" : isDaily ? "daily" : isArchive ? "archive" : isEndless ? "endless" : index + 1, stars, mistakes, hints });
    const seconds = (Date.now() - startedAt.current) / 1000;
    if (isTechnique) {
      setTimeout(() => setResult({ stars, embers: 0, achievements: [], seconds, streak: 0, run: 0 }), REVEAL_MS);
      return;
    }
    if (isWeekly) {
      if (!weeklyOpen.current) {
        setTimeout(() => setResult({ stars, embers: 0, achievements: [], seconds, streak: 0, run: 0 }), REVEAL_MS);
        return;
      }
      weeklyOpen.current = false;
      void submitWeeklyScore({ week, solved: true, seconds, characterIndex: hero });
      finishWeeklyTry(week, true, seconds)
        .then(r => setTimeout(() => setResult({ stars, embers: r.embers, achievements: r.achievements, seconds, streak: 0, run: 0, weeklyWon: true }), REVEAL_MS))
        .catch(() => setTimeout(() => setResult({ stars, embers: 0, achievements: [], seconds, streak: 0, run: 0, weeklyWon: true }), REVEAL_MS));
      return;
    }
    // The day's try goes to the friends' board (kept only when better than an earlier one).
    if (isDaily) void submitPuzzleScore({ date: today, stars, mistakes, hints, seconds, characterIndex: hero });
    const show = (embers: number, achievements: AchievementId[] = [], streak = 0, run = 0, record = false, best = 0, crown = false) =>
      setTimeout(() => setResult({ stars, embers, achievements, seconds, streak, run, record, best, crown }), REVEAL_MS);
    recordPuzzle(isDaily ? { kind: "daily", date: today } : archiveDate ? { kind: "archive", date: archiveDate } : isEndless ? { kind: "endless", n: endlessN } : { kind: "path", index }, stars, seconds, legend)
      .then(r => show(r.embers, r.achievements, dailyPuzzleStreak(r.stats.puzzles, today), r.stats.puzzles?.endless.run ?? 0, r.record, r.best, r.crown))
      .catch(() => show(0));
  }, [solved]);

  /** One step; a hidden hazard there is a mistake and the puzzle starts over. */
  const stepTo = useCallback(
    (direction: Direction): boolean => {
      const s = stateRef.current;
      if (fail || s.coins === 0) return false;
      const to = stepTarget(s.playerIndex, direction, s.rows, s.cols);
      if (to === -1 || to === s.playerIndex) {
        dispatch({ type: "MOVE", direction });
        return false;
      }
      const thing = s.entityMap[to];
      if (thing && HAZARDS.has(thing.type)) {
        // A flagged hazard refuses the step, as in a run.
        if (flags.has(to)) return false;
        stopWalking();
        setFail({ tile: to, kind: thing.type });
        setFailWhy(failWarning(s.rows, s.cols, s.entities, s.visited, to));
        setMistakes(m => m + 1);
        haptic.notify(NotificationFeedbackType.Error);
        emitSound("GAME_OVER");
        if (strict) {
          // The weekly challenge's counted try ends here, failed.
          if (weeklyOpen.current) {
            weeklyOpen.current = false;
            const seconds = (Date.now() - startedAt.current) / 1000;
            void finishWeeklyTry(week, false, seconds);
            void submitWeeklyScore({ week, solved: false, seconds, characterIndex: hero });
          }
          failTimer.current = setTimeout(() => setFailedOut(true), 1300);
        }
        else if (!(__DEV__ && route.params.devHold)) failTimer.current = setTimeout(() => restart(true), 3600);
        return false;
      }
      dispatch({ type: "MOVE", direction });
      return true;
    },
    [fail, flags, restart, strict],
  );

  const move = useCallback((direction: Direction) => {
    stopWalking();
    stepTo(direction);
  }, [stepTo]);

  // A note on a hidden tile goes round: safe, not a guardian, not a vortex, none.
  const cycleNote = useCallback((tile: number) => {
    if (stateRef.current.visited.includes(tile)) return;
    haptic.impact();
    setNotes(prev => {
      const next = new Map(prev);
      const now = prev.get(tile);
      const after: TileNote | undefined = now === undefined ? "safe" : now === "safe" ? "noGuardian" : now === "noGuardian" ? "noVortex" : undefined;
      if (after) next.set(tile, after);
      else next.delete(tile);
      return next;
    });
  }, []);

  // Tapping a tile: with the flag or note tool it marks it; walking, next to the hero it is one step (into the fog too) and
  // farther, the hero walks there over explored tiles.
  const toolRef = useRef(tool);
  toolRef.current = tool;
  const tapTile = useCallback(
    (tile: number) => {
      const s = stateRef.current;
      if (toolRef.current === "flag") {
        toggleFlagRef.current(tile);
        return;
      }
      if (toolRef.current === "note") {
        cycleNote(tile);
        return;
      }
      stopWalking();
      const r = Math.floor(s.playerIndex / s.cols);
      const c = s.playerIndex % s.cols;
      const tr = Math.floor(tile / s.cols);
      const tc = tile % s.cols;
      if (Math.abs(tr - r) + Math.abs(tc - c) === 1) {
        stepTo(tr < r ? "UP" : tr > r ? "DOWN" : tc < c ? "LEFT" : "RIGHT");
        return;
      }
      const path = travelPath(s.visited, s.entityMap, s.playerIndex, tile, s.rows, s.cols);
      if (!path) return;
      const walk = (i: number) => {
        if (i >= path.length || !stepTo(path[i])) return;
        walking.current = setTimeout(() => walk(i + 1), 110);
      };
      walk(0);
    },
    [stepTo, cycleNote],
  );

  const toggleFlagRef = useRef<(tile: number) => void>(() => {});
  const toggleFlag = useCallback((tile: number) => {
    if (stateRef.current.visited.includes(tile)) return;
    haptic.impact();
    setFlags(prev => {
      const next = new Set(prev);
      if (!next.delete(tile)) next.add(tile);
      return next;
    });
  }, []);

  toggleFlagRef.current = toggleFlag;

  // The hint: one tile next to the explored ground that the clues already prove safe (never a gem, which is in plain sight),
  // the one proven by the simplest reading, so the hint teaches the easiest move left.
  const showHint = useCallback(() => {
    const s = stateRef.current;
    const seen = new Set(s.visited);
    const { safe } = provenByLevel(s.rows, s.cols, s.entities, s.visited);
    const gemsAt = new Set(s.entities.filter(e => e.type === "coin").map(e => e.index));
    const frontier = [...safe.entries()]
      .filter(([i]) => !seen.has(i) && !gemsAt.has(i) && s.visited.some(v => Math.abs(Math.floor(v / s.cols) - Math.floor(i / s.cols)) + Math.abs((v % s.cols) - (i % s.cols)) === 1))
      .sort((a, b) => a[1] - b[1]);
    const pick = frontier[0]?.[0] ?? [...gemsAt].find(g => !seen.has(g)) ?? null;
    if (pick === null) return;
    haptic.impact();
    setHintTile(pick);
    setHintWhy(hintReason(s.rows, s.cols, s.entities, s.visited, pick, frontier[0]?.[1] ?? 1));
    if (hintTile === null) setHints(h => h + 1);
  }, [hintTile]);

  const hasNext = index >= 0 && index + 1 < PUZZLE_COUNT;
  const share = () => {
    if (!result) return;
    analytics.track("puzzle_shared", { stars: result.stars });
    Share.share({
      message: puzzleShareText(t, { number: dailyPuzzleNumber(today), tier: tierName, stars: result.stars, seconds: result.seconds, mistakes, hints, streak: result.streak }),
    }).catch(() => {});
  };
  const tierName = t(`puzzle.tier.${puzzle.tier}` as TranslationKey);
  // A beaten weekly challenge or a crown is worth a message to friends too.
  const shareBrag = () => {
    if (!result) return;
    analytics.track("puzzle_shared", { stars: result.stars });
    const message = result.weeklyWon ? weeklyShareText(t, { number: weeklyNumber(week), solved: true, seconds: result.seconds }) : crownShareText(t, { number: index + 1, tier: tierName, seconds: result.seconds });
    Share.share({ message }).catch(() => {});
  };
  const title = technique ? t("tech.label") : isWeekly ? `${t("puzzle.weekly.title")} #${weeklyNumber(week)}${practice ? ` · ${t("puzzle.weekly.practiceTag")}` : ""}` : isDaily ? t("puzzle.daily") : archiveDate ? `${t("puzzle.daily")} #${dailyPuzzleNumber(archiveDate)}` : isEndless ? t("puzzle.endless.number", { n: endlessN + 1 }) : t("puzzle.number", { n: index + 1 });
  const goal = technique ? t(`tech.${technique.id}.tip` as TranslationKey) : gems === 1 ? t("puzzle.goal1") : t("puzzle.goal", { n: gems });
  const failWhat = (g: number, v: number) =>
    [g ? (g === 1 ? t("puzzle.what.guardian1") : t("puzzle.what.guardians", { n: g })) : "", v ? (v === 1 ? t("puzzle.what.vortex1") : t("puzzle.what.vortices", { n: v })) : ""].filter(Boolean).join(t("puzzle.what.and"));
  const failText = fail
    ? `${t(fail.kind === "pit" ? "puzzle.fail.pitShort" : "puzzle.fail.enemyShort")} ${
        failWhy ? t("puzzle.failWhy", { side: t(`puzzle.side.${failWhy.side}` as TranslationKey), what: failWhat(failWhy.guardians, failWhy.vortices) }) : t("puzzle.failGuess")
      }`
    : null;
  // A ray from the clue that proves the hint's tile (gold), or from the clue that warned of the hazard just stepped on (red).
  const beam =
    fail && failWhy
      ? { from: failWhy.from, to: fail.tile, color: "#FF5252" }
      : hintTile !== null && hintWhy && (hintWhy.kind === "empty" || hintWhy.kind === "full")
        ? { from: besideOf(hintTile, hintWhy.side, state.cols), to: hintTile, color: "#FFD54F" }
        : null;
  const possible = puzzleStars(mistakes, hints);
  const tierTint = TIER_TINTS[puzzle.tier] ?? TINT;
  // While a hint is lit, the banner says why that tile is safe: a hint that teaches, not only one that points.
  const whyText =
    hintTile === null || !hintWhy
      ? null
      : hintWhy.kind === "empty"
        ? t("puzzle.why.empty", { side: t(`puzzle.side.${hintWhy.side}` as TranslationKey) })
        : hintWhy.kind === "full"
          ? t(hintWhy.count === 1 ? "puzzle.why.full1" : "puzzle.why.full", { side: t(`puzzle.side.${hintWhy.side}` as TranslationKey), n: hintWhy.count })
          : t(`puzzle.why.${hintWhy.kind}` as TranslationKey);
  const bannerHeight = hudHeight + insets.top;
  const visited = fail ? [...state.visited, fail.tile] : state.visited;
  // The clue of the hero's own tile is under the hero on the board: it is read out beside the pad (the most needed clue of all).
  const here = getNearbyHazards(state.playerIndex, state.rows, state.cols, state.entityMap);
  const danger = (here.enemy || here.pit) && !fail && !solved;
  const heartbeat = useHeartbeat(danger && !calm, Math.max(here.enemyCount, here.pitCount));

  // The intro card closed: the clock starts and the board opens.
  const startPuzzle = () => {
    emitSound("UI_TAP");
    startedAt.current = Date.now();
    setIntroDone(true);
    setBoardLevel(1);
    // Development only: the end of a solve, or a mistake, without playing (for screenshots).
    if (__DEV__ && route.params.devWin !== undefined) {
      const slips = route.params.devWin;
      setTimeout(() => {
        setMistakes(slips);
        dispatch({ type: "PUZZLE_SET", state: { ...stateRef.current, coins: 0 } });
      }, 1600);
    }
    if (__DEV__ && route.params.devFail) {
      setTimeout(() => {
        const s = stateRef.current;
        const seen = new Set(s.visited);
        const dist = (i: number) => Math.min(...s.visited.map(v => Math.abs(Math.floor(v / s.cols) - Math.floor(i / s.cols)) + Math.abs((v % s.cols) - (i % s.cols))));
        const hazard = s.entities.filter(e => HAZARDS.has(e.type) && !seen.has(e.index)).sort((x, y) => dist(x.index) - dist(y.index))[0];
        if (!hazard) return;
        setFail({ tile: hazard.index, kind: hazard.type });
        setFailWhy(failWarning(s.rows, s.cols, s.entities, s.visited, hazard.index));
        setMistakes(m => m + 1);
      }, 1600);
    }
  };
  // Development only: a played end opens by itself, for screenshots.
  useEffect(() => {
    if (!__DEV__ || (route.params.devWin === undefined && !route.params.devFail)) return;
    const timer = setTimeout(startPuzzle, 900);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  resultPrimary.current = !result
    ? null
    : isTechnique
      ? () => navigation.goBack()
      : isDaily
        ? share
        : isEndless
          ? () => navigation.replace("PuzzleScreen", { target: "endless", n: endlessN + 1 })
          : index >= 0
            ? () => navigation.popTo("PuzzlesScreen", hasNext ? { continueTo: index + 1 } : {})
            : () => navigation.goBack();
  // The keyboard on a computer: arrows or WASD walk, F flag, N notes, H hint, R restart, Enter plays on (start, continue).
  const keys = useRef({ move, startPuzzle, showHint, restart, primary: null as null | (() => void), introDone, result: !!result, failedOut, isWeekly });
  keys.current = { move, startPuzzle, showHint, restart, primary: resultPrimary.current, introDone, result: !!result, failedOut, isWeekly };
  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = keys.current;
      const key = e.key.toLowerCase();
      if (key === "enter" || key === " ") {
        if (!k.introDone) k.startPuzzle();
        else if (k.result && k.primary) k.primary();
        else return;
        e.preventDefault();
        return;
      }
      if (!k.introDone || k.result || k.failedOut) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      const action = actionOf(useSettingsStore.getState().keyBindings, e.key);
      const dir: Direction | null = action === "up" ? "UP" : action === "down" ? "DOWN" : action === "left" ? "LEFT" : action === "right" ? "RIGHT" : null;
      if (dir) {
        e.preventDefault();
        k.move(dir);
      } else if (action === "flag") setTool(t => (t === "flag" ? "walk" : "flag"));
      else if (action === "note") setTool(t => (t === "note" ? "walk" : "note"));
      else if (action === "hint" && !k.isWeekly) k.showHint();
      else if (action === "restart") k.restart(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <ImageBackground fadeDuration={0} resizeMethod="none" source={require("../assets/sprites/backgrounds/Cover_Background.png")} style={styles.container} resizeMode="cover">
      <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.62)" }]} />
      <StatusBar hidden />
      <View style={[styles.banner, { paddingTop: insets.top + (hudHeight < 70 ? 4 : 8), minHeight: bannerHeight, paddingLeft: insets.left + 10, paddingRight: insets.right + 10 }]} accessibilityLiveRegion="polite">
        <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()} hitSlop={6} accessibilityRole="button" accessibilityLabel={t("a11y.back")}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.bannerText}>
          <Text style={[styles.label, { fontSize: 11 * ui }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} maxFontSizeMultiplier={1.2}>
            {(isTechnique ? title : `${title}  ·  ${tierName}${strict ? `  ·  ${t("puzzle.strict.tag")}` : ""}`).toLocaleUpperCase()}
          </Text>
          <Text style={[styles.goal, fail ? styles.goalFail : whyText ? styles.goalWhy : null, { fontSize: (hudHeight < 70 ? 13 : 15) * ui }]} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.7} maxFontSizeMultiplier={1.2}>
            {failText ?? whyText ?? goal}
          </Text>
        </View>
        {legend > 0 ? <LegendClock startedAt={startedAt} legend={legend} stopped={!introDone || solved || failedOut} /> : null}
        {!isTechnique && !isWeekly ? <LiveStars possible={possible} calm={calm} /> : null}
        <View style={[styles.counter, !isTechnique && !isWeekly && { display: "none" }]} accessible accessibilityLabel={t("puzzle.mistakes", { n: mistakes })}>
          <Ionicons name="close-circle" size={15} color={mistakes > 0 ? "#FF8A80" : "#8d8178"} />
          <Text style={[styles.counterText, mistakes > 0 && { color: "#FF8A80" }]} maxFontSizeMultiplier={1.2}>
            {mistakes}
          </Text>
        </View>
        {isWeekly ? null : (
          <TouchableOpacity style={[styles.iconButton, styles.hintButton, hintTile !== null && styles.hintOn]} onPress={showHint} hitSlop={6} accessibilityRole="button" accessibilityLabel={t("puzzle.hint")} accessibilityHint={t("puzzle.hintCost")}>
            <Ionicons name="bulb" size={20} color={hintTile !== null ? "#14101F" : "#FFD54F"} />
            <KeyHint action="hint" style={{ top: -2, left: -2 }} />
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.iconButton} onPress={() => restart(false)} hitSlop={6} accessibilityRole="button" accessibilityLabel={t("puzzle.restart")}>
          <Ionicons name="refresh" size={21} color="#fff" />
          <KeyHint action="restart" style={{ top: -2, left: -2 }} />
        </TouchableOpacity>
      </View>

      <View style={[styles.gameContent, { flexDirection: controlPosition === "left" ? "row-reverse" : "row", paddingLeft: insets.left + GAME_ROW_PADDING, paddingRight: insets.right + GAME_ROW_PADDING, paddingBottom: insets.bottom }]}>
        <BoardView
          level={boardLevel}
          rows={state.rows}
          cols={state.cols}
          entityMap={state.entityMap}
          visited={introDone ? visited : []}
          beam={beam}
          unveil={solved}
          playerIndex={state.playerIndex}
          facingDir={state.facingDir}
          characterIndex={hero}
          dying={!!fail}
          killerTile={fail?.tile ?? null}
          calm={calm}
          highlight={hintTile !== null ? [hintTile] : undefined}
          flags={flags}
          notes={notes}
          biome={puzzle.biome}
          onTilePress={tapTile}
          onTileLongPress={toggleFlag}
        />
        <View style={[styles.controlsWrapper, { width: controlPanelWidth }]}>
          <ToolBar tool={tool} onChange={next => setTool(prev => (prev === next && next !== "walk" ? "walk" : next))} />
          <View style={styles.here} accessible accessibilityLabel={t("puzzle.here", { guardians: here.enemyCount, vortexes: here.pitCount })}>
            <Text style={styles.hereLabel} maxFontSizeMultiplier={1.15}>
              {t("puzzle.hereLabel").toLocaleUpperCase()}
            </Text>
            <View style={styles.hereRow}>
              <SpriteImage source={CLUE_ART.roar} style={[styles.clueIcon, here.enemyCount === 0 && styles.clueNone]} resizeMode="contain" />
              <Text style={[styles.hereCount, here.enemyCount > 0 && { color: "#FFB74D" }]} maxFontSizeMultiplier={1.15}>
                {here.enemyCount}
              </Text>
              <SpriteImage source={CLUE_ART.vortex} style={[styles.clueIcon, here.pitCount === 0 && styles.clueNone]} resizeMode="contain" />
              <Text style={[styles.hereCount, here.pitCount > 0 && { color: "#CE93D8" }]} maxFontSizeMultiplier={1.15}>
                {here.pitCount}
              </Text>
            </View>
          </View>
          <View style={styles.gemsLeft} accessible accessibilityLabel={t("puzzle.gemsLeft", { n: state.coins, total: gems })}>
            <SpriteImage source={require("../assets/sprites/items/Icon_Gem.png")} style={{ width: 22, height: 22 }} />
            <Text style={styles.gemsText} maxFontSizeMultiplier={1.2}>
              {`${gems - state.coins}/${gems}`}
            </Text>
          </View>
          <Controls onMove={move} onAttack={() => {}} arrows={0} noAttack />
        </View>
      </View>

      {isYuleDay(today) ? <Snowfall count={18} calm={calm} /> : null}
      <DangerVignette roar={here.enemy && danger} vortex={here.pit && danger} intensity={Math.max(here.enemyCount, here.pitCount)} calm={calm} beat={heartbeat} />
      {solved && !calm ? <GemShower count={22} /> : null}
      {introDone && index === 0 && !guideSeen && !solved && !fail ? <PuzzleGuide onDone={() => markHintSeen("puzzle-guide")} /> : null}
      {!introDone ? (
        <PuzzleIntro
          title={title}
          tier={tierName}
          tint={isWeekly ? "#FF5252" : tierTint}
          rows={puzzle.rows}
          cols={puzzle.cols}
          gems={gems}
          best={introInfo.best}
          legend={legend}
          crowned={introInfo.crowned}
          strict={strict}
          noHints={isWeekly}
          onStart={startPuzzle}
        />
      ) : null}
      {failedOut ? (
        <OverlayContainer>
          <PopupPanel tint="#FF5252" width={Math.min(winWidth * 0.9, 420)}>
            <Text style={popupTitleStyle("#FF5252")} maxFontSizeMultiplier={1.15}>
              {t("puzzle.strict.failed").toLocaleUpperCase()}
            </Text>
            <Text style={styles.resultLine} maxFontSizeMultiplier={1.2}>
              {isWeekly ? (practice ? t("puzzle.weekly.practiceFail") : t("puzzle.weekly.failed")) : t("puzzle.strict.body")}
            </Text>
            <PopButton
              label={isWeekly ? t("puzzle.weekly.practice") : t("puzzle.strict.again")}
              icon="refresh"
              tint="#FF8A80"
              onPress={() => navigation.replace("PuzzleScreen", isWeekly ? { target: "weekly", practice: true } : { target, date: route.params.date })}
            />
            <View style={styles.resultLinks}>
              <PopLink label={t("puzzle.back")} onPress={() => navigation.goBack()} />
            </View>
          </PopupPanel>
        </OverlayContainer>
      ) : null}
      {result ? (
        <OverlayContainer>
          {/* Landscape: the verdict on the left (title, stars), the numbers and the way on to the right, so the card fits the
              height of a phone lying down. */}
          <PopupPanel tint={TINT} width={Math.min(winWidth * 0.94, 700)} style={[styles.resultCard, winHeight < 380 && styles.resultCardShort]}>
            <View style={styles.resultLeft}>
              <Text style={popupTitleStyle(TINT)} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} maxFontSizeMultiplier={1.15}>
                {t(isTechnique ? "tech.done" : "puzzle.solved").toLocaleUpperCase()}
              </Text>
              {result.weeklyWon ? (
                <Text style={styles.weeklyWon} maxFontSizeMultiplier={1.2}>
                  {t("puzzle.weekly.won")}
                </Text>
              ) : null}
              {isTechnique ? (
                <Text style={styles.resultLine} maxFontSizeMultiplier={1.2}>
                  {t(`tech.${technique!.id}.learned` as TranslationKey)}
                </Text>
              ) : (
                <>
                  <View accessible accessibilityLabel={t("puzzle.stars", { n: result.stars })}>
                    <FlyingStars stars={result.stars} calm={calm} />
                  </View>
                  <Text style={styles.resultLine} numberOfLines={3} adjustsFontSizeToFit minimumFontScale={0.8} maxFontSizeMultiplier={1.2}>
                    {mistakes === 0 && hints === 0 ? t("puzzle.flawless") : t("puzzle.slips", { mistakes, hints })}
                  </Text>
                </>
              )}
            </View>
            <View style={styles.resultRight}>
              {isTechnique ? null : (
                <>
                  <View style={styles.timeRow}>
                    <Ionicons name="timer-outline" size={16} color="#FFE0B2" />
                    <CountUp value={Math.round(result.seconds)} delay={numbersAt(result.stars)} format={formatSolveTime} style={styles.resultTime} calm={calm} />
                  </View>
                  <DropIn delay={numbersAt(result.stars) + 500} calm={calm}>
                    <Text style={[styles.resultLine, result.record && styles.record]} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.8} maxFontSizeMultiplier={1.2}>
                      {[
                        !isDaily && !isEndless && !isArchive && result.best ? (result.record ? t("puzzle.record.new", { best: formatSolveTime(result.best) }) : t("puzzle.record.best", { best: formatSolveTime(result.best) })) : "",
                        isDaily && result.streak > 0 ? `🔥 ${result.streak === 1 ? t("puzzle.streak1") : t("puzzle.streak", { n: result.streak })}` : "",
                        isEndless && result.run > 1 ? `⚡ ${t("puzzle.endless.run", { n: result.run })}` : "",
                      ].filter(Boolean).join("   ·   ")}
                    </Text>
                  </DropIn>
                  {legend > 0 ? (
                    <DropIn delay={numbersAt(result.stars) + 800} calm={calm} sound={result.crown ? "RELIC_PICKED" : undefined}>
                      <View style={[styles.crownLine, result.crown && styles.crownWon]}>
                        <MaterialCommunityIcons name="crown" size={result.crown ? 20 : 17} color={result.crown ? "#FFD54F" : "#8d8178"} />
                        <Text style={[styles.crownText, result.crown && { color: "#FFD54F" }]} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.75} maxFontSizeMultiplier={1.2}>
                          {result.crown ? t("puzzle.crown.won") : t("puzzle.crown.goal", { time: formatSolveTime(legend) })}
                        </Text>
                      </View>
                    </DropIn>
                  ) : null}
                </>
              )}
              {result.embers > 0 || result.achievements.length > 0 ? (
                <View style={styles.prizes}>
                  {result.embers > 0 ? (
                    <DropIn delay={numbersAt(result.stars) + 1100} calm={calm} sound="EMBER_GAIN">
                      <View style={styles.embers}>
                        <EmberIcon size={18} />
                        <CountUp value={result.embers} delay={numbersAt(result.stars) + 1150} duration={500} format={n => `+${n}`} style={styles.embersText} calm={calm} />
                      </View>
                    </DropIn>
                  ) : null}
                  {result.achievements.length > 0 ? (
                    <Text style={styles.achievements} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.7} maxFontSizeMultiplier={1.15}>
                      {`🏆 ${result.achievements.slice(0, 2).map(id => achievementText(t, id, "name")).join(" · ")}${result.achievements.length > 2 ? ` +${result.achievements.length - 2}` : ""}`}
                    </Text>
                  ) : null}
                </View>
              ) : null}
              {!isDaily && (index + 1) % PUZZLES_PER_TIER === 0 && hasNext ? (
                <Text style={styles.tierUp} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} maxFontSizeMultiplier={1.2}>
                  {t("puzzle.tierUp", { tier: t(`puzzle.tier.${puzzle.tier + 1}` as TranslationKey) })}
                </Text>
              ) : null}
              {isTechnique ? (
                <PopButton label={t("tech.back")} tint={TINT} onPress={() => navigation.goBack()} style={styles.resultButton} />
              ) : isDaily ? (
                <PopButton label={t("puzzle.share")} icon="share-social" tint={TINT} onPress={share} style={styles.resultButton} />
              ) : isEndless ? (
                <PopButton label={t("puzzle.endless.another")} tint={TINT} onPress={() => navigation.replace("PuzzleScreen", { target: "endless", n: endlessN + 1 })} style={styles.resultButton} />
              ) : index >= 0 ? (
                <PopButton label={t("puzzle.continue")} icon="arrow-forward" tint={TINT} onPress={() => navigation.popTo("PuzzlesScreen", hasNext ? { continueTo: index + 1 } : {})} style={styles.resultButton} />
              ) : (
                <PopButton label={t("puzzle.back")} tint={TINT} onPress={() => navigation.goBack()} style={styles.resultButton} />
              )}
              <View style={styles.resultLinks}>
                {(result.stars < 3 || (legend > 0 && !result.crown)) && !isEndless && !isTechnique ? (
                  <PopLink
                    label={result.stars < 3 ? t("puzzle.retry") : t("puzzle.crown.retry")}
                    onPress={() => navigation.replace("PuzzleScreen", { target, date: route.params.date })}
                  />
                ) : null}
                {index >= 0 || isDaily || isEndless ? <PopLink label={t("puzzle.backToMap")} onPress={() => navigation.goBack()} /> : null}
                {result.weeklyWon || result.crown ? <PopLink label={t("puzzle.share")} onPress={shareBrag} /> : null}
              </View>
            </View>
          </PopupPanel>
        </OverlayContainer>
      ) : null}
    </ImageBackground>
  );
}

/** The banner's clock: time on this puzzle against its legend time (gold while within it, grey once past). */
function LegendClock({ startedAt, legend, stopped }: { startedAt: React.MutableRefObject<number>; legend: number; stopped: boolean }) {
  const { t } = useT();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (stopped) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [stopped]);
  const seconds = Math.max(0, Math.floor((now - (startedAt.current || now)) / 1000));
  const within = seconds <= legend;
  return (
    <View style={[styles.clock, !within && styles.clockLate]} accessible accessibilityLabel={t("puzzle.crown.clock", { time: formatSolveTime(seconds), legend: formatSolveTime(legend) })}>
      <MaterialCommunityIcons name="crown" size={14} color={within ? "#FFD54F" : "#8d8178"} />
      <Text style={[styles.clockText, !within && { color: "#a89c92" }]} maxFontSizeMultiplier={1.1}>
        {`${formatSolveTime(seconds)} / ${formatSolveTime(legend)}`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  clock: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,213,79,0.5)", backgroundColor: "rgba(255,213,79,0.1)" },
  clockLate: { borderColor: "rgba(255,255,255,0.15)", backgroundColor: "rgba(255,255,255,0.05)" },
  clockText: { color: "#FFE082", fontWeight: "900", fontSize: 12, fontVariant: ["tabular-nums"] },
  crownLine: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.05)" },
  crownWon: { backgroundColor: "rgba(255,213,79,0.15)", borderWidth: 1, borderColor: "#FFD54F" },
  crownText: { color: "#bfb3a6", fontWeight: "800", fontSize: 13 },
  resultCard: { flexDirection: "row", alignItems: "center", gap: 18 },
  resultCardShort: { paddingVertical: 10, gap: 12 },
  resultLeft: { flex: 1, alignItems: "center", gap: 4 },
  resultRight: { flex: 1.25, alignItems: "center", gap: 6 },
  resultButton: { alignSelf: "stretch" },
  prizes: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "center", columnGap: 12 },
  timeRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  record: { color: "#FFD54F", fontWeight: "900" },
  weeklyWon: { color: "#FF8A80", fontWeight: "900", fontSize: 14, textAlign: "center" },
  container: { flex: 1, backgroundColor: "#000" },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(0,0,0,0.78)",
    borderBottomWidth: 1,
    borderColor: TINT + "66",
    paddingBottom: 6,
    // Over the board and its vignette, under the cards (intro, result), which cover the whole screen.
    zIndex: 900,
  },
  bannerText: { flex: 1, gap: 1 },
  label: { color: TINT, fontWeight: "900", letterSpacing: 2 },
  goal: { color: "#fff", fontWeight: "700" },
  goalFail: { color: "#FF8A80" },
  goalWhy: { color: "#FFE082" },
  iconButton: { width: MIN_TOUCH, height: MIN_TOUCH, borderRadius: MIN_TOUCH / 2, alignItems: "center", justifyContent: "center" },
  hintButton: { borderWidth: 1.5, borderColor: "#FFD54F88", backgroundColor: "rgba(255,213,79,0.12)" },
  hintOn: { backgroundColor: "#FFD54F", borderColor: "#FFD54F" },
  counter: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 6 },
  counterText: { color: "#bdb2a7", fontWeight: "900", fontSize: 14 },
  gameContent: { flex: 1, alignItems: "center", justifyContent: "space-around" },
  controlsWrapper: { alignSelf: "stretch", justifyContent: "flex-end", alignItems: "center", paddingBottom: 10, gap: 10 },
  here: { alignItems: "center", gap: 2, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 14, backgroundColor: "rgba(0,0,0,0.5)", borderWidth: 1, borderColor: "rgba(255,255,255,0.18)" },
  hereLabel: { color: "#bfb3a6", fontWeight: "900", fontSize: 10, letterSpacing: 1.5 },
  hereRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  clueIcon: { width: 22, height: 22 },
  clueNone: { opacity: 0.3 },
  hereCount: { color: "#8d8178", fontWeight: "900", fontSize: 16, minWidth: 12, marginRight: 4 },
  gemsLeft: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 14, backgroundColor: "rgba(0,0,0,0.45)", borderWidth: 1, borderColor: "#4FC3F766" },
  gemsText: { color: "#E1F5FE", fontWeight: "900", fontSize: 15 },
  resultLine: { color: "#E6D6C2", fontSize: 13, textAlign: "center" },
  resultTime: { color: "#FFE0B2", fontSize: 14, fontWeight: "800", textAlign: "center" },
  embers: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, marginBottom: 4 },
  achievements: { color: "#FFD54F", fontSize: 12, fontWeight: "800", textAlign: "center", marginBottom: 4 },
  embersText: { color: "#FFB74D", fontWeight: "900", fontSize: 16 },
  resultLinks: { flexDirection: "row", justifyContent: "center", gap: 18, alignSelf: "stretch" },
  tierUp: { color: TINT, fontSize: 12, fontWeight: "800", textAlign: "center" },
});
