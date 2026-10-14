import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  StyleSheet,
  View,
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
import AttackPanel from "../ui/components/AttackPanel";
import CoinFlight from "../ui/components/game/CoinFlight";
import DangerVignette from "../ui/components/game/DangerVignette";
import GameOverOverlay from "../ui/components/game/GameOverOverlay";
import HighScoreEntryModal from "../ui/components/game/HighScoreEntryModal";
import PauseOverlay from "../ui/components/game/PauseOverlay";
import FloorBanner from "../ui/components/game/FloorBanner";
import RunLoadingCover from "../ui/components/game/RunLoadingCover";
import RelicTray from "../ui/components/RelicTray";
import RelicDraftOverlay from "../ui/components/game/RelicDraftOverlay";
import IntermissionOverlay from "../ui/components/game/IntermissionOverlay";
import ToolBar from "../ui/components/ToolBar";
import CoachHint from "../ui/components/game/CoachHint";
import ScorePopup, { PopupType } from "../ui/components/game/ScorePopup";
import { useGameLayout, GAME_ROW_PADDING } from "../ui/layout/useGameLayout";
import { RelicId, relicCount } from "../core/engine/relics";
import { useSettingsStore } from "../state/settings/store";
import { emitSound } from "../audio/audioEventBus";
import { useGameEngine } from "../core/engine/useGameEngine";
import { getNearbyHazards } from "../core/engine/proximity";
import { bossHearts, countGuardians } from "../core/engine/entityCounts";
import { lineOfFire, stepTarget } from "../core/engine/travel";
import type { Direction } from "../core/engine/types";
import { haptic, NotificationFeedbackType } from "../shared/haptics";
import { coinReward, killValue } from "../core/engine/scoring";
import type { TranslationKey } from "../i18n/en";
import { omenEffects } from "../core/engine/omens";
import { forkDoors } from "../core/engine/shop";
import { biomeFor, isNewBiome } from "../core/engine/biomes";
import { isLairFloor } from "../core/engine/lair";
import characters from "../data/characters";
import { addHighscore, isTopTenScore } from "../services/highscores";
import { recordRun, recordDailyRun } from "../services/localStats";
import { dailyKey, dailySeed } from "../core/engine/seed";
import { clampAscension, modifiersFor } from "../core/engine/ascension";
import { analytics } from "../services/analytics";
import { GAME_CONFIG } from "../config/gameConfig";
import { useSessionTimer } from "../hooks/useSessionTimer";
import { useProximityAudio } from "../hooks/useProximityAudio";
import { useTravel } from "../hooks/useTravel";
import { useT } from "../i18n/useT";
import { omenText, relicText } from "../i18n/keys";

type Props = NativeStackScreenProps<RootStackParamList, "GameScreen">;

/** The dark wash over the cave picture: each cave type leans toward its own colour. */
const BIOME_TINT: Record<ReturnType<typeof biomeFor>, string> = {
  cave: "rgba(0,0,0,0.55)",
  crystal: "rgba(0,24,56,0.6)",
  magma: "rgba(48,8,0,0.58)",
  lair: "rgba(30,0,12,0.6)",
};

/** How long the top-10 check may delay the entry modal; the Game Over card never waits for it. */
/** How long the board is left on screen after a death (the red flash, the shake and the killer in view) before the card. */
const GAME_OVER_CARD_DELAY_MS = 850;
const TOP_TEN_CHECK_TIMEOUT_MS = 1500;

type RunResult = {
  bestScore: number;
  isNewBest: boolean;
  streak?: number;
  unlocked?: number[];
  achievements?: string[];
  embers?: number;
  bonus?: number;
};

