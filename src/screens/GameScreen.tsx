import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  StatusBar,
  Animated,
  AppState,
  BackHandler,
  Share,
  ImageBackground,
  useWindowDimensions,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import ScoreBar from "../ui/components/ScoreBar";
import BoardView from "../ui/components/BoardView";
import Controls from "../ui/components/DirectionPad";
import CoinFlight from "../ui/components/game/CoinFlight";
import DangerVignette from "../ui/components/game/DangerVignette";
import GameOverOverlay from "../ui/components/game/GameOverOverlay";
import HighScoreEntryModal from "../ui/components/game/HighScoreEntryModal";
import PauseOverlay from "../ui/components/game/PauseOverlay";
import RelicDraftOverlay from "../ui/components/game/RelicDraftOverlay";
import ScorePopup, { PopupType } from "../ui/components/game/ScorePopup";
import { useGameLayout, GAME_ROW_PADDING } from "../ui/layout/useGameLayout";
import { RELICS, RelicId, relicCount } from "../core/engine/relics";
import { useSettingsStore } from "../state/settings/store";
import { emitSound } from "../audio/audioEventBus";
import { useGameEngine } from "../core/engine/useGameEngine";
import { getNearbyHazards } from "../core/engine/proximity";
import { coinReward, killValue } from "../core/engine/scoring";
import characters from "../data/characters";
import { addHighscore, isTopTenScore } from "../services/highscores";
import { recordRun, recordDailyRun } from "../services/localStats";
import { dailyKey, dailySeed } from "../core/engine/seed";
import { analytics } from "../services/analytics";
import { GAME_CONFIG } from "../config/gameConfig";
import { useSessionTimer } from "../hooks/useSessionTimer";
import { useProximityAudio } from "../hooks/useProximityAudio";
import { useT } from "../i18n/useT";
import { relicText } from "../i18n/keys";

type Props = NativeStackScreenProps<RootStackParamList, "GameScreen">;

/** How long the top-10 check may delay the entry modal; the Game Over card never waits for it. */
const TOP_TEN_CHECK_TIMEOUT_MS = 1500;

type RunResult = { bestScore: number; isNewBest: boolean; streak?: number; unlocked?: number[] };

