import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { ImageBackground, StatusBar, StyleSheet, TouchableOpacity, View, useWindowDimensions } from "react-native";
import Text from "../ui/components/Text";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { RootStackParamList } from "../navigation/types";
import BoardView from "../ui/components/BoardView";
import Controls from "../ui/components/DirectionPad";
import AttackPanel from "../ui/components/AttackPanel";
import ToolBar from "../ui/components/ToolBar";
import RelicTray from "../ui/components/RelicTray";
import RelicDraftOverlay from "../ui/components/game/RelicDraftOverlay";
import IntermissionOverlay from "../ui/components/game/IntermissionOverlay";
import { GAME_ROW_PADDING, MIN_TOUCH, useGameLayout } from "../ui/layout/useGameLayout";
import { gameReducer, initialState } from "../core/engine/reducer";
import { Direction, GameAction, GameState } from "../core/engine/types";
import { NO_PERKS } from "../core/engine/heroes";
import { stepTarget } from "../core/engine/travel";
import { SHOP_PRICES, type Door } from "../core/engine/shop";
import { LESSONS, LessonDef, advanceLesson, lessonState } from "../core/tutorial/lessons";
import characters from "../data/characters";
import { emitSound } from "../audio/audioEventBus";
import { useSettingsStore } from "../state/settings/store";
import { useT } from "../i18n/useT";
import type { TranslationKey } from "../i18n/en";
import { analytics } from "../services/analytics";
import { relicText } from "../i18n/keys";

type Props = NativeStackScreenProps<RootStackParamList, "LessonScreen">;

/** A lesson restarts from its own starting state, which the game reducer does not know about. */
type LessonAction = GameAction | { type: "LESSON_SET"; state: GameState };
const lessonReducer = (state: GameState, action: LessonAction): GameState =>
  action.type === "LESSON_SET" ? action.state : gameReducer(state, action);

const DOORS: [Door, Door] = ["bounty", null];

const freshLesson = (lesson: LessonDef): GameState =>
  lessonState(
    lesson,
    gameReducer(initialState, {
      type: "RESET",
      character: characters[0],
      rows: lesson.board.rows,
      cols: lesson.board.cols,
      entities: [...lesson.board.entities],
      coins: lesson.board.coins,
      attack: lesson.board.attack,
      seed: 7,
      perks: NO_PERKS,
    }),
  );

/**
 * An optional lesson (opened from the manual): the same real game rules on a small hand-made floor, or the real
 * relic draft / shop opened in front of the player, with one instruction at a time on top.
 */
