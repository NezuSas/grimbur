import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { ImageBackground, Share, StatusBar, StyleSheet, TouchableOpacity, View, useWindowDimensions } from "react-native";
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
import { provenSafeTiles } from "../core/engine/solver";
import { dailyKey } from "../core/engine/seed";
import { PUZZLE_COUNT, PUZZLES_PER_TIER, dailyPuzzle, pathPuzzle, puzzleStars, type Puzzle } from "../core/puzzles/puzzles";
import { recordPuzzle } from "../services/localStats";
import characters from "../data/characters";
import { emitSound } from "../audio/audioEventBus";
import { haptic, NotificationFeedbackType } from "../shared/haptics";
import { useSettingsStore } from "../state/settings/store";
import { useT } from "../i18n/useT";
import type { TranslationKey } from "../i18n/en";
import { analytics } from "../services/analytics";
import { achievementText } from "../i18n/keys";
import type { AchievementId } from "../core/stats/achievements";
import { dailyPuzzleNumber, dailyPuzzleStreak } from "../core/stats/puzzleProgress";
import { formatSolveTime, puzzleShareText } from "./puzzle/shareText";
import { hintReason, type HintReason } from "../core/puzzles/hintReason";
import { submitPuzzleScore } from "../services/puzzleScores";

type Props = NativeStackScreenProps<RootStackParamList, "PuzzleScreen">;