// ── Main Screen ──────────────────────────────────────────────────────────
export default function GameScreen({ navigation, route }: Props) {
  const { t, plural } = useT();
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const { controlPanelWidth, hudHeight } = useGameLayout();
  const controlPosition = useSettingsStore(s => s.controlPosition);
  const reduceFlash = useSettingsStore(s => s.reduceFlash);

  const rawIndex = route.params?.characterIndex ?? 0;
  const characterIndex = Math.min(Math.max(Math.trunc(rawIndex), 0), characters.length - 1);
  const selectedCharacter = characters[characterIndex];

  const mode = route.params?.mode ?? "expedition";
  const isDaily = mode === "daily";
  // The daily challenge fixes the board seed to today's UTC date (captured once per screen visit).
  const dailyDate = useRef(dailyKey()).current;

  const { state, isAttacking, move, attack, reset, levelUp, pickRelic } = useGameEngine();
  const [activeCoins, setActiveCoins] = useState<{ id: number; x: number; y: number }[]>([]);
  const [popups, setPopups] = useState<{ id: number; points: number; type: PopupType }[]>([]);
  const [runResult, setRunResult] = useState<RunResult | null>(null);
  const [showGameOver, setShowGameOver] = useState(false);
  const [showHighScoreEntry, setShowHighScoreEntry] = useState(false);
  const [paused, setPaused] = useState(false);
  const combatFlash = useRef(new Animated.Value(0)).current;
  const vortexFlash = useRef(new Animated.Value(0)).current;

  const runEnded = state.isGameOver || state.isVictory;
  const levelUpWindow = state.isLevelUp && !state.isVictory;
  const canPause = !runEnded && !state.isLevelUp && !state.pendingDraft && !showGameOver && !showHighScoreEntry;

  const { time: sessionTime, reset: resetTimer } = useSessionTimer(
    !runEnded && !state.isLevelUp && !paused && !state.pendingDraft,
  );

  // Latest values for listeners and timers (so effects do not need volatile dependencies).
  const stateRef = useRef(state);
  stateRef.current = state;
  const sessionTimeRef = useRef(sessionTime);
  sessionTimeRef.current = sessionTime;
  const pausedRef = useRef(false);
  pausedRef.current = paused;
  const canPauseRef = useRef(false);
  canPauseRef.current = canPause;
  const busyRef = useRef(false);
  busyRef.current = levelUpWindow || !!state.pendingDraft;

  // Guards / bookkeeping refs
  const lastPlayerIndex = useRef(state.playerIndex);
  const lastCoins = useRef(state.coins);
  const lastAttack = useRef(state.attack);
  const lastEnemyCount = useRef(state.entities.filter(e => e.type === "enemy").length);
  const killPlayerIndex = useRef(state.playerIndex);
  const gameOverTriggered = useRef(false); // prevents the end-of-run flow from running twice
  const runRecorded = useRef(false); //       the run is saved to local stats exactly once
  const justLeveledUp = useRef(false); //     suppresses a phantom MOVE sound on level start
  const isResetting = useRef(false); //       suppresses feedback while retrying
  const leaving = useRef(false); //           blocks timers from navigating after we left
  const mounted = useRef(true);
  const floorStart = useRef({ enemies: 0, gems: 0 });

  // ── Run bookkeeping ──────────────────────────────────────────────────────
  const startRun = useCallback(() => {
    reset(selectedCharacter, {
      heroIndex: characterIndex,
      ...(isDaily ? { mode: "daily" as const, runSeed: dailySeed(dailyDate) } : {}),
    });
  }, [reset, selectedCharacter, characterIndex, isDaily, dailyDate]);

  /** Saves the run to the local stats once (hero unlocks and bests depend on it) and returns the summary. */
  const recordCurrentRun = useCallback(async (): Promise<RunResult | null> => {
    if (runRecorded.current) return null;
    const s = stateRef.current;
    const progressed = s.turn > 0 || s.score > 0 || s.level > 1;
    if (!progressed) return null;
    runRecorded.current = true;

    const run = { score: s.score, level: s.level, victory: s.isVictory };
    try {
      if (isDaily) {
        const r = await recordDailyRun(run, dailyDate);
        return { bestScore: r.dailyBest, isNewBest: r.isNewDailyBest, streak: r.streak, unlocked: r.unlocked };
      }
      const r = await recordRun(run);
      return { bestScore: r.stats.bestScore, isNewBest: r.isNewBestScore, unlocked: r.unlocked };
    } catch (e) {
      console.warn("[GameScreen] recording the run failed:", e);
      return null;
    }
  }, [isDaily, dailyDate]);

  // Start the run on mount; save whatever was played when the screen goes away.
  useEffect(() => {
    mounted.current = true;
    startRun();
    analytics.track("game_start", { mode, character: characterIndex });
    return () => {
      mounted.current = false;
      void recordCurrentRun();
    };
  }, []);

  // Music, hardware Back and AppState only act while this screen is focused.
  useFocusEffect(
    useCallback(() => {
      emitSound("GAME_MUSIC_START");

      const backSub = BackHandler.addEventListener("hardwareBackPress", () => {
        if (pausedRef.current) {
          setPaused(false);
          return true;
        }
        if (canPauseRef.current) {
          setPaused(true);
          return true;
        }
        // Between floors (level-clear window, relic draft) Back must not silently abandon the run.
        return busyRef.current;
      });

      const appSub = AppState.addEventListener("change", next => {
        if (next !== "active" && canPauseRef.current) setPaused(true);
      });

      return () => {
        backSub.remove();
        appSub.remove();
        emitSound("GAME_MUSIC_STOP");
        emitSound("STOP_GUARDIAN_NEAR");
        emitSound("STOP_VORTEX_NEAR");
      };
    }, []),
  );

  // ── Floor bookkeeping (real counts for the level-complete card) ───────────
  useEffect(() => {
    floorStart.current = {
      enemies: state.entities.filter(e => e.type === "enemy").length,
      gems: state.coins,
    };
  }, [state.seed]);

  // ── Vortex teleport flash ────────────────────────────────────────────────
  useEffect(() => {
    if (!state.wasTeleported) return;
    emitSound("VORTEX_TELEPORT");
    const peak = reduceFlash ? 0.2 : 1;
    Animated.sequence([
      Animated.timing(vortexFlash, { toValue: peak, duration: reduceFlash ? 250 : 120, useNativeDriver: true }),
      Animated.timing(vortexFlash, { toValue: 0, duration: 350, useNativeDriver: true }),
    ]).start();
  }, [state.wasTeleported, state.playerIndex]);

  // ── Run end (death or victory) ───────────────────────────────────────────
  useEffect(() => {
    if (!runEnded || gameOverTriggered.current) return;
    gameOverTriggered.current = true;

    const s = stateRef.current;
    const time = sessionTimeRef.current;
    if (s.isVictory) {
      emitSound("LEVEL_UP"); // victory fanfare
      analytics.track("expedition_won", { score: s.score, time, character: characterIndex, mode });
    } else {
      emitSound("GAME_OVER");
      analytics.track("game_over", { level: s.level, score: s.score, time, cause: s.deathCause ?? "unknown" });
    }

    let cancelled = false;
    const resultPromise = recordCurrentRun();

    // The card appears right away; nothing here waits for the network.
    const timer = setTimeout(async () => {
      if (cancelled || !mounted.current) return;
      setShowGameOver(true);

      const result = await resultPromise;
      if (!cancelled && mounted.current && result) setRunResult(result);

      // Daily runs never enter the global top 10.
      if (isDaily) return;
      const qualifies = await Promise.race([
        isTopTenScore(s.score, time).catch(() => false),
        new Promise<boolean>(resolve => setTimeout(() => resolve(false), TOP_TEN_CHECK_TIMEOUT_MS)),
      ]);
      if (!cancelled && mounted.current && qualifies) setShowHighScoreEntry(true);
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [runEnded]);

  const handleHighScoreSubmit = useCallback(
    async (playerName: string) => {
      const s = stateRef.current;
      await addHighscore({
        score: s.score,
        level: s.level,
        name: playerName,
        coins: s.totalCoins,
        characterIndex,
        time: sessionTimeRef.current,
      });
      analytics.track("high_score_submitted", { level: s.level, score: s.score });
      setShowHighScoreEntry(false);
    },
    [characterIndex],
  );

  const handleRetry = useCallback(() => {
    void recordCurrentRun(); // an abandoned run still counts for unlocks
    runRecorded.current = false;
    isResetting.current = true;
    gameOverTriggered.current = false;
    emitSound("GAME_MUSIC_START"); // Game Over / victory stopped the loop and the focus did not change
    setPopups([]);
    setRunResult(null);
    setShowGameOver(false);
    setShowHighScoreEntry(false);
    resetTimer();
    setPaused(false);
    startRun();
    setTimeout(() => {
      isResetting.current = false;
    }, 100);
  }, [startRun, recordCurrentRun, resetTimer]);

  const handleMainMenu = useCallback(() => {
    leaving.current = true;
    void recordCurrentRun();
    setPaused(false);
    setPopups([]);
    setShowGameOver(false);
    emitSound("GAME_MUSIC_STOP");
    // Pop back to the existing Cover instead of stacking a second one on top of this screen.
    navigation.popTo("CoverScreen");
  }, [navigation, recordCurrentRun]);

  const handlePickRelic = useCallback(
    (id: RelicId) => {
      emitSound("RELIC_PICKED");
      analytics.track("relic_picked", { relic: id, floor: stateRef.current.level });
      pickRelic(id);
    },
    [pickRelic],
  );

  const handleShare = useCallback(async () => {
    const s = stateRef.current;
    const streak = runResult?.streak ? plural("share.streak", runResult.streak) : "";
    const message = t("share.daily", {
      date: dailyDate,
      floor: s.level,
      score: s.score.toLocaleString(),
      gems: plural("common.gems", s.totalCoins),
      streak,
    });
    analytics.track("daily_shared", { score: s.score });
    try {
      await Share.share({ message });
    } catch (e) {
      console.warn("[GameScreen] share error:", e);
    }
  }, [dailyDate, runResult, t, plural]);

  // ── Floor cleared → level-complete screen → next floor ────────────────────
  useEffect(() => {
    if (!levelUpWindow) return;
    const s = stateRef.current;
    emitSound("LEVEL_UP");
    analytics.track("level_complete", { level: s.level, score: s.score, time: sessionTimeRef.current });

    const timer = setTimeout(() => {
      if (leaving.current || !mounted.current) return;
      const now = stateRef.current;
      const enemiesLeft = now.entities.filter(e => e.type === "enemy").length;
      navigation.navigate("LevelCompleteScreen", {
        characterIndex,
        score: now.score,
        level: now.level,
        coins: floorStart.current.gems - now.coins,
        totalCoins: floorStart.current.gems,
        sessionCoins: now.totalCoins,
        kills: Math.max(0, floorStart.current.enemies - enemiesLeft),
        totalEnemies: floorStart.current.enemies,
        time: sessionTimeRef.current,
      });
      justLeveledUp.current = true;
      levelUp();
    }, 800);

    return () => clearTimeout(timer);
  }, [levelUpWindow]);

  // ── Gameplay feedback ────────────────────────────────────────────────────
  useEffect(() => {
    const collectingCoin = state.coins < lastCoins.current;
    const isPhantomMove = justLeveledUp.current;
    justLeveledUp.current = false;

    if (
      state.playerIndex !== lastPlayerIndex.current &&
      !state.isGameOver &&
      !state.isLevelUp &&
      !collectingCoin &&
      !isPhantomMove
    ) {
      emitSound("MOVE");
    }
    lastPlayerIndex.current = state.playerIndex;

    if (collectingCoin && !isResetting.current) {
      emitSound("COIN_COLLECTED");
      const points = coinReward(state.level, state.perks.coinMultiplier, relicCount(state.relics, "lucky_coin"));
      setPopups(prev => [...prev, { id: Date.now() + Math.random(), points, type: "coin" }]);
      setActiveCoins(prev => [
        ...prev,
        { id: Date.now() + Math.random(), x: windowWidth / 2 - 16, y: windowHeight / 2 - 16 },
      ]);
    }
    lastCoins.current = state.coins;

    if (state.attack < lastAttack.current) emitSound("ATTACK");
    lastAttack.current = state.attack;
  }, [state.playerIndex, state.coins, state.attack, state.isGameOver, state.isLevelUp]);

  useEffect(() => {
    const enemies = state.entities.filter(e => e.type === "enemy").length;
    // A kill removes an enemy while the player stays put; a shield-absorbed hit moves the player onto the tile.
    const killed = enemies < lastEnemyCount.current && state.playerIndex === killPlayerIndex.current;
    if (killed && !isResetting.current) {
      emitSound("ENEMY_KILLED");
      setPopups(prev => [...prev, { id: Date.now() + Math.random(), points: killValue(state.enemyCombo), type: "kill" }]);
      Animated.sequence([
        Animated.timing(combatFlash, { toValue: reduceFlash ? 0.08 : 0.35, duration: reduceFlash ? 120 : 25, useNativeDriver: true }),
        Animated.timing(combatFlash, { toValue: 0, duration: reduceFlash ? 160 : 35, useNativeDriver: true }),
      ]).start();
    }
    lastEnemyCount.current = enemies;
    killPlayerIndex.current = state.playerIndex;
  }, [state.entities]);

  useProximityAudio(state);

  // The Wumpus lair announces itself.
  useEffect(() => {
    if (mode !== "endless" && state.level === GAME_CONFIG.expedition.floors && state.turn === 0) {
      emitSound("BOSS_ROAR");
    }
  }, [state.level]);

  // Power-ups and traps: sound + floating label
  useEffect(() => {
    if (!state.lastPickup) return;
    const id = Date.now() + Math.random();
    if (state.lastPickup === "trap") {
      emitSound("TRAP_TRIGGERED");
      setPopups(prev => [...prev, { id, points: GAME_CONFIG.scoring.trapPenalty, type: "trap" }]);
    } else {
      emitSound("POWERUP");
      const kind = state.lastPickup;
      setPopups(prev => [...prev, { id, points: kind === "ammo" ? GAME_CONFIG.pickups.ammoAmount : 0, type: kind }]);
    }
  }, [state]);

  const nearby = getNearbyHazards(state.playerIndex, state.rows, state.cols, state.entityMap);
  const relicNames = state.relics.map(id => relicText(t, id, "name")).join(", ");

  const boardSummary = [
    t("hud.floorOf", { level: state.level, floors: GAME_CONFIG.expedition.floors }),
    plural("a11y.gemsLeft", state.coins),
    t("a11y.arrowsLeft", { count: state.attack }),
    state.shield ? t("a11y.shieldActive") : "",
    state.relics.length ? t("a11y.relics", { names: relicNames }) : "",
  ]
    .filter(Boolean)
    .join(". ");

  const removeCoin = (id: number) => setActiveCoins(prev => prev.filter(c => c.id !== id));
  const flashPeak = reduceFlash ? 0.25 : 1;

  return (
    <ImageBackground
      source={require("../assets/sprites/backgrounds/Cover_Background.png")}
      style={styles.container}
      resizeMode="cover"
    >
      {/* Dark overlay for gameplay clarity */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.55)" }]} />

      <StatusBar hidden />

      <View style={{ paddingTop: insets.top, zIndex: 10 }}>
        <ScoreBar
          score={state.score}
          coins={state.coins}
          attackValue={state.attack}
          shield={state.shield}
          onPause={canPause ? () => setPaused(true) : undefined}
          level={state.level}
          floors={mode === "endless" ? undefined : GAME_CONFIG.expedition.floors}
          character={selectedCharacter}
          time={sessionTime}
        />
      </View>

      {state.relics.length > 0 && (
        <View
          style={[styles.relicRow, { top: insets.top + hudHeight + 4, left: insets.left + 8 }]}
          pointerEvents="none"
          accessible
          accessibilityLabel={t("a11y.relics", { names: relicNames })}
        >
          {state.relics.map((id, i) => (
            <Text key={`${id}-${i}`} style={styles.relicIcon} maxFontSizeMultiplier={1.2}>
              {RELICS[id].icon}
            </Text>
          ))}
        </View>
      )}

      <DangerVignette roar={nearby.enemy} vortex={nearby.pit} />

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
        <View accessible accessibilityRole="summary" accessibilityLabel={boardSummary}>
          <BoardView
            level={state.level}
            rows={state.rows}
            cols={state.cols}
            entities={state.entities}
            entityMap={state.entityMap}
            playerIndex={state.playerIndex}
            visited={state.visited}
            facingDir={state.facingDir}
            characterIndex={characterIndex}
            isGameOver={state.isGameOver}
            isAttacking={isAttacking}
            lastKilledEnemyCount={state.entities.filter(e => e.type === "enemy").length}
          />
        </View>

        <View style={[styles.controlsWrapper, { width: controlPanelWidth }]}>
          <Controls onMove={move} onAttack={attack} />
        </View>
      </View>

      {popups.map(p => (
        <ScorePopup
          key={p.id}
          points={p.points}
          type={p.type}
          onComplete={() => setPopups(prev => prev.filter(k => k.id !== p.id))}
        />
      ))}

      {activeCoins.map(c => (
        <CoinFlight
          key={c.id}
          startX={c.x}
          startY={c.y}
          targetX={windowWidth - insets.right - controlPanelWidth * 0.5}
          targetY={insets.top + hudHeight * 0.5}
          onComplete={() => removeCoin(c.id)}
        />
      ))}

      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: "#FFF", opacity: Animated.multiply(combatFlash, flashPeak), zIndex: 999 },
        ]}
        pointerEvents="none"
      />

      {/* Purple flash on vortex teleport */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: "rgba(156,39,176,0.55)", opacity: vortexFlash, zIndex: 998 },
        ]}
        pointerEvents="none"
      />

      <RelicDraftOverlay offer={state.pendingDraft} floor={state.level} onPick={handlePickRelic} />

      <PauseOverlay
        visible={paused}
        onResume={() => setPaused(false)}
        onRestart={handleRetry}
        onMainMenu={handleMainMenu}
      />

      <GameOverOverlay
        visible={showGameOver}
        score={state.score}
        level={state.level}
        totalCoins={state.totalCoins}
        time={sessionTime}
        character={selectedCharacter}
        deathCause={state.deathCause}
        victory={state.isVictory}
        bestScore={runResult?.bestScore}
        isNewBest={runResult?.isNewBest}
        dailyLabel={isDaily ? dailyDate : undefined}
        streak={runResult?.streak}
        unlockedHeroes={runResult?.unlocked}
        onShare={isDaily ? handleShare : undefined}
        onRetry={handleRetry}
        onMainMenu={handleMainMenu}
      />

      <HighScoreEntryModal
        visible={showHighScoreEntry}
        score={state.score}
        level={state.level}
        totalCoins={state.totalCoins}
        time={sessionTime}
        onSubmit={handleHighScoreSubmit}
        onSkip={() => setShowHighScoreEntry(false)}
      />
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  gameContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "space-around",
  },
  controlsWrapper: {
    justifyContent: "center",
    alignItems: "center",
  },
  relicRow: {
    position: "absolute",
    zIndex: 11,
    flexDirection: "row",
    flexWrap: "wrap",
    maxWidth: "40%",
    gap: 2,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 10,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  relicIcon: { fontSize: 15 },
});