export default function LessonScreen({ navigation, route }: Props) {
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const { controlPanelWidth, hudHeight } = useGameLayout();
  const { width: winWidth, height: winHeight } = useWindowDimensions();
  // Phones keep the base sizes; roomier windows grow the banner text up to 1.5x.
  const ui = Math.max(1, Math.min(1.5, winWidth / 900, winHeight / 540));
  const controlPosition = useSettingsStore(s => s.controlPosition);
  const lesson = LESSONS[route.params.lesson];

  const devMoves = route.params.devMoves;
  const [state, dispatch] = useReducer(lessonReducer, lesson, (l: LessonDef) => {
    let start = freshLesson(l);
    if (__DEV__ && route.params.devEntities) {
      // Screenshots only: the given entities, every tile explored.
      const entities = route.params.devEntities as GameState["entities"];
      start = { ...start, entities, entityMap: Object.fromEntries(entities.map(e => [e.index, e])), visited: Array.from({ length: start.rows * start.cols }, (_, i) => i) };
    }
    if (!__DEV__ || !devMoves) return start;
    return devMoves.reduce<GameState>((s, direction) => gameReducer(s, { type: "MOVE", direction }), start);
  });
  const [stepIndex, setStepIndex] = useState(0);
  const [flags, setFlags] = useState<ReadonlySet<number>>(() => new Set());
  const [went, setWent] = useState(false);
  const [door, setDoor] = useState<0 | 1>(0);
  const [isAttacking, setIsAttacking] = useState(false);
  const [showRetry, setShowRetry] = useState(false);
  const attackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const step = lesson.steps[stepIndex];
  const isLast = stepIndex === lesson.steps.length - 1;

  useEffect(() => {
    analytics.track("screen_view", { screen: `lesson_${lesson.id}` });
    return () => {
      if (attackTimer.current) clearTimeout(attackTimer.current);
    };
  }, [lesson.id]);

  useEffect(() => {
    if (isLast) analytics.track("lesson_complete", { lesson: lesson.id });
  }, [isLast, lesson.id]);

  const restart = useCallback(() => {
    dispatch({ type: "LESSON_SET", state: freshLesson(lesson) });
    setStepIndex(0);
    setFlags(new Set());
    setWent(false);
    setDoor(0);
  }, [lesson]);

  useEffect(() => {
    setStepIndex(current => advanceLesson(lesson, current, state, { flags, went }));
  }, [lesson, state, flags, went]);

  // The detector flags what it finds, exactly like the player's own long-press flags.
  useEffect(() => {
    if (state.marked.length === 0) return;
    setFlags(prev => new Set([...prev, ...state.marked]));
  }, [state.marked]);

  // A hazard ends the try; the lesson starts over after a moment.
  useEffect(() => {
    if (!state.isGameOver) return;
    emitSound("GAME_OVER");
    setShowRetry(true);
    const timer = setTimeout(() => {
      restart();
      setShowRetry(false);
      emitSound("GAME_MUSIC_START");
    }, 1400);
    return () => clearTimeout(timer);
  }, [state.isGameOver, restart]);

  // The shop lesson cannot be finished without a shield: if the gems were spent on something else, start over.
  useEffect(() => {
    if (lesson.kind === "shop" && !state.shield && !state.altarUsed && state.gems < SHOP_PRICES.shield) restart();
  }, [lesson.kind, state.shield, state.altarUsed, state.gems, restart]);

  // Same sounds as the real game for the few things a lesson does.
  const lastState = useRef(state);
  useEffect(() => {
    const prev = lastState.current;
    lastState.current = state;
    if (prev === state) return;
    if (state.totalCoins > prev.totalCoins) emitSound("COIN_COLLECTED");
    else if (state.relics.length > prev.relics.length || state.altarUsed !== prev.altarUsed) emitSound("RELIC_PICKED");
    else if (state.shield !== prev.shield || state.items.detector !== prev.items.detector || state.items.bomb !== prev.items.bomb || state.gems !== prev.gems) emitSound("POWERUP");
    else if (state.attack < prev.attack) emitSound(state.entities.length < prev.entities.length ? "ENEMY_KILLED" : "ATTACK");
    else if (state.playerIndex !== prev.playerIndex) emitSound("MOVE");
  }, [state]);

  const toggleFlag = useCallback(
    (index: number) => {
      if (state.visited.includes(index)) return;
      setFlags(prev => {
        const next = new Set(prev);
        if (!next.delete(index)) next.add(index);
        return next;
      });
    },
    [state.visited],
  );

  const move = useCallback(
    (direction: Direction) => {
      // A flagged tile that still hides something is refused, as in a real run.
      const target = stepTarget(state.playerIndex, direction, state.rows, state.cols);
      if (flags.has(target) && state.entityMap[target]) return;
      dispatch({ type: "MOVE", direction });
    },
    [state.playerIndex, state.rows, state.cols, state.entityMap, flags],
  );
  const attack = useCallback(() => {
    setIsAttacking(true);
    dispatch({ type: "ATTACK" });
    if (attackTimer.current) clearTimeout(attackTimer.current);
    attackTimer.current = setTimeout(() => setIsAttacking(false), 400);
  }, []);

  const finish = useCallback(() => navigation.goBack(), [navigation]);
  const relicNames = useMemo(() => state.relics.map(id => relicText(t, id, "name")).join(", "), [state.relics, t]);
  const text = showRetry ? t("lesson.retry") : t(step.textKey as TranslationKey);
  const bannerHeight = hudHeight + insets.top;

  const banner = (
    <View
      style={[
        styles.banner,
        {
          paddingTop: insets.top + (hudHeight < 70 ? 4 : 8),
          minHeight: bannerHeight,
          paddingLeft: insets.left + 14,
          paddingRight: insets.right + 14,
        },
      ]}
      accessibilityLiveRegion="polite"
    >
      <View style={styles.bannerText}>
        <Text style={[styles.stepLabel, { fontSize: 11 * ui }]} maxFontSizeMultiplier={1.2}>
          {t("lesson.label").toLocaleUpperCase()}  ·  {t(`lesson.${lesson.id}.title` as TranslationKey).toLocaleUpperCase()}
          {!isLast ? `  ·  ${stepIndex + 1}/${lesson.steps.length - 1}` : ""}
        </Text>
        <Text style={[styles.instruction, { fontSize: (hudHeight < 70 ? 13 : 15) * ui }]} maxFontSizeMultiplier={1.25} accessibilityRole="header" numberOfLines={3} adjustsFontSizeToFit minimumFontScale={0.7}>
          {text}
        </Text>
      </View>
      <TouchableOpacity
        style={isLast ? styles.finishButton : styles.skipButton}
        onPress={finish}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={isLast ? t("lesson.finish") : t("lesson.skip")}
      >
        <Text style={isLast ? styles.finishText : styles.skipText} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.3}>
          {isLast ? t("lesson.finish").toLocaleUpperCase() : t("lesson.skip")}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <ImageBackground
      fadeDuration={0}
      resizeMethod="none"
      source={require("../assets/sprites/backgrounds/Cover_Background.png")}
      style={styles.container}
      resizeMode="cover"
    >
      <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.6)" }]} />
      <StatusBar hidden />
      {__DEV__ && route.params.devHideBanner ? null : banner}

      {lesson.kind === "board" ? (
        <View
          style={[
            styles.gameContent,
            {
              flexDirection: controlPosition === "left" ? "row-reverse" : "row",
              paddingLeft: insets.left + GAME_ROW_PADDING,
              paddingRight: insets.right + GAME_ROW_PADDING,
              paddingBottom: insets.bottom,
            },
          ]}
        >
          <AttackPanel onAttack={attack} arrows={state.attack} />
          <BoardView
            level={1}
            rows={state.rows}
            cols={state.cols}
            entityMap={state.entityMap}
            visited={state.visited}
            playerIndex={state.playerIndex}
            facingDir={state.facingDir}
            characterIndex={0}
            isAttacking={isAttacking}
            highlight={step.highlight}
            flags={flags}
            biome={__DEV__ ? route.params.devBiome : undefined}
            onTileLongPress={toggleFlag}
          />
          <View style={[styles.controlsWrapper, { width: controlPanelWidth }]}>
            {lesson.id === "tools" && (
              <View style={styles.toolSlot}>
                <ToolBar
                  ability={null}
                  abilityCd={0}
                  detector={state.items.detector}
                  bomb={state.items.bomb}
                  canUndo={!!state.undo && !state.undoUsed}
                  onAbility={() => {}}
                  onDetector={() => dispatch({ type: "USE_ITEM", item: "detector" })}
                  onBomb={() => dispatch({ type: "USE_ITEM", item: "bomb" })}
                  onUndo={() => dispatch({ type: "UNDO" })}
                  size={Math.max(34, Math.min(46, (controlPanelWidth + 12 - 18) / 4))}
                />
              </View>
            )}
            <Controls onMove={move} onAttack={attack} arrows={state.attack} />
          </View>
        </View>
      ) : (
        // The real overlay fills only the space under the instruction banner.
        <View style={styles.overlayHost}>
          {lesson.kind === "draft" ? (
            <>
              {state.relics.length > 0 && (
                <View style={styles.relicsDone}>
                  <RelicTray relics={state.relics} size={44} label={relicNames} />
                </View>
              )}
              <RelicDraftOverlay offer={state.pendingDraft} floor={state.level} onPick={id => dispatch({ type: "PICK_RELIC", id })} />
            </>
          ) : (
            <IntermissionOverlay
              visible={!went}
              nextFloor={state.level + 1}
              nextIsLair={false}
              newBiome={null}
              gems={state.gems}
              shield={state.shield}
              items={state.items}
              doors={DOORS}
              chosen={door}
              onChoose={setDoor}
              onBuy={item => dispatch({ type: "BUY", item })}
              altarUsed={state.altarUsed}
              onAltar={() => dispatch({ type: "ALTAR" })}
              onGo={() => setWent(true)}
            />
          )}
        </View>
      )}
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(0,0,0,0.78)",
    borderBottomWidth: 1,
    borderColor: "rgba(255,215,0,0.4)",
    paddingBottom: 8,
    zIndex: 2000,
  },
  bannerText: { flex: 1, gap: 2 },
  stepLabel: { color: "#FFD700", fontWeight: "900", fontSize: 11, letterSpacing: 2 },
  instruction: { color: "#fff", fontWeight: "700", fontSize: 15 },
  finishButton: {
    minHeight: MIN_TOUCH,
    minWidth: 120,
    backgroundColor: "#FFD700",
    borderRadius: 14,
    paddingHorizontal: 14,
    justifyContent: "center",
    alignItems: "center",
    borderBottomWidth: 3,
    borderBottomColor: "rgba(0,0,0,0.2)",
  },
  finishText: { color: "#000", fontWeight: "900", fontSize: 14, letterSpacing: 1 },
  skipButton: { minHeight: MIN_TOUCH, justifyContent: "center", paddingHorizontal: 8 },
  skipText: { color: "#bdbdbd", fontWeight: "700", fontSize: 13, textDecorationLine: "underline" },
  gameContent: { flex: 1, alignItems: "center", justifyContent: "space-around" },
  controlsWrapper: { alignSelf: "stretch", justifyContent: "flex-end", alignItems: "center", paddingBottom: 10 },
  toolSlot: { marginBottom: 8, alignSelf: "stretch", marginHorizontal: -6 },
  overlayHost: { flex: 1 },
  relicsDone: { position: "absolute", top: 12, left: 0, right: 0, alignItems: "center" },
});