// ── Main Screen ──────────────────────────────────────────────────────────
export default function GameScreen({ navigation, route }: Props) {
  const { t, plural } = useT();
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const { controlPanelWidth, hudHeight, splitAttack } = useGameLayout();
  const controlPosition = useSettingsStore(s => s.controlPosition);
  const reduceFlash = useSettingsStore(s => s.reduceFlash);

  const rawIndex = route.params?.characterIndex ?? 0;
  const characterIndex = Math.min(Math.max(Math.trunc(rawIndex), 0), characters.length - 1);
  const selectedCharacter = characters[characterIndex];

  const mode = route.params?.mode ?? "expedition";
  const isDaily = mode === "daily";
  const ascension = isDaily ? 0 : clampAscension(route.params?.ascension ?? 0);
  // The daily challenge fixes the board seed to today's UTC date (captured once per screen visit).
  const dailyDate = useRef(dailyKey()).current;

  const { state, isAttacking, move, attack, reset, levelUp, pickRelic, buy, useAltar: spendAltar, useItem: spendItem, useAbility: castAbility, undo } = useGameEngine();
  // Between two floors: the shop and the fork, shown once the level-complete card is dismissed.
  const [intermission, setIntermission] = useState(false);
  const [door, setDoor] = useState<0 | 1>(0);
  const [activeCoins, setActiveCoins] = useState<{ id: number; x: number; y: number }[]>([]);
  const [popups, setPopups] = useState<{ id: number; points: number; type: PopupType }[]>([]);
  const [runResult, setRunResult] = useState<RunResult | null>(null);
  const [showGameOver, setShowGameOver] = useState(false);
  const [showHighScoreEntry, setShowHighScoreEntry] = useState(false);
  const [paused, setPaused] = useState(false);
  const combatFlash = useRef(new Animated.Value(0)).current;
  const vortexFlash = useRef(new Animated.Value(0)).current;
  // Red wash that appears the instant the hero dies and stays under the game-over card.
  const deathFlash = useRef(new Animated.Value(0)).current;

  const swipeMove = useSettingsStore(s => s.swipeMove);
  const hintsSeen = useSettingsStore(s => s.hintsSeen);
  const markHintSeen = useSettingsStore(s => s.markHintSeen);
  // While an overlay is open, the HUD, board and pad must not be reachable by screen readers (Android ignores
  // accessibilityViewIsModal).
  const overlayOpen = paused || !!state.pendingDraft || showGameOver || showHighScoreEntry || intermission;
  const behindOverlay = {
    importantForAccessibility: overlayOpen ? ("no-hide-descendants" as const) : ("auto" as const),
    accessibilityElementsHidden: overlayOpen,
  };
  const [runNumber, setRunNumber] = useState(0);
  // Opaque cover until the first board has really been drawn (or a safety timeout): no black or half-painted board.
  const [bootCover, setBootCover] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setBootCover(false), 2500);
    return () => clearTimeout(timer);
  }, []);
  const runEnded = state.isGameOver || state.isVictory;
  const floorOmen = state.omen;
  const floorBiome = biomeFor(state.level, state.mode);
  const isLair = isLairFloor(state.mode, state.level);
  const levelUpWindow = state.isLevelUp && !state.isVictory;
  // A new cave type is announced on its first floor (the omen, when there is one, takes the banner).
  const biomeAnnounce = isNewBiome(state.level, state.mode) && floorBiome !== "cave" && floorBiome !== "lair";
  const doors = useMemo(
    () => (intermission ? forkDoors(state.runSeed, state.level + 1, state.mode) : null),
    [intermission, state.runSeed, state.level, state.mode],
  );
  useEffect(() => {
    if (!levelUpWindow) setIntermission(false);
  }, [levelUpWindow]);

  // Tap an explored tile to walk there; any control press interrupts the walk.
  const { travelTo, cancel: cancelTravel } = useTravel(state, move, !paused && !runEnded && !levelUpWindow && !state.pendingDraft);
  // Tiles the player marked as dangerous (long press). Cosmetic memory aid with one safety rule: stepping
  // onto a marked tile is refused, so a slip of the thumb cannot walk into a suspected hazard.
  const [flags, setFlags] = useState<ReadonlySet<number>>(() => new Set());
  const toggleFlag = useCallback((index: number) => {
    const s = stateRef.current;
    if (s.visited.includes(index)) return;
    haptic.impact();
    setFlags(prev => {
      const next = new Set(prev);
      if (!next.delete(index)) next.add(index);
      return next;
    });
  }, []);
  useEffect(() => setFlags(new Set()), [state.level, state.runSeed, runNumber]);
  // The detector flags the hazards it finds, exactly like the player's own long-press flags.
  useEffect(() => {
    if (state.marked.length === 0) return;
    setFlags(prev => new Set([...prev, ...state.marked]));
  }, [state.marked]);

  const manualMove = useCallback(
    (d: Parameters<typeof move>[0]) => {
      cancelTravel();
      const s = stateRef.current;
      if (flags.has(stepTarget(s.playerIndex, d, s.rows, s.cols))) {
        haptic.notify(NotificationFeedbackType.Warning); // marked as dangerous: refuse the step
        return;
      }
      move(d);
    },
    [cancelTravel, move, flags],
  );
  const manualAttack = useCallback((direction?: Direction) => { cancelTravel(); attack(direction); }, [cancelTravel, attack]);
  // While the attack button is held, the board shows where the arrow would go.
  const [aim, setAim] = useState<Direction | "facing" | null>(null);
  const reach = state.perks.arrowReach + relicCount(state.relics, "long_bow");
  const aimTiles = useMemo(
    () => (aim ? new Set(lineOfFire(state.playerIndex, aim === "facing" ? state.facingDir : aim, reach, state.rows, state.cols)) : undefined),
    [aim, state.playerIndex, state.facingDir, state.rows, state.cols, reach],
  );
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
  const lastEnemyCount = useRef(countGuardians(state));
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
    deathFlash.setValue(0);
    setRunNumber(n => n + 1); // replays the floor banner even when a daily restarts on the same seed
    reset(selectedCharacter, {
      heroIndex: characterIndex,
      ascension,
      meta: route.params?.meta,
      ...(isDaily ? { mode: "daily" as const, runSeed: dailySeed(dailyDate) } : {}),
      ...(mode === "endless" ? { mode: "endless" as const } : {}),
    });
  }, [reset, selectedCharacter, characterIndex, ascension, isDaily, dailyDate, route.params?.meta]);

  /** Saves the run to the local stats once (hero unlocks and bests depend on it) and returns the summary. */
  const recordCurrentRun = useCallback(async (): Promise<RunResult | null> => {
    if (runRecorded.current) return null;
    const s = stateRef.current;
    const progressed = s.turn > 0 || s.score > 0 || s.level > 1;
    if (!progressed) return null;
    runRecorded.current = true;

    const run = {
      score: s.score,
      level: s.level,
      victory: s.isVictory,
      gems: s.totalCoins,
      relics: s.relics.length,
      time: sessionTimeRef.current,
      heroIndex: characterIndex,
      ascension,
      mode,
    };
    try {
      if (isDaily) {
        const r = await recordDailyRun(run, dailyDate);
        return { bestScore: r.dailyBest, isNewBest: r.isNewDailyBest, streak: r.streak, unlocked: r.unlocked, achievements: r.achievements, embers: r.embers, bonus: r.bonus };
      }
      const r = await recordRun(run);
      // The endless descent keeps its own record, measured in floors.
      return { bestScore: mode === "endless" ? r.stats.bestEndlessFloor : r.stats.bestScore, isNewBest: r.isNewBestScore, unlocked: r.unlocked, achievements: r.achievements, embers: r.embers, bonus: r.bonus };
    } catch (e) {
      console.warn("[GameScreen] recording the run failed:", e);
      return null;
    }
  }, [isDaily, dailyDate, characterIndex, ascension, mode]);

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
      enemies: countGuardians(state),
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
    if (!s.isVictory) {
      // Immediate feedback: the board shakes (see BoardView) and the screen flashes red, then settles.
      Animated.sequence([
        Animated.timing(deathFlash, { toValue: reduceFlash ? 0.3 : 0.65, duration: 90, useNativeDriver: true }),
        Animated.timing(deathFlash, { toValue: 0.28, duration: 450, useNativeDriver: true }),
      ]).start();
    }
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

      // Daily and endless runs never enter the global top 10 (its limits are those of a ten-floor expedition).
      if (isDaily || mode === "endless") return;
      const qualifies = await Promise.race([
        isTopTenScore(s.score, time).catch(() => false),
        new Promise<boolean>(resolve => setTimeout(() => resolve(false), TOP_TEN_CHECK_TIMEOUT_MS)),
      ]);
      if (!cancelled && mounted.current && qualifies) setShowHighScoreEntry(true);
    }, s.isVictory ? 700 : GAME_OVER_CARD_DELAY_MS);

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

  const relicPicked = useRef(false);
  useEffect(() => {
    relicPicked.current = false; // a new draft (or none) re-arms the guard
  }, [state.pendingDraft]);

  const handlePickRelic = useCallback(
    (id: RelicId) => {
      if (relicPicked.current) return; // a double tap must not play the sound or log the pick twice
      relicPicked.current = true;
      emitSound("RELIC_PICKED");
      analytics.track("relic_picked", { relic: id, floor: stateRef.current.level });
      pickRelic(id);
    },
    [pickRelic],
  );

  const handleShare = useCallback(async () => {
    const s = stateRef.current;
    const streak = runResult?.streak ? plural("share.streak", runResult.streak) : "";
    const message = isDaily
      ? t("share.daily", {
          date: dailyDate,
          floor: s.level,
          score: s.score.toLocaleString(),
          gems: plural("common.gems", s.totalCoins),
          streak,
        })
      : t("share.run", {
          depth: ascension > 0 ? ` · ${t(`ascension.label.${ascension}` as TranslationKey)}` : "",
          result: s.isVictory ? t("share.won") : t("share.reached", { floor: s.level }),
          score: s.score.toLocaleString(),
          gems: plural("common.gems", s.totalCoins),
        });
    analytics.track(isDaily ? "daily_shared" : "run_shared", { score: s.score });
    try {
      await Share.share({ message });
    } catch (e) {
      console.warn("[GameScreen] share error:", e);
    }
  }, [dailyDate, runResult, t, plural, isDaily, ascension]);

  // ── Floor cleared → level-complete screen → next floor ────────────────────
  useEffect(() => {
    if (!levelUpWindow) return;
    const s = stateRef.current;
    emitSound("LEVEL_UP");
    analytics.track("level_complete", { level: s.level, score: s.score, time: sessionTimeRef.current });

    const timer = setTimeout(() => {
      if (leaving.current || !mounted.current) return;
      const now = stateRef.current;
      const enemiesLeft = countGuardians(now);
      navigation.navigate("LevelCompleteScreen", {
        characterIndex,
        score: now.score,
        level: now.level,
        coins: floorStart.current.gems - now.coins,
        totalCoins: floorStart.current.gems,
        kills: Math.max(0, floorStart.current.enemies - enemiesLeft),
        totalEnemies: floorStart.current.enemies,
        time: sessionTimeRef.current,
      });
      setDoor(0);
      setIntermission(true);
    }, 800);

    return () => clearTimeout(timer);
  }, [levelUpWindow]);

  const handleGo = useCallback(() => {
    const s = stateRef.current;
    if (!s.isLevelUp || s.isVictory || leaving.current) return;
    const options = forkDoors(s.runSeed, s.level + 1, s.mode);
    setIntermission(false);
    justLeveledUp.current = true;
    // Without a fork (daily, lair) the seeded omen applies.
    levelUp(options ? options[door] : undefined);
  }, [levelUp, door]);

  const handleBuy = useCallback((item: Parameters<typeof buy>[0]) => { emitSound("POWERUP"); buy(item); }, [buy]);
  const handleAltar = useCallback(() => { emitSound("RELIC_PICKED"); spendAltar(); }, [spendAltar]);
  const handleAbility = useCallback(() => { cancelTravel(); emitSound("POWERUP"); castAbility(); }, [cancelTravel, castAbility]);
  const handleItem = useCallback((item: "detector" | "bomb") => { cancelTravel(); emitSound("POWERUP"); spendItem(item); }, [cancelTravel, spendItem]);
  const handleUndo = useCallback(() => { cancelTravel(); emitSound("MOVE"); undo(); }, [cancelTravel, undo]);

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
      const points = coinReward(
        state.level,
        state.perks.coinMultiplier * omenEffects(state.omen).gemMultiplier * (relicCount(state.relics, "blood_pact") > 0 ? 1.5 : 1),
        relicCount(state.relics, "lucky_coin"),
      );
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
    const enemies = countGuardians(state);
    // A kill removes an enemy while the player stays put; a shield-absorbed hit moves the player onto the tile.
    const killed = enemies < lastEnemyCount.current && state.playerIndex === killPlayerIndex.current;
    if (killed && !isResetting.current) {
      emitSound("ENEMY_KILLED");
      if (state.enemyCombo > 0) setPopups(prev => [...prev, { id: Date.now() + Math.random(), points: killValue(state.enemyCombo), type: "kill" }]);
      Animated.sequence([
        Animated.timing(combatFlash, { toValue: reduceFlash ? 0.08 : 0.35, duration: reduceFlash ? 120 : 25, useNativeDriver: true }),
        Animated.timing(combatFlash, { toValue: 0, duration: reduceFlash ? 160 : 35, useNativeDriver: true }),
      ]).start();
    }
    lastEnemyCount.current = enemies;
  }, [state.entities]);
  // Runs after every update (even steps that leave the entities untouched), so the next shot compares with the right tile.
  useEffect(() => {
    killPlayerIndex.current = state.playerIndex;
  });

  useProximityAudio(state);

  // The Wumpus lair announces itself.
  useEffect(() => {
    if (isLairFloor(state.mode, state.level) && state.turn === 0) {
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
    nearby.enemy ? t("a11y.nearGuardian") : "",
    nearby.pit ? t("a11y.nearVortex") : "",
  ]
    .filter(Boolean)
    .join(". ");

  // One-time tips for the tools, shown the first time each one is available (never over an overlay).
  const hint: { id: string; text: string } | null = (() => {
    if (runEnded || levelUpWindow || overlayOpen || bootCover || state.turn === 0) return null;
    const unseen = (id: string) => !hintsSeen.includes(id);
    if (state.perks.ability && unseen("ability")) {
      return { id: "ability", text: t("hint.ability", { name: t(`ability.${state.perks.ability}.name` as TranslationKey), desc: t(`ability.${state.perks.ability}.desc` as TranslationKey) }) };
    }
    if (state.undo && !state.undoUsed && unseen("undo")) return { id: "undo", text: t("hint.undo") };
    if (state.items.detector > 0 && unseen("detector")) return { id: "detector", text: t("hint.detector") };
    if (state.items.bomb > 0 && unseen("bomb")) return { id: "bomb", text: t("hint.bomb") };
    return null;
  })();

  const removeCoin = (id: number) => setActiveCoins(prev => prev.filter(c => c.id !== id));
  const flashPeak = reduceFlash ? 0.25 : 1;

  // The run starts in an effect, so the very first render still holds the engine's empty placeholder board.
  // Showing it would flash a wrong board for a moment: wait until the real run exists.
  if (state.selectedCharacter === null) return <RunLoadingCover visible />;

  return (
    <ImageBackground
      fadeDuration={0}
      resizeMethod="none"
      source={require("../assets/sprites/backgrounds/Cover_Background.png")}
      style={styles.container}
      resizeMode="cover"
    >
      {/* Dark overlay for gameplay clarity */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: BIOME_TINT[floorBiome] }]} />

      <StatusBar hidden />

      <View style={{ paddingTop: insets.top, zIndex: 10 }} {...behindOverlay}>
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
          bossHearts={isLair ? bossHearts(state) : undefined}
        />
      </View>


      <DangerVignette roar={nearby.enemy} vortex={nearby.pit} />
      {!runEnded && !levelUpWindow && !state.pendingDraft && !bootCover && (
        <FloorBanner
          floorKey={`${runNumber}-${state.runSeed}-${state.level}`}
          title={isLair ? t("floor.banner.lair") : t("floor.banner", { n: state.level })}
          omenName={isLair ? t("boss.goalTitle") : floorOmen ? omenText(t, floorOmen, "name") : biomeAnnounce ? t(`biome.${floorBiome}.name` as TranslationKey) : undefined}
          omenRule={isLair ? t("boss.goalRule", { hearts: bossHearts(state) }) : floorOmen ? omenText(t, floorOmen, "rule") : biomeAnnounce ? t(`biome.${floorBiome}.rule` as TranslationKey) : undefined}
          long={isLair}
          dismiss={state.turn > 0}
          calm={reduceFlash}
        />
      )}

      <View
        {...behindOverlay}
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
        <AttackPanel onAttack={manualAttack} onAim={setAim} arrows={state.attack} relics={state.relics} relicsLabel={t("a11y.relics", { names: relicNames })} />

        <View accessible accessibilityRole="summary" accessibilityLabel={boardSummary}>
          <BoardView
            level={state.level}
            rows={state.rows}
            cols={state.cols}
            entityMap={state.entityMap}
            playerIndex={state.playerIndex}
            visited={state.visited}
            facingDir={state.facingDir}
            characterIndex={characterIndex}
            isAttacking={isAttacking}
            guardianCount={countGuardians(state)}
            onTilePress={travelTo}
            flags={flags}
            aimTiles={aimTiles}
            dying={state.isGameOver && !state.isVictory}
            onTileLongPress={toggleFlag}
            onReady={() => setBootCover(false)}
            onSwipe={swipeMove ? manualMove : undefined}
          />
        </View>

        <View style={[styles.controlsWrapper, { width: controlPanelWidth }]}>
          {/* Wide screens show the relics above the attack button; narrow ones, above the pad. */}
          {state.relics.length > 0 && !splitAttack && (
            <View style={styles.relicSlot} pointerEvents="none">
              <RelicTray relics={state.relics} size={28} label={t("a11y.relics", { names: relicNames })} />
            </View>
          )}
          <View style={styles.toolSlot}>
            <ToolBar
              ability={state.perks.ability}
              abilityCd={state.abilityCd}
              detector={state.items.detector}
              bomb={state.items.bomb}
              canUndo={!!state.undo && !state.undoUsed}
              onAbility={handleAbility}
              onDetector={() => handleItem("detector")}
              onBomb={() => handleItem("bomb")}
              onUndo={handleUndo}
              size={Math.max(38, Math.min(46, controlPanelWidth * 0.26))}
            />
          </View>
          <Controls onMove={manualMove} onAttack={manualAttack} onAim={setAim} arrows={state.attack} />
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

      <Animated.View
        style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(255,23,68,1)", opacity: deathFlash, zIndex: 997 }]}
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

      {hint && (
        <CoachHint
          hintKey={hint.id}
          text={hint.text}
          place={
            controlPosition === "left"
              ? { top: insets.top + hudHeight + 8, left: insets.left + GAME_ROW_PADDING, width: controlPanelWidth }
              : { top: insets.top + hudHeight + 8, right: insets.right + GAME_ROW_PADDING, width: controlPanelWidth }
          }
          calm={reduceFlash}
          onDone={() => markHintSeen(hint.id)}
        />
      )}

      <IntermissionOverlay
        visible={intermission && levelUpWindow}
        nextFloor={state.level + 1}
        nextIsLair={isLairFloor(state.mode, state.level + 1)}
        newBiome={isNewBiome(state.level + 1, state.mode) ? biomeFor(state.level + 1, state.mode) : null}
        gems={state.gems}
        shield={state.shield}
        items={state.items}
        doors={doors}
        chosen={door}
        onChoose={setDoor}
        onBuy={handleBuy}
        altarUsed={state.altarUsed}
        onAltar={handleAltar}
        onGo={handleGo}
      />

      <RelicDraftOverlay offer={state.pendingDraft} floor={state.level} lairNext={isLair} onPick={handlePickRelic} />

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
        depth={ascension}
        streak={runResult?.streak}
        unlockedHeroes={runResult?.unlocked}
        achievements={runResult?.achievements}
        embers={runResult?.embers}
        dailyBonus={runResult?.bonus}
        gemsLeft={state.isGameOver ? state.coins : undefined}
        onShare={handleShare}
        floors={GAME_CONFIG.expedition.floors}
        endless={mode === "endless"}
        onForge={() => navigation.navigate("ForgeScreen")}
        onRetry={handleRetry}
        onMainMenu={handleMainMenu}
      />

      <RunLoadingCover visible={bootCover} />

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
  // Controls rest low on their side, where the thumbs naturally fall in landscape.
  controlsWrapper: {
    alignSelf: "stretch",
    justifyContent: "flex-end",
    alignItems: "center",
    paddingBottom: 10,
  },
  toolSlot: { marginBottom: 8, alignSelf: "stretch" },
  relicSlot: { position: "absolute", top: 4, left: 0, right: 0, alignItems: "center" },
});