const TINT = "#4DD0E1";
const STAR = require("../assets/sprites/ui/Icon_Star.png");
const HAZARDS = new Set(["enemy", "pit"]);

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

  const target = route.params.target;
  const today = useMemo(() => dailyKey(), []);
  const isDaily = target === "daily";
  const index = isDaily ? -1 : Math.max(0, Math.min(PUZZLE_COUNT - 1, Math.trunc(target)));
  const puzzle = useMemo(() => (isDaily ? dailyPuzzle(today) : pathPuzzle(index)), [isDaily, today, index]);
  const gems = puzzle.entities.filter(e => e.type === "coin").length;

  const [state, dispatch] = useReducer(puzzleReducer, puzzle, p => openingState(p, hero));
  const [mistakes, setMistakes] = useState(0);
  const [hints, setHints] = useState(0);
  const [hintTile, setHintTile] = useState<number | null>(null);
  const [hintWhy, setHintWhy] = useState<HintReason | null>(null);
  const [fail, setFail] = useState<{ tile: number; kind: string } | null>(null);
  const [flags, setFlags] = useState<ReadonlySet<number>>(() => new Set());
  const [result, setResult] = useState<{ stars: number; embers: number; achievements: AchievementId[]; seconds: number; streak: number } | null>(null);
  // The whole time spent on it, restarts included: what a shared result tells.
  const startedAt = useRef(0);
  useEffect(() => {
    startedAt.current = Date.now();
  }, []);
  const walking = useRef<ReturnType<typeof setTimeout> | null>(null);
  const failTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  const solved = state.coins === 0 && gems > 0;

  useEffect(() => {
    analytics.track("screen_view", { screen: isDaily ? "puzzle_daily" : `puzzle_${index + 1}` });
    return () => {
      if (walking.current) clearTimeout(walking.current);
      if (failTimer.current) clearTimeout(failTimer.current);
    };
  }, [isDaily, index]);

  const stopWalking = () => {
    if (walking.current) clearTimeout(walking.current);
    walking.current = null;
  };

  const restart = useCallback(() => {
    stopWalking();
    dispatch({ type: "PUZZLE_SET", state: openingState(puzzle, hero) });
    setFail(null);
    setHintTile(null);
    setFlags(new Set());
  }, [puzzle, hero]);

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
    analytics.track("puzzle_solved", { puzzle: isDaily ? "daily" : index + 1, stars, mistakes, hints });
    const seconds = (Date.now() - startedAt.current) / 1000;
    // The day's try goes to the friends' board (kept only when better than an earlier one).
    if (isDaily) void submitPuzzleScore({ date: today, stars, mistakes, hints, seconds, characterIndex: hero });
    const show = (embers: number, achievements: AchievementId[] = [], streak = 0) => setTimeout(() => setResult({ stars, embers, achievements, seconds, streak }), 650);
    recordPuzzle(isDaily ? { kind: "daily", date: today } : { kind: "path", index }, stars)
      .then(r => show(r.embers, r.achievements, dailyPuzzleStreak(r.stats.puzzles, today)))
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
        setMistakes(m => m + 1);
        haptic.notify(NotificationFeedbackType.Error);
        emitSound("GAME_OVER");
        if (!(__DEV__ && route.params.devHold)) failTimer.current = setTimeout(restart, 2800);
        return false;
      }
      dispatch({ type: "MOVE", direction });
      return true;
    },
    [fail, flags, restart],
  );

  const move = useCallback((direction: Direction) => {
    stopWalking();
    stepTo(direction);
  }, [stepTo]);

  // Tapping a tile: next to the hero it is one step (into the fog too); farther, the hero walks there over explored tiles.
  const tapTile = useCallback(
    (tile: number) => {
      const s = stateRef.current;
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
    [stepTo],
  );

  const toggleFlag = useCallback((tile: number) => {
    if (stateRef.current.visited.includes(tile)) return;
    haptic.impact();
    setFlags(prev => {
      const next = new Set(prev);
      if (!next.delete(tile)) next.add(tile);
      return next;
    });
  }, []);

  // The hint: one tile next to the explored ground that the clues already prove safe (never a gem, which is in plain sight).
  const showHint = useCallback(() => {
    const s = stateRef.current;
    const seen = new Set(s.visited);
    const safe = provenSafeTiles(s.rows, s.cols, s.entities, s.visited);
    const gemsAt = new Set(s.entities.filter(e => e.type === "coin").map(e => e.index));
    const frontier = [...safe].filter(i => !seen.has(i) && !gemsAt.has(i) && s.visited.some(v => Math.abs(Math.floor(v / s.cols) - Math.floor(i / s.cols)) + Math.abs((v % s.cols) - (i % s.cols)) === 1));
    const pick = frontier[0] ?? [...gemsAt].find(g => !seen.has(g)) ?? null;
    if (pick === null) return;
    haptic.impact();
    setHintTile(pick);
    setHintWhy(hintReason(s.rows, s.cols, s.entities, s.visited, pick));
    if (hintTile === null) setHints(h => h + 1);
  }, [hintTile]);

  const hasNext = !isDaily && index + 1 < PUZZLE_COUNT;
  const share = () => {
    if (!result) return;
    analytics.track("puzzle_shared", { stars: result.stars });
    Share.share({
      message: puzzleShareText(t, { number: dailyPuzzleNumber(today), tier: tierName, stars: result.stars, seconds: result.seconds, mistakes, hints, streak: result.streak }),
    }).catch(() => {});
  };
  const tierName = t(`puzzle.tier.${puzzle.tier}` as TranslationKey);
  const title = isDaily ? t("puzzle.daily") : t("puzzle.number", { n: index + 1 });
  const goal = gems === 1 ? t("puzzle.goal1") : t("puzzle.goal", { n: gems });
  const failText = fail ? t(fail.kind === "pit" ? "puzzle.fail.pit" : "puzzle.fail.enemy") : null;
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

  return (
    <ImageBackground fadeDuration={0} resizeMethod="none" source={require("../assets/sprites/backgrounds/Cover_Background.png")} style={styles.container} resizeMode="cover">
      <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.62)" }]} />
      <StatusBar hidden />
      <View style={[styles.banner, { paddingTop: insets.top + (hudHeight < 70 ? 4 : 8), minHeight: bannerHeight, paddingLeft: insets.left + 10, paddingRight: insets.right + 10 }]} accessibilityLiveRegion="polite">
        <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()} hitSlop={6} accessibilityRole="button" accessibilityLabel={t("a11y.back")}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.bannerText}>
          <Text style={[styles.label, { fontSize: 11 * ui }]} numberOfLines={1} maxFontSizeMultiplier={1.2}>
            {`${title}  ·  ${tierName}`.toLocaleUpperCase()}
          </Text>
          <Text style={[styles.goal, fail ? styles.goalFail : whyText ? styles.goalWhy : null, { fontSize: (hudHeight < 70 ? 13 : 15) * ui }]} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.7} maxFontSizeMultiplier={1.2}>
            {failText ?? whyText ?? goal}
          </Text>
        </View>
        <View style={styles.counter} accessible accessibilityLabel={t("puzzle.mistakes", { n: mistakes })}>
          <Ionicons name="close-circle" size={15} color={mistakes > 0 ? "#FF8A80" : "#8d8178"} />
          <Text style={[styles.counterText, mistakes > 0 && { color: "#FF8A80" }]} maxFontSizeMultiplier={1.2}>
            {mistakes}
          </Text>
        </View>
        <TouchableOpacity style={[styles.iconButton, styles.hintButton, hintTile !== null && styles.hintOn]} onPress={showHint} hitSlop={6} accessibilityRole="button" accessibilityLabel={t("puzzle.hint")} accessibilityHint={t("puzzle.hintCost")}>
          <Ionicons name="bulb" size={20} color={hintTile !== null ? "#14101F" : "#FFD54F"} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconButton} onPress={restart} hitSlop={6} accessibilityRole="button" accessibilityLabel={t("puzzle.restart")}>
          <Ionicons name="refresh" size={21} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={[styles.gameContent, { flexDirection: controlPosition === "left" ? "row-reverse" : "row", paddingLeft: insets.left + GAME_ROW_PADDING, paddingRight: insets.right + GAME_ROW_PADDING, paddingBottom: insets.bottom }]}>
        <BoardView
          level={1}
          rows={state.rows}
          cols={state.cols}
          entityMap={state.entityMap}
          visited={visited}
          playerIndex={state.playerIndex}
          facingDir={state.facingDir}
          characterIndex={hero}
          dying={!!fail}
          killerTile={fail?.tile ?? null}
          calm={calm}
          highlight={hintTile !== null ? [hintTile] : undefined}
          flags={flags}
          biome={puzzle.biome}
          onTilePress={tapTile}
          onTileLongPress={toggleFlag}
        />
        <View style={[styles.controlsWrapper, { width: controlPanelWidth }]}>
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

      <DangerVignette roar={here.enemy && danger} vortex={here.pit && danger} intensity={Math.max(here.enemyCount, here.pitCount)} calm={calm} beat={heartbeat} />
      {result ? (
        <OverlayContainer>
          <PopupPanel tint={TINT} width={Math.min(winWidth * 0.9, 420)}>
            <Text style={popupTitleStyle(TINT)} maxFontSizeMultiplier={1.15}>
              {t("puzzle.solved").toLocaleUpperCase()}
            </Text>
            <View style={styles.stars} accessible accessibilityLabel={t("puzzle.stars", { n: result.stars })}>
              {[1, 2, 3].map(n => (
                <SpriteImage key={n} source={STAR} style={[styles.star, n === 2 && styles.starMid, n > result.stars && styles.starOff]} resizeMode="contain" />
              ))}
            </View>
            <Text style={styles.resultLine} maxFontSizeMultiplier={1.2}>
              {mistakes === 0 && hints === 0 ? t("puzzle.flawless") : t("puzzle.slips", { mistakes, hints })}
            </Text>
            <Text style={styles.resultTime} maxFontSizeMultiplier={1.2}>
              {`⏱ ${formatSolveTime(result.seconds)}`}
              {isDaily && result.streak > 0 ? `   ·   🔥 ${result.streak === 1 ? t("puzzle.streak1") : t("puzzle.streak", { n: result.streak })}` : ""}
            </Text>
            {result.embers > 0 ? (
              <View style={styles.embers}>
                <EmberIcon size={16} />
                <Text style={styles.embersText} maxFontSizeMultiplier={1.2}>
                  {`+${result.embers}`}
                </Text>
              </View>
            ) : null}
            {result.achievements.length > 0 ? (
              <Text style={styles.achievements} numberOfLines={2} maxFontSizeMultiplier={1.15}>
                {`🏆 ${result.achievements.slice(0, 2).map(id => achievementText(t, id, "name")).join(" · ")}${result.achievements.length > 2 ? ` +${result.achievements.length - 2}` : ""}`}
              </Text>
            ) : null}
            {isDaily ? (
              <PopButton label={t("puzzle.share")} icon="share-social" tint={TINT} onPress={share} />
            ) : hasNext ? (
              <PopButton label={t("puzzle.next")} tint={TINT} onPress={() => navigation.replace("PuzzleScreen", { target: index + 1 })} />
            ) : (
              <PopButton label={t("puzzle.back")} tint={TINT} onPress={() => navigation.goBack()} />
            )}
            <View style={styles.resultLinks}>
              {result.stars < 3 ? (
                <PopLink
                  label={t("puzzle.retry")}
                  onPress={() => navigation.replace("PuzzleScreen", { target })}
                />
              ) : null}
              {hasNext || isDaily ? <PopLink label={t("puzzle.back")} onPress={() => navigation.goBack()} /> : null}
            </View>
            {!isDaily && (index + 1) % PUZZLES_PER_TIER === 0 && hasNext ? (
              <Text style={styles.tierUp} maxFontSizeMultiplier={1.2}>
                {t("puzzle.tierUp", { tier: t(`puzzle.tier.${puzzle.tier + 1}` as TranslationKey) })}
              </Text>
            ) : null}
          </PopupPanel>
        </OverlayContainer>
      ) : null}
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(0,0,0,0.78)",
    borderBottomWidth: 1,
    borderColor: TINT + "66",
    paddingBottom: 6,
    zIndex: 2000,
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
  stars: { flexDirection: "row", alignItems: "flex-end", justifyContent: "center", gap: 6, marginVertical: 6 },
  star: { width: 52, height: 52 },
  starMid: { width: 66, height: 66, marginBottom: 6 },
  starOff: { opacity: 0.18 },
  resultLine: { color: "#E6D6C2", fontSize: 13, textAlign: "center" },
  resultTime: { color: "#FFE0B2", fontSize: 14, fontWeight: "800", textAlign: "center" },
  embers: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, marginBottom: 4 },
  achievements: { color: "#FFD54F", fontSize: 12, fontWeight: "800", textAlign: "center", marginBottom: 4 },
  embersText: { color: "#FFB74D", fontWeight: "900", fontSize: 16 },
  resultLinks: { flexDirection: "row", justifyContent: "center", gap: 18, alignSelf: "stretch" },
  tierUp: { color: TINT, fontSize: 12, fontWeight: "800", textAlign: "center" },
});
