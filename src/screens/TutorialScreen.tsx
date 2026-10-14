import React, { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { ImageBackground, StatusBar, StyleSheet, TouchableOpacity, View, useWindowDimensions } from "react-native";
import Text from "../ui/components/Text";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { RootStackParamList } from "../navigation/types";
import BoardView from "../ui/components/BoardView";
import Controls from "../ui/components/DirectionPad";
import AttackPanel from "../ui/components/AttackPanel";
import { GAME_ROW_PADDING, MIN_TOUCH, useGameLayout } from "../ui/layout/useGameLayout";
import { gameReducer, initialState } from "../core/engine/reducer";
import { Direction } from "../core/engine/types";
import { NO_PERKS } from "../core/engine/heroes";
import { GAME_CONFIG } from "../config/gameConfig";
import { TUTORIAL_BOARD, TUTORIAL_STEPS, advanceTutorial } from "../core/tutorial/tutorial";
import characters from "../data/characters";
import { emitSound } from "../audio/audioEventBus";
import { useSettingsStore } from "../state/settings/store";
import { useT } from "../i18n/useT";
import { analytics } from "../services/analytics";

type Props = NativeStackScreenProps<RootStackParamList, "TutorialScreen">;

const freshBoard = () =>
  gameReducer(initialState, {
    type: "RESET",
    character: characters[0],
    rows: TUTORIAL_BOARD.rows,
    cols: TUTORIAL_BOARD.cols,
    entities: [...TUTORIAL_BOARD.entities],
    coins: TUTORIAL_BOARD.coins,
    attack: TUTORIAL_BOARD.attack,
    seed: 7,
    perks: NO_PERKS,
  });

/**
 * Guided first floor played with the real reducer. Each step completes from the game state alone
 * (see `core/tutorial/tutorial.ts`). Walking into the guardian simply restarts the lesson.
 */
export default function TutorialScreen({ navigation, route }: Props) {
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const { controlPanelWidth, hudHeight } = useGameLayout();
  const { width: winWidth, height: winHeight } = useWindowDimensions();
  // Phones keep the base sizes; roomier windows grow the banner text up to 1.5x.
  const ui = Math.max(1, Math.min(1.5, winWidth / 900, winHeight / 540));
  const controlPosition = useSettingsStore(s => s.controlPosition);
  const setTutorialSeen = useSettingsStore(s => s.setTutorialSeen);

  const characterIndex = route.params?.characterIndex ?? 0;
  const [state, dispatch] = useReducer(gameReducer, undefined, freshBoard);
  const [stepIndex, setStepIndex] = useState(0);
  const [isAttacking, setIsAttacking] = useState(false);
  const [showRetry, setShowRetry] = useState(false);
  const attackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const step = TUTORIAL_STEPS[stepIndex];
  const isLast = step.id === "done";
  const totalInteractive = TUTORIAL_STEPS.length - 1;

  useEffect(() => {
    analytics.track("screen_view", { screen: "tutorial" });
    return () => {
      if (attackTimer.current) clearTimeout(attackTimer.current);
    };
  }, []);

  // The lesson makes the same sounds as the real game (steps, gems, arrows, kills, pickups, a fatal touch).
  const lastState = useRef(state);
  useEffect(() => {
    const prev = lastState.current;
    lastState.current = state;
    if (prev === state) return;
    if (state.isGameOver && !prev.isGameOver) {
      emitSound("GAME_OVER");
    } else if (state.totalCoins > prev.totalCoins) {
      emitSound("COIN_COLLECTED");
    } else if (state.lastPickup === "shield" || state.lastPickup === "ammo") {
      emitSound("POWERUP");
    } else if (state.attack < prev.attack) {
      emitSound(state.entities.length < prev.entities.length ? "ENEMY_KILLED" : "ATTACK");
    } else if (state.playerIndex !== prev.playerIndex) {
      emitSound("MOVE");
    }
  }, [state]);

  // Advance whenever the game state satisfies the current step.
  useEffect(() => {
    setStepIndex(current => advanceTutorial(current, state));
  }, [state]);

  // Dying (walking into the guardian) restarts the lesson from the beginning.
  useEffect(() => {
    if (!state.isGameOver) return;
    setShowRetry(true);
    const timer = setTimeout(() => {
      dispatch({
        type: "RESET",
        character: characters[0],
        rows: TUTORIAL_BOARD.rows,
        cols: TUTORIAL_BOARD.cols,
        entities: [...TUTORIAL_BOARD.entities],
        coins: TUTORIAL_BOARD.coins,
        attack: TUTORIAL_BOARD.attack,
        seed: 7,
        perks: NO_PERKS,
      });
      setStepIndex(0);
      setShowRetry(false);
      emitSound("GAME_MUSIC_START");
    }, 1400);
    return () => clearTimeout(timer);
  }, [state.isGameOver]);

  const move = useCallback((direction: Direction) => dispatch({ type: "MOVE", direction }), []);
  const attack = useCallback(() => {
    setIsAttacking(true);
    dispatch({ type: "ATTACK" });
    if (attackTimer.current) clearTimeout(attackTimer.current);
    attackTimer.current = setTimeout(() => setIsAttacking(false), 400);
  }, []);

  const replay = route.params?.replay === true;
  const finish = useCallback(() => {
    analytics.track("tutorial_complete", { replay });
    setTutorialSeen(true);
    if (replay) {
      navigation.goBack(); // came from the manual: go back there
      return;
    }
    emitSound("GAME_MUSIC_START");
    // Replace the tutorial with the real game so Back does not return to it.
    navigation.replace("GameScreen", {
      characterIndex,
      mode: "expedition",
      ascension: route.params?.ascension,
      meta: route.params?.meta,
    });
  }, [navigation, setTutorialSeen, characterIndex, replay, route.params?.ascension, route.params?.meta]);

  // Leaving early still marks the tutorial as seen (finish does it), but is reported apart so the funnel can tell them.
  const skip = useCallback(() => {
    analytics.track("tutorial_skip", { step: stepIndex });
    setTutorialSeen(true);
    if (replay) {
      navigation.goBack();
      return;
    }
    emitSound("GAME_MUSIC_START");
    navigation.replace("GameScreen", { characterIndex, mode: "expedition", ascension: route.params?.ascension, meta: route.params?.meta });
  }, [stepIndex, navigation, setTutorialSeen, characterIndex, replay, route.params?.ascension, route.params?.meta]);

  const highlight = step.highlight;

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

      {/* Instruction banner */}
      <View
        style={[
          styles.banner,
          {
            marginTop: insets.top,
            height: hudHeight,
            paddingLeft: insets.left + 14,
            paddingRight: insets.right + 14,
            paddingVertical: hudHeight < 70 ? 4 : 8,
          },
        ]}
        accessibilityLiveRegion="polite"
      >
        <View style={styles.bannerText}>
          <Text style={[styles.stepLabel, { fontSize: 11 * ui }]} maxFontSizeMultiplier={1.2}>
            {t("tutorial.title").toLocaleUpperCase()}
            {!isLast ? `  ·  ${t("tutorial.step", { n: stepIndex + 1, total: totalInteractive })}` : ""}
          </Text>
          <Text
            style={[styles.instruction, { fontSize: (hudHeight < 70 ? 13 : 15) * ui }]}
            maxFontSizeMultiplier={1.25}
            accessibilityRole="header"
            numberOfLines={2}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {showRetry ? t("tutorial.retry") : t(step.textKey as "tutorial.walk", { floors: GAME_CONFIG.expedition.floors })}
          </Text>
        </View>

        {isLast ? (
          <TouchableOpacity
            style={styles.playButton}
            onPress={finish}
            accessibilityRole="button"
            accessibilityLabel={t("tutorial.play")}
          >
            <Text style={styles.playText} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.3}>
              {t("tutorial.play").toLocaleUpperCase()}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.skipButton}
            onPress={skip}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t("tutorial.skip")}
          >
            <Text style={styles.skipText} numberOfLines={1} maxFontSizeMultiplier={1.3}>
              {t("tutorial.skip")}
            </Text>
          </TouchableOpacity>
        )}
      </View>

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
          characterIndex={characterIndex}
          isAttacking={isAttacking}
          highlight={highlight}
        />
        <View style={[styles.controlsWrapper, { width: controlPanelWidth }]}>
          <Controls onMove={move} onAttack={attack} arrows={state.attack} />
        </View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(0,0,0,0.65)",
    borderBottomWidth: 1,
    borderColor: "rgba(255,215,0,0.4)",
    paddingVertical: 8,
    zIndex: 10,
  },
  bannerText: { flex: 1, gap: 2 },
  stepLabel: { color: "#FFD700", fontWeight: "900", fontSize: 11, letterSpacing: 2 },
  instruction: { color: "#fff", fontWeight: "700", fontSize: 15 },
  playButton: {
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
  playText: { color: "#000", fontWeight: "900", fontSize: 14, letterSpacing: 1 },
  skipButton: { minHeight: MIN_TOUCH, justifyContent: "center", paddingHorizontal: 8 },
  skipText: { color: "#bdbdbd", fontWeight: "700", fontSize: 13, textDecorationLine: "underline" },
  gameContent: { flex: 1, alignItems: "center", justifyContent: "space-around" },
  controlsWrapper: { alignSelf: "stretch", justifyContent: "flex-end", alignItems: "center", paddingBottom: 10 },
});
