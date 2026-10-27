import React, { useState, useEffect, useRef, useCallback, useMemo, Profiler } from "react";
import {
  StyleSheet,
  View,
  StatusBar,
  Animated,
  AppState,
  BackHandler,
  ImageBackground,
  useWindowDimensions,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";
import { useFocusEffect, useIsFocused } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import ScoreBar from "../ui/components/ScoreBar";
import BoardView from "../ui/components/BoardView";
import ScreenFlashes from "../ui/components/game/ScreenFlashes";
import GameOverlays from "./game/GameOverlays";
import RunLoadingCover from "../ui/components/game/RunLoadingCover";
import Controls from "../ui/components/DirectionPad";
import FloatingPad from "../ui/components/FloatingPad";
import AttackPanel from "../ui/components/AttackPanel";
import CoinFlight from "../ui/components/game/CoinFlight";
import DangerVignette from "../ui/components/game/DangerVignette";
import FloorBanner from "../ui/components/game/FloorBanner";
import RelicTray from "../ui/components/RelicTray";
import ToolBar from "../ui/components/ToolBar";
import CoachHint from "../ui/components/game/CoachHint";
import ScorePopup from "../ui/components/game/ScorePopup";
import Toast from "../ui/components/game/Toast";
import { useGameLayout, GAME_ROW_PADDING } from "../ui/layout/useGameLayout";
import { haptic, ImpactFeedbackStyle } from "../shared/haptics";
import { RelicId, relicCount } from "../core/engine/relics";
import { useSettingsStore } from "../state/settings/store";
import { emitSound } from "../audio/audioEventBus";
import { onRenderProfile } from "../audio/renderProfile";
import { useGameEngine } from "../core/engine/useGameEngine";
import { getNearbyHazards } from "../core/engine/proximity";
import { bossHearts, countGuardians } from "../core/engine/entityCounts";
import { killerTile } from "../core/feedback/diffFeedback";
import { shouldShowShop } from "../core/feedback/flow";
import { nextHint } from "../core/feedback/hints";
import type { TranslationKey } from "../i18n/en";
import { forkDoors } from "../core/engine/shop";
import { biomeFor, isNewBiome } from "../core/engine/biomes";
import { isLairFloor } from "../core/engine/lair";
import characters from "../data/characters";
import { characterWithSkin } from "../data/characterSkins";
import { BIOME_ART } from "../ui/biomeArt";
import type { SkinId } from "../data/skinArt";
import { dailyKey, dailySeed } from "../core/engine/seed";
import { clampAscension } from "../core/engine/ascension";
import { analytics } from "../services/analytics";
import { hasFullGame, shouldGateDescentNow } from "../services/entitlements";
import { GAME_CONFIG } from "../config/gameConfig";
import { useSessionClock } from "../hooks/useSessionClock";
import { useProximityAudio } from "../hooks/useProximityAudio";
import { useBoardInput } from "./game/useBoardInput";
import { useGameFeedback } from "./game/useGameFeedback";
import { useRunRecord } from "./game/useRunRecord";
import { useRevive } from "./game/useRevive";
import { useDuel } from "./game/useDuel";
import { duelResultView } from "./game/duelResult";
import DuelChip from "../ui/components/game/DuelChip";
import { formatChallengeCode, rematchCode } from "../core/challenge/code";
import { useArrowRefill } from "./game/useArrowRefill";
import { useT } from "../i18n/useT";
import { BIOME_TINT } from "./game/types";
import { buildShareCard, buildShareMessage } from "./game/shareMessage";
import { useRouteLog } from "./game/useRouteLog";
import { useHeartbeat } from "./game/useHeartbeat";
import * as Clipboard from "expo-clipboard";
import ShareCard from "../ui/components/ShareCard";
import type { ShareCardData } from "../ui/components/ShareCard";
import { shareResult } from "../services/shareResult";
import { rememberChallenge } from "../services/challenges";
import { canSaveState, clearSavedRun, loadSavedRun, restoredState, saveRun } from "../services/savedRun";
import { useEntitlements } from "../state/entitlements/useEntitlements";
import { omenText, relicText } from "../i18n/keys";

type Props = NativeStackScreenProps<RootStackParamList, "GameScreen">;

// ── Main Screen ──────────────────────────────────────────────────────────
export default function GameScreen({ navigation, route }: Props) {
  const { t, plural } = useT();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const { controlPanelWidth, hudHeight, splitAttack } = useGameLayout();
  const controlPosition = useSettingsStore(s => s.controlPosition);
  const reduceFlash = useSettingsStore(s => s.reduceFlash);
  const { modeLocked } = useEntitlements();

  const rawIndex = route.params?.characterIndex ?? 0;
  const characterIndex = Math.min(Math.max(Math.trunc(rawIndex), 0), characters.length - 1);
  const skin = route.params?.skin ?? "classic";
  const selectedCharacter = characterWithSkin(characterIndex, skin);

  const mode = route.params?.mode ?? "expedition";
  const isDaily = mode === "daily";
  const duelParam = route.params?.duel ?? null;
  // A friend challenge plays the cave of its code at the difficulty of its code, without Forge upgrades, and counts for nothing but its board.
  const challenge = route.params?.challenge ?? null;
  const ascension = isDaily ? 0 : clampAscension(challenge ? challenge.depth : route.params?.ascension ?? 0);
  // The daily challenge fixes the board seed to today's local date (captured once per screen visit).
  const dailyDate = useRef(dailyKey()).current;

  const { state, isAttacking, move, attack, reset, restore, levelUp, pickRelic, buy, useAltar: spendAltar, useItem: spendItem, useAbility: castAbility, undo, revive, refill } = useGameEngine();
  // Expeditions and endless runs can be left and continued later; the daily is tied to its date, challenges and duels are live.
  const resumable = !challenge && !duelParam && !isDaily;
  // Between two floors: the shop and the fork, shown once the level-complete card is dismissed.
  const [intermission, setIntermission] = useState(false);
  const [door, setDoor] = useState<0 | 1>(0);
  // Feedback that is only seen: the shield blink, a hard shake, a refused step onto a flag, the gem streak pop.
  const [toast, setToast] = useState<{ text: string; key: number } | null>(null);
  const [paused, setPaused] = useState(false);
  // The free part is over (monetisation on, last free floor cleared, full game declined): the run ends as a demo summary.
  const [demoEnd, setDemoEnd] = useState(false);
  const demoEndRef = useRef(false);
  demoEndRef.current = demoEnd;
  // "level": the level-complete card is up and the paywall follows it; "paywall": the offer is up and its answer decides.
  const gateStage = useRef<null | "level" | "paywall">(null);
  const isFocused = useIsFocused();
  // Red edges that appear the instant the hero dies and fade before the game-over card.
  const deathFlash = useRef(new Animated.Value(0)).current;

  const swipeMove = useSettingsStore(s => s.swipeMove);
  const dragAim = useSettingsStore(s => s.dragAim);
  const movePad = useSettingsStore(s => s.movePad);
  const hintsSeen = useSettingsStore(s => s.hintsSeen);
  const markHintSeen = useSettingsStore(s => s.markHintSeen);
  const [runNumber, setRunNumber] = useState(0);
  // Opaque cover until the first board has really been drawn (or a safety timeout): no black or half-painted board.
  const [bootCover, setBootCover] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setBootCover(false), 2500);
    return () => clearTimeout(timer);
  }, []);
  const handleBoardReady = useCallback(() => setBootCover(false), []);
  const openPause = useCallback(() => setPaused(true), []);
  const runEnded = state.isGameOver || state.isVictory;
  const floorOmen = state.omen;
  const floorBiome = (__DEV__ ? route.params?.devBiome : undefined) ?? biomeFor(state.level, state.mode);
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

  // Latest values for listeners and timers (so effects do not need volatile dependencies).
  const stateRef = useRef(state);
  stateRef.current = state;
  const routeOf = useRouteLog(state);
  // Where the HUD's gem counter sits on screen (measured by the HUD): picked gems fly there.
  const gemAnchor = useRef<{ x: number; y: number } | null>(null);
  const onGemAnchor = useCallback((at: { x: number; y: number }) => {
    gemAnchor.current = at;
  }, []);
  const pausedRef = useRef(false);
  pausedRef.current = paused;
  const onRefusedFlag = useCallback(() => setToast({ text: t("toast.flagged"), key: Date.now() }), [t]);
  const { flags, flagPing, toggleFlag, manualMove, manualAttack, canRepeatMove, fireDragged, setAim, aimDir, aimTiles, shot, travelTo, cancelTravel, stepSoundedAt } = useBoardInput({
    state,
    stateRef,
    pausedRef,
    playing: !paused && !runEnded && !levelUpWindow && !state.pendingDraft,
    runNumber,
    move,
    attack,
    onRefusedFlag,
  });
  const { popups, activeCoins, removeCoin, removePopup, clearPopups, resetStreak, gemPop, shieldBreakKey, shakeKey, combatFlash, vortexFlash, hitFlash, boardBox, measureBoard, isResetting } = useGameFeedback({
    state,
    stateRef,
    stepSoundedAt,
    reduceFlash,
    bootCover,
  });
  // The clock ticks outside React state: only the timer text in the HUD re-renders every second.
  const clock = useSessionClock(!runEnded && !state.isLevelUp && !paused && !state.pendingDraft);
  const resetTimer = useCallback(() => clock.reset(), [clock]);

  const sessionTimeRef = useMemo(() => ({ get current() { return clock.get(); } }), [clock]);
  const onRevived = useCallback(() => setToast({ text: t("revive.toast"), key: Date.now() }), [t]);
  const arrowShop = useArrowRefill({ state, isDaily: isDaily || !!challenge, playing: !paused && !runEnded && !levelUpWindow && !state.pendingDraft, refill });
  const duel = useDuel({ duel: duelParam, stateRef, characterIndex, runEnded, sessionTimeRef });
  // How a live duel stands once this player's run is over: at once when they are beaten for good, provisional while rivals still play.
  const duelResult = duelResultView(duel.standing, duel.rivals, duel.stake, duel.prize, duelParam ? formatChallengeCode(duelParam.code) : "", t);
  const second = useRevive({ state, isDaily: isDaily || !!challenge, runNumber, revive, onRevived, freeFirst: !!route.params?.meta?.freeRevive });
  const { runResult, setRunResult, showGameOver, setShowGameOver, showHighScoreEntry, setShowHighScoreEntry, recordCurrentRun, handleHighScoreSubmit, rearm, runRecorded, mounted } = useRunRecord({
    stateRef,
    runEnded: runEnded && !second.holdEnd,
    characterIndex,
    ascension,
    mode,
    isDaily,
    dailyDate,
    challengeCode: challenge?.code ?? null,
    startRelics: route.params?.meta?.startRelics?.length ?? 0,
    sessionTimeRef,
    deathFlash,
    reduceFlash,
  });

  // While an overlay is open, the HUD, board and pad must not be reachable by screen readers (Android ignores
  // accessibilityViewIsModal).
  const overlayOpen = paused || !!state.pendingDraft || showGameOver || second.visible || showHighScoreEntry || intermission;
  const behindOverlay = {
    importantForAccessibility: overlayOpen ? ("no-hide-descendants" as const) : ("auto" as const),
    accessibilityElementsHidden: overlayOpen,
  };
  const canPause = !runEnded && !state.isLevelUp && !state.pendingDraft && !showGameOver && !showHighScoreEntry;

  const canPauseRef = useRef(false);
  canPauseRef.current = canPause;
  const busyRef = useRef(false);
  busyRef.current = levelUpWindow || !!state.pendingDraft || second.visible; // the second-chance question is answered with its buttons

  // Guards / bookkeeping refs
  const descendOnFocus = useRef(false); //    the next floor opens as soon as the level-complete card closes
  const leaving = useRef(false); //           blocks timers from navigating after we left
  const floorStart = useRef({ enemies: 0, gems: 0 });

  // ── Run bookkeeping ──────────────────────────────────────────────────────
  const startRun = useCallback(() => {
    deathFlash.setValue(0);
    resetStreak();
    setRunNumber(n => n + 1); // replays the floor banner even when a daily restarts on the same seed
    reset(selectedCharacter, {
      heroIndex: characterIndex,
      ascension,
      meta: challenge ? undefined : route.params?.meta,
      ...(challenge ? { runSeed: challenge.seed } : {}),
      ...(isDaily ? { mode: "daily" as const, runSeed: dailySeed(dailyDate) } : {}),
      ...(mode === "endless" ? { mode: "endless" as const } : {}),
    });
  }, [reset, selectedCharacter, characterIndex, ascension, isDaily, dailyDate, challenge, route.params?.meta]);

  /** Writes the run to disk so "Continuar" (or Android killing the process) does not cost it. */
  const saveCurrentRun = useCallback(() => {
    if (!resumable || !canSaveState(stateRef.current)) return false;
    void saveRun({ characterIndex, skin, ascension, meta: route.params?.meta, time: clock.get(), state: stateRef.current });
    return true;
  }, [resumable, characterIndex, skin, ascension, clock, route.params?.meta]);

  /** Leaving mid-floor keeps the run for "Continuar"; otherwise whatever was played is recorded now. */
  const leaveRun = useCallback(() => {
    if (!saveCurrentRun()) void recordCurrentRun();
  }, [saveCurrentRun, recordCurrentRun]);

  // Start (or continue) the run on mount; keep or record it when the screen goes away.
  useEffect(() => {
    mounted.current = true;
    const begin = async () => {
      if (resumable && route.params?.resume) {
        const saved = await loadSavedRun();
        if (saved && mounted.current) {
          deathFlash.setValue(0);
          resetStreak();
          setRunNumber(n => n + 1);
          clock.set(saved.time);
          isResetting.current = true; // the jump from the empty board to the saved one is not progress to celebrate
          restore(restoredState(saved, selectedCharacter));
          setTimeout(() => {
            isResetting.current = false;
          }, 100);
          analytics.track("game_resume", { mode, floor: saved.state.level });
          return;
        }
        if (!mounted.current) return;
      }
      if (resumable) void clearSavedRun(); // a fresh run replaces any stale save
      startRun();
      analytics.track("game_start", { mode, character: characterIndex });
    };
    void begin();
    return () => {
      mounted.current = false;
      leaveRun();
    };
  }, []);

  // The finished run can no longer be continued.
  useEffect(() => {
    if (runEnded && resumable) void clearSavedRun();
  }, [runEnded, resumable]);

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
        if (next !== "active") {
          if (canPauseRef.current) setPaused(true);
          // Android may kill the process while backgrounded: the run must already be on disk.
          saveCurrentRun();
        }
      });

      return () => {
        backSub.remove();
        appSub.remove();
        emitSound("GAME_MUSIC_STOP");
        emitSound("STOP_GUARDIAN_NEAR");
        emitSound("STOP_VORTEX_NEAR");
      };
    }, [saveCurrentRun]),
  );

  // ── Floor bookkeeping (real counts for the level-complete card) ───────────
  useEffect(() => {
    floorStart.current = {
      enemies: countGuardians(state),
      gems: state.coins,
    };
  }, [state.seed]);

  const handleRetry = useCallback(() => {
    void recordCurrentRun(); // an abandoned run still counts for unlocks
    if (resumable) void clearSavedRun(); // a restart throws the old run away for good
    rearm();
    isResetting.current = true;
    emitSound("GAME_MUSIC_START"); // Game Over / victory stopped the loop and the focus did not change
    clearPopups();
    setDemoEnd(false);
    gateStage.current = null;
    resetTimer();
    setPaused(false);
    startRun();
    setTimeout(() => {
      isResetting.current = false;
    }, 100);
  }, [startRun, recordCurrentRun, resetTimer, resumable]);

  const handleMainMenu = useCallback(() => {
    leaving.current = true;
    leaveRun(); // mid-floor the run is kept for "Continuar"; otherwise it is recorded
    setPaused(false);
    clearPopups();
    setShowGameOver(false);
    emitSound("GAME_MUSIC_STOP");
    // Pop back to the existing Cover instead of stacking a second one on top of this screen.
    navigation.popTo("CoverScreen");
  }, [navigation, leaveRun]);

  // Rematch: the next cave at the same difficulty and stake. The code is worked out from this one, so every player lands in the same room.
  const handleRematch = useCallback(() => {
    const next = duelParam ? rematchCode(duelParam.code) : null;
    if (!duelParam || !next) {
      handleMainMenu();
      return;
    }
    leaving.current = true;
    void recordCurrentRun();
    clearPopups();
    emitSound("GAME_MUSIC_STOP");
    void rememberChallenge(next);
    navigation.replace("DuelScreen", { code: next, characterIndex, skin: route.params?.skin, stake: duelParam.stake });
  }, [duelParam, characterIndex, navigation, route.params?.skin]); // eslint-disable-line react-hooks/exhaustive-deps

  /** The game over's "Try now" on a fresh unlock: leave for the screen where it can be used. */
  const handleTryUnlock = useCallback(
    (kind: "hero" | "depth" | "endless" | "skin", detail?: { hero: number; skin: string }) => {
      leaving.current = true;
      void recordCurrentRun();
      setPaused(false);
      clearPopups();
      setShowGameOver(false);
      emitSound("GAME_MUSIC_STOP");
      if (kind === "skin" && detail) {
        navigation.popTo("CollectionScreen", { hero: detail.hero, skin: detail.skin as SkinId });
        return;
      }
      // Endless is part of the paid full game: the card may offer it, but a locked player goes to the paywall, not the mode.
      if (kind === "endless" && modeLocked("endless")) {
        navigation.popTo("PaywallScreen", { source: "endless" });
        return;
      }
      navigation.popTo("CharactersScreen", { mode: kind === "endless" ? "endless" : "expedition" });
    },
    [navigation, recordCurrentRun, modeLocked],
  );

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

  // The picture that is shared is drawn off-screen only while it is being captured.
  const [shareCard, setShareCard] = useState<ShareCardData | null>(null);
  const shareCardRef = useRef<React.ComponentRef<typeof View>>(null);
  const sharing = useRef(false);
  const handleShare = useCallback(async () => {
    if (sharing.current) return; // a second tap while the picture is being made
    sharing.current = true;
    try {
      const s = stateRef.current;
      const run = { level: s.level, score: s.score, totalCoins: s.totalCoins, isVictory: s.isVictory, time: sessionTimeRef.current };
      const opts = { isDaily, dailyDate, ascension, streak: runResult?.streak, endless: mode === "endless", heroName: selectedCharacter.playerName, challengeCode: challenge?.code, route: isDaily ? routeOf() : undefined };
      const message = buildShareMessage(run, opts, { t, plural });
      analytics.track(isDaily ? "daily_shared" : "run_shared", { score: s.score });
      setShareCard(buildShareCard(run, opts, { t, plural }, selectedCharacter));
      await new Promise<void>(resolve => setTimeout(resolve, 280)); // the card lays out and its pictures draw
      await shareResult(shareCardRef, message, t("share.dialog"));
    } finally {
      setShareCard(null);
      sharing.current = false;
    }
  }, [dailyDate, runResult, t, plural, isDaily, ascension, mode, challenge, selectedCharacter, sessionTimeRef, routeOf]);

  // The daily as plain text (its route in squares), ready to paste in a chat; the picture keeps its own button.
  const handleCopyText = useCallback(async () => {
    const s = stateRef.current;
    const run = { level: s.level, score: s.score, totalCoins: s.totalCoins, isVictory: s.isVictory, time: sessionTimeRef.current };
    const opts = { isDaily: true, dailyDate, ascension, streak: runResult?.streak, heroName: selectedCharacter.playerName, route: routeOf() };
    try {
      await Clipboard.setStringAsync(buildShareMessage(run, opts, { t, plural }));
      analytics.track("daily_shared", { score: s.score });
      return true;
    } catch (e) {
      console.warn("[share] the text could not be copied:", e);
      return false;
    }
  }, [dailyDate, runResult, t, plural, ascension, selectedCharacter, sessionTimeRef, routeOf]);

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
        skin,
        score: now.score,
        level: now.level,
        coins: floorStart.current.gems - now.coins,
        totalCoins: floorStart.current.gems,
        kills: Math.max(0, floorStart.current.enemies - enemiesLeft),
        totalEnemies: floorStart.current.enemies,
        time: sessionTimeRef.current,
      });
      setDoor(0);
      if (shouldGateDescentNow(now.level, mode)) gateStage.current = "level";
      else if (shouldShowShop(now.level + 1, now)) setIntermission(true);
      else descendOnFocus.current = true; // the first floors go straight to the relic draft
    }, 800);

    return () => clearTimeout(timer);
  }, [levelUpWindow]);

  // Back from the level-complete card or the paywall: carry on, or close the free part of the run.
  useEffect(() => {
    if (!isFocused || !gateStage.current || leaving.current || !mounted.current) return;
    const s = stateRef.current;
    if (gateStage.current === "level") {
      gateStage.current = "paywall";
      navigation.navigate("PaywallScreen", { source: "floor", floor: s.level });
      return;
    }
    gateStage.current = null;
    if (hasFullGame()) {
      // Bought (also from the demo card): the run was saved as a demo, so it is saved again when it really ends.
      runRecorded.current = false;
      setRunResult(null);
      setShowGameOver(false);
      setDemoEnd(false);
      setDoor(0);
      setIntermission(true);
    } else if (!demoEndRef.current) {
      setDemoEnd(true);
      setShowGameOver(true);
      void recordCurrentRun()
        .then(result => {
          if (mounted.current && result) setRunResult(result);
        })
        .catch(() => {});
    }
  }, [isFocused]);

  // First floors skip the shop and the fork: the next floor opens when the level-complete card closes.
  useEffect(() => {
    if (!isFocused || !descendOnFocus.current || leaving.current || !mounted.current) return;
    descendOnFocus.current = false;
    const s = stateRef.current;
    if (!s.isLevelUp || s.isVictory) return;
    levelUp(undefined);
  }, [isFocused]);

  const handleUnlock = useCallback(() => {
    gateStage.current = "paywall";
    navigation.navigate("PaywallScreen", { source: "demo", floor: stateRef.current.level });
  }, [navigation]);

  const handleGo = useCallback(() => {
    const s = stateRef.current;
    if (!s.isLevelUp || s.isVictory || leaving.current) return;
    const options = forkDoors(s.runSeed, s.level + 1, s.mode);
    setIntermission(false);
    // Without a fork (daily, lair) the seeded omen applies.
    levelUp(options ? options[door] : undefined);
  }, [levelUp, door]);

  const handleBuy = useCallback((item: Parameters<typeof buy>[0]) => { emitSound("POWERUP"); buy(item); }, [buy]);
  const handleAltar = useCallback(() => { emitSound("RELIC_PICKED"); spendAltar(); }, [spendAltar]);
  const handleAbility = useCallback(() => { cancelTravel(); emitSound("POWERUP"); castAbility(); }, [cancelTravel, castAbility]);
  const handleItem = useCallback((item: "detector" | "bomb") => { cancelTravel(); emitSound("POWERUP"); spendItem(item); }, [cancelTravel, spendItem]);
  const handleDetector = useCallback(() => handleItem("detector"), [handleItem]);
  const handleBomb = useCallback(() => handleItem("bomb"), [handleItem]);
  const handleUndo = useCallback(() => { cancelTravel(); emitSound("MOVE"); undo(); }, [cancelTravel, undo]);

  useProximityAudio(state);

  // The Grimbur lair announces itself: a roar, a heavy thump in the hand and a dark red veil that lifts.
  const lairVeil = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (isLairFloor(state.mode, state.level) && state.turn === 0) {
      emitSound("BOSS_ROAR");
      haptic.impact(ImpactFeedbackStyle.Heavy);
      if (!reduceFlash) {
        lairVeil.setValue(0);
        Animated.sequence([
          Animated.timing(lairVeil, { toValue: 0.55, duration: 320, useNativeDriver: true }),
          Animated.timing(lairVeil, { toValue: 0, duration: 950, useNativeDriver: true }),
        ]).start();
      }
    }
  }, [state.level]);

  const nearby = getNearbyHazards(state.playerIndex, state.rows, state.cols, state.entityMap);
  // Next to a hazard the screen's glow and the clues on the board beat with one heart (still when calm).
  const inDanger = (nearby.enemy || nearby.pit) && !runEnded && !levelUpWindow;
  const heartbeat = useHeartbeat(inDanger && !reduceFlash, Math.max(nearby.enemyCount, nearby.pitCount));
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

  // One-time tips: the tools the first time each one is available, the controls and the clues once the player has
  // explored a bit (never over an overlay, and never the same tip twice).
  const cluesShown = useMemo(() => {
    for (const i of state.visited) {
      if (state.entityMap[i] !== undefined) continue;
      const near = getNearbyHazards(i, state.rows, state.cols, state.entityMap);
      if (near.enemy || near.pit) return true;
    }
    return false;
  }, [state.visited, state.entityMap, state.rows, state.cols]);
  const hint: { id: string; text: string } | null = (() => {
    if (runEnded || levelUpWindow || overlayOpen || bootCover) return null;
    const id = nextHint(
      {
        turn: state.turn,
        ability: state.perks.ability ?? null,
        canUndo: !!state.undo && !state.undoUsed,
        detector: state.items.detector,
        bomb: state.items.bomb,
        cluesShown,
        explored: state.visited.length,
        arrows: state.attack,
      },
      hintsSeen,
    );
    if (!id) return null;
    if (id === "ability" && state.perks.ability) {
      return { id, text: t("hint.ability", { name: t(`ability.${state.perks.ability}.name` as TranslationKey), desc: t(`ability.${state.perks.ability}.desc` as TranslationKey) }) };
    }
    return { id, text: t(`hint.${id}` as TranslationKey) };
  })();


  // The run starts in an effect, so the very first render still holds the engine's empty placeholder board.
  // Showing it would flash a wrong board for a moment: wait until the real run exists.
  if (state.selectedCharacter === null) return <RunLoadingCover visible />;

  return (
    <Profiler id="screen" onRender={onRenderProfile}>
    <ImageBackground
      fadeDuration={0}
      resizeMethod="none"
      source={BIOME_ART[floorBiome].background}
      style={styles.container}
      resizeMode="cover"
    >
      {/* Dark overlay for gameplay clarity */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: BIOME_TINT[floorBiome] }]} />

      <StatusBar hidden />

      <View style={{ paddingTop: insets.top, zIndex: 10 }} {...behindOverlay}>
        <Profiler id="hud" onRender={onRenderProfile}>
        <ScoreBar
          score={state.score}
          // Gems still flying are not counted off yet: the counter ticks as each one lands.
          coins={state.coins + activeCoins.length}
          attackValue={state.attack}
          shield={state.shield}
          onPause={canPause ? openPause : undefined}
          level={state.level}
          floors={mode === "endless" ? undefined : GAME_CONFIG.expedition.floors}
          character={selectedCharacter}
          clock={clock}
          combo={state.enemyCombo}
          comboMax={GAME_CONFIG.multipliers.maxCombo + relicCount(state.relics, "hunter")}
          shieldBreakKey={shieldBreakKey}
          gemPop={gemPop}
          calm={reduceFlash}
          bossHearts={isLair ? bossHearts(state) : undefined}
          onGemAnchor={onGemAnchor}
        />
        </Profiler>
      </View>


      <DangerVignette
        roar={nearby.enemy && !runEnded && !levelUpWindow}
        vortex={nearby.pit && !runEnded && !levelUpWindow}
        intensity={Math.max(nearby.enemyCount, nearby.pitCount)}
        calm={reduceFlash}
        beat={heartbeat}
      />
      {!runEnded && !levelUpWindow && !state.pendingDraft && !bootCover && (
        <FloorBanner
          floorKey={`${runNumber}-${state.runSeed}-${state.level}`}
          title={isLair ? t("floor.banner.lair") : t("floor.banner", { n: state.level })}
          omenName={isLair ? t("boss.goalTitle") : floorOmen ? omenText(t, floorOmen, "name") : biomeAnnounce ? t(`biome.${floorBiome}.name` as TranslationKey) : undefined}
          omenRule={isLair ? t("boss.goalRule", { hearts: bossHearts(state) }) : floorOmen ? omenText(t, floorOmen, "rule") : biomeAnnounce ? t(`biome.${floorBiome}.rule` as TranslationKey) : undefined}
          story={isLair ? t("story.lair") : biomeAnnounce ? t(`story.biome.${floorBiome}` as TranslationKey) : undefined}
          long={isLair}
          dismiss={state.turn > 0}
          minTop={insets.top + hudHeight + 6}
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
        <AttackPanel onAttack={manualAttack} onAim={setAim} arrows={state.attack} refill={{ show: arrowShop.show, price: arrowShop.price, arrows: arrowShop.arrows, busy: arrowShop.busy, onBuy: () => void arrowShop.buy() }} relics={state.relics} relicsLabel={t("a11y.relics", { names: relicNames })} />

        <View ref={boardBox} onLayout={measureBoard} accessible accessibilityRole="summary" accessibilityLabel={boardSummary}>
          <Profiler id="board" onRender={onRenderProfile}>
          <BoardView
            level={state.level}
            rows={state.rows}
            cols={state.cols}
            entityMap={state.entityMap}
            playerIndex={state.playerIndex}
            visited={state.visited}
            facingDir={state.facingDir}
            characterIndex={characterIndex}
            skin={skin}
            biome={floorBiome}
            isAttacking={isAttacking}
            guardianCount={countGuardians(state)}
            onTilePress={travelTo}
            flags={flags}
            aimTiles={aimTiles}
            aimDir={state.attack > 0 ? aimDir : null}
            shot={shot}
            dying={state.isGameOver && !state.isVictory}
            onTileLongPress={toggleFlag}
            onReady={handleBoardReady}
            onSwipe={swipeMove ? manualMove : undefined}
            // With "swipe to move" on, a swipe that starts on the hero must move it, so drag-to-shoot gives way.
            onAimDrag={dragAim && !swipeMove ? setAim : undefined}
            onAimFire={dragAim && !swipeMove ? fireDragged : undefined}
            killerTile={state.isGameOver && !state.isVictory ? killerTile(state) : null}
            shakeKey={shakeKey}
            flagPing={flagPing}
            calm={reduceFlash}
            beat={inDanger ? heartbeat : undefined}
          />
          </Profiler>
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
              onDetector={handleDetector}
              onBomb={handleBomb}
              onUndo={handleUndo}
              size={Math.max(34, Math.min(46, (controlPanelWidth + 12 - 18) / 4))}
            />
          </View>
          {movePad === "floating" ? (
            <FloatingPad onMove={manualMove} canRepeat={canRepeatMove} onAttack={manualAttack} onAim={setAim} arrows={state.attack} />
          ) : (
            <Controls onMove={manualMove} onAttack={manualAttack} onAim={setAim} arrows={state.attack} />
          )}
        </View>
      </View>

      {popups.map(p => (
        <ScorePopup
          key={p.id}
          points={p.points}
          type={p.type}
          x={p.x}
          y={p.y}
          slot={p.slot}
          sub={p.sub}
          subColor={p.subColor}
          popScale={p.popScale}
          onComplete={() => removePopup(p.id)}
        />
      ))}

      {activeCoins.map(c => (
        <CoinFlight
          key={c.id}
          startX={c.x}
          startY={c.y}
          targetX={gemAnchor.current ? gemAnchor.current.x - 16 : windowWidth - insets.right - controlPanelWidth * 0.5}
          targetY={gemAnchor.current ? gemAnchor.current.y - 16 : insets.top + hudHeight * 0.5}
          onComplete={() => removeCoin(c.id)}
        />
      ))}

      <ScreenFlashes combat={combatFlash} death={deathFlash} hit={hitFlash} vortex={vortexFlash} calm={reduceFlash} />

      {/* The lair's dark red veil (see the roar effect above). */}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: "#2B0008", opacity: lairVeil, zIndex: 30 }]} />

      {toast && (
        <Toast text={toast.text} toastKey={toast.key} top={insets.top + hudHeight + 8} onDone={() => setToast(null)} />
      )}

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

      <DuelChip duel={duel} level={state.level} score={state.score} top={insets.top + hudHeight - 14} />

      {shareCard ? (
        <View ref={shareCardRef} collapsable={false} pointerEvents="none" style={{ position: "absolute", left: -4000, top: 0 }}>
          <ShareCard {...shareCard} />
        </View>
      ) : null}

      <GameOverlays
        state={state}
        character={selectedCharacter}
        time={clock.get()}
        bootCover={bootCover}
        shop={{ visible: intermission, doors, chosen: door, onChoose: setDoor, onBuy: handleBuy, onAltar: handleAltar, onGo: handleGo }}
        onPickRelic={handlePickRelic}
        pause={{ visible: paused, saveOnExit: resumable, canRestart: !duelParam, onResume: () => setPaused(false), onRestart: handleRetry, onMainMenu: handleMainMenu }}
        gameOver={{
          visible: showGameOver,
          result: runResult,
          isDaily,
          dailyDate,
          challengeLabel: challenge ? formatChallengeCode(challenge.code) : null,
          duelResult,
          ascension,
          endless: mode === "endless",
          demo: demoEnd,
          onTryUnlock: handleTryUnlock,
          onShare: handleShare,
          onCopyText: isDaily ? handleCopyText : undefined,
          onUnlock: handleUnlock,
          onForge: () => navigation.navigate("ForgeScreen"),
          onRetry: duelParam ? handleRematch : handleRetry,
          retryLabel: duelParam ? t("duel.rematch") : undefined,
          onMainMenu: handleMainMenu,
        }}
        revive={{ visible: second.visible, price: second.price, embers: second.embers, used: second.used, busy: second.busy, onRevive: () => void second.accept(), onDecline: second.decline }}
        highScore={{ visible: showHighScoreEntry, daily: isDaily, challenge: !!challenge, onSubmit: handleHighScoreSubmit, onSkip: () => setShowHighScoreEntry(false) }}
      />
    </ImageBackground>
    </Profiler>
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
  // Four tools in a narrow panel just fit one row when the row may spill 6dp past each side.
  toolSlot: { marginBottom: 8, alignSelf: "stretch", marginHorizontal: -6 },
  relicSlot: { position: "absolute", top: 4, left: 0, right: 0, alignItems: "center" },
});
