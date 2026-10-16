import React, { useState, useEffect, useRef, useCallback, useMemo, Profiler } from "react";
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
import { useFocusEffect, useIsFocused } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import ScoreBar from "../ui/components/ScoreBar";
import BoardView, { type ArrowShot } from "../ui/components/BoardView";
import { LinearGradient } from "expo-linear-gradient";
import Controls from "../ui/components/DirectionPad";
import FloatingPad from "../ui/components/FloatingPad";
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
import Toast from "../ui/components/game/Toast";
import { useGameLayout, GAME_ROW_PADDING } from "../ui/layout/useGameLayout";
import { RelicId, relicCount } from "../core/engine/relics";
import { useSettingsStore } from "../state/settings/store";
import { emitSound } from "../audio/audioEventBus";
import { recordLatency } from "../audio/audioDiagnostics";
import { onRenderProfile } from "../audio/renderProfile";
import { useGameEngine } from "../core/engine/useGameEngine";
import { getNearbyHazards } from "../core/engine/proximity";
import { bossHearts, countGuardians } from "../core/engine/entityCounts";
import { diffFeedback, killerTile } from "../core/feedback/diffFeedback";
import { addGem, comboLook, comboRate, EMPTY_STREAK, gemPopScale, gemRate, gemStreakLabel } from "../core/feedback/combo";
import { tileCenter } from "../core/feedback/geometry";
import { shouldShowShop } from "../core/feedback/flow";
import { nextHint } from "../core/feedback/hints";
import { lineOfFire, stepTarget } from "../core/engine/travel";
import { altarIsFree, arrowPath, arrowReachOf } from "../core/engine/reducer";
import { canRepeatStep } from "../core/input/floatingPad";
import type { Direction } from "../core/engine/types";
import { haptic, ImpactFeedbackStyle, NotificationFeedbackType } from "../shared/haptics";
import { coinReward, killValue } from "../core/engine/scoring";
import type { TranslationKey } from "../i18n/en";
import { omenEffects } from "../core/engine/omens";
import { forkDoors } from "../core/engine/shop";
import { biomeFor, isNewBiome } from "../core/engine/biomes";
import { isLairFloor } from "../core/engine/lair";
import characters from "../data/characters";
import { characterWithSkin } from "../data/characterSkins";
import { BIOME_ART } from "../ui/biomeArt";
import type { SkinId } from "../data/skinArt";
import { addHighscore, isTopTenScore } from "../services/highscores";
import { recordRun, recordDailyRun } from "../services/localStats";
import { dailyKey, dailySeed } from "../core/engine/seed";
import { buildDailyShareText } from "../core/stats/share";
import type { RunPayout } from "../core/stats/runStats";
import type { Goal } from "../core/stats/goals";
import type { Unlocks } from "../core/stats/unlocks";
import { clampAscension } from "../core/engine/ascension";
import { analytics } from "../services/analytics";
import { hasFullGame, shouldGateDescentNow } from "../services/entitlements";
import { GAME_CONFIG } from "../config/gameConfig";
import { useSessionClock } from "../hooks/useSessionClock";
import { useProximityAudio } from "../hooks/useProximityAudio";
import { useTravel } from "../hooks/useTravel";
import { useT } from "../i18n/useT";
import { omenText, relicText } from "../i18n/keys";

type Props = NativeStackScreenProps<RootStackParamList, "GameScreen">;

/** The dark wash over the cave picture: each cave type leans toward its own colour. */
// Each cave type has its own picture now (see ui/biomeArt.ts); the dark layer over it only keeps the board readable.
const BIOME_TINT: Record<ReturnType<typeof biomeFor>, string> = {
  cave: "rgba(0,0,0,0.55)",
  crystal: "rgba(0,0,0,0.5)",
  magma: "rgba(0,0,0,0.5)",
  lair: "rgba(0,0,0,0.5)",
};

/** How long the top-10 check may delay the entry modal; the Game Over card never waits for it. */
/** How long the board is left on screen after a death (the red flash, the shake and the killer in view) before the card. */
// The killer is shown on the board (it leaps over the hero) before the defeat card covers it.
const GAME_OVER_CARD_DELAY_MS = 1100;
/** The run is saved this long after a death, once the killer's strike on the board has played. */
const RECORD_AFTER_STRIKE_MS = 650;
const TOP_TEN_CHECK_TIMEOUT_MS = 1500;

/** A floating label: where it rises from, and how it looks. */
type Popup = {
  id: number;
  points: number;
  type: PopupType;
  /** Screen position of the tile it rises from (undefined until the board has been measured). */
  x?: number;
  y?: number;
  slot: number;
  at: number;
  sub?: string | null;
  subColor?: string;
  popScale?: number;
};

type RunResult = {
  bestScore: number;
  isNewBest: boolean;
  streak?: number;
  unlocked?: number[];
  achievements?: string[];
  embers?: number;
  bonus?: number;
  payout?: RunPayout;
  streakLost?: number;
  bestStreak?: number;
  freezeUsed?: boolean;
  freezeEarned?: boolean;
  unlocks?: Unlocks;
  goals?: Goal[];
  canBuyNow?: boolean;
  /** Missions this run completed, and the new rank when it was raised. */
  missionsDone?: string[];
  rankUp?: number | null;
  /** One of the first runs: the game over explains gems versus embers. */
  early?: boolean;
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
  const skin = route.params?.skin ?? "classic";
  const selectedCharacter = characterWithSkin(characterIndex, skin);

  const mode = route.params?.mode ?? "expedition";
  const isDaily = mode === "daily";
  const ascension = isDaily ? 0 : clampAscension(route.params?.ascension ?? 0);
  // The daily challenge fixes the board seed to today's local date (captured once per screen visit).
  const dailyDate = useRef(dailyKey()).current;

  const { state, isAttacking, move, attack, reset, levelUp, pickRelic, buy, useAltar: spendAltar, useItem: spendItem, useAbility: castAbility, undo } = useGameEngine();
  // Between two floors: the shop and the fork, shown once the level-complete card is dismissed.
  const [intermission, setIntermission] = useState(false);
  const [door, setDoor] = useState<0 | 1>(0);
  const [activeCoins, setActiveCoins] = useState<{ id: number; x: number; y: number }[]>([]);
  const [popups, setPopups] = useState<Popup[]>([]);
  // Feedback that is only seen: the shield blink, a hard shake, a refused step onto a flag, the gem streak pop.
  const [shieldBreakKey, setShieldBreakKey] = useState(0);
  const [shakeKey, setShakeKey] = useState(0);
  const [flagPing, setFlagPing] = useState<{ index: number; n: number } | null>(null);
  const [toast, setToast] = useState<{ text: string; key: number } | null>(null);
  const [gemPop, setGemPop] = useState(1.15);
  const gemStreak = useRef(EMPTY_STREAK);
  const [runResult, setRunResult] = useState<RunResult | null>(null);
  const [showGameOver, setShowGameOver] = useState(false);
  const [showHighScoreEntry, setShowHighScoreEntry] = useState(false);
  const [paused, setPaused] = useState(false);
  // The free part is over (monetisation on, last free floor cleared, full game declined): the run ends as a demo summary.
  const [demoEnd, setDemoEnd] = useState(false);
  const demoEndRef = useRef(false);
  demoEndRef.current = demoEnd;
  // "level": the level-complete card is up and the paywall follows it; "paywall": the offer is up and its answer decides.
  const gateStage = useRef<null | "level" | "paywall">(null);
  const isFocused = useIsFocused();
  const combatFlash = useRef(new Animated.Value(0)).current;
  const vortexFlash = useRef(new Animated.Value(0)).current;
  // Red wash that appears the instant the hero dies and stays under the game-over card.
  const deathFlash = useRef(new Animated.Value(0)).current;
  // Short red wash when a shield (or feather) soaks a deadly touch.
  const hitFlash = useRef(new Animated.Value(0)).current;

  const swipeMove = useSettingsStore(s => s.swipeMove);
  const dragAim = useSettingsStore(s => s.dragAim);
  const movePad = useSettingsStore(s => s.movePad);
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

  /** When the step sound of the last tap was already played at input time, so the state effect does not repeat it. */
  const stepSoundedAt = useRef(0);
  const manualMove = useCallback(
    (d: Parameters<typeof move>[0]) => {
      if (pausedRef.current) return; // a stick still held under the pause card must not walk the hero
      cancelTravel();
      const s = stateRef.current;
      const target = stepTarget(s.playerIndex, d, s.rows, s.cols);
      if (flags.has(target)) {
        haptic.notify(NotificationFeedbackType.Warning); // marked as dangerous: refuse the step
        setFlagPing({ index: target, n: Date.now() });
        setToast({ text: t("toast.flagged"), key: Date.now() });
        return;
      }
      // A plain step (an empty tile) sounds the moment the finger lands, not after the board has re-rendered: on a slow
      // phone that render is what players feel as a delay. Tiles with something on them keep their own sounds.
      if (target !== -1 && !s.entityMap[target] && !s.isGameOver && !s.isLevelUp && !s.pendingDraft && !paused && !runEnded && !levelUpWindow) {
        stepSoundedAt.current = Date.now();
        emitSound("MOVE");
      }
      move(d);
    },
    [cancelTravel, move, flags, t, paused, runEnded, levelUpWindow],
  );
  // The arrow in flight: where it goes is worked out from the board as it is when the shot is taken.
  const [shot, setShot] = useState<ArrowShot | null>(null);
  const shotCount = useRef(0);
  const manualAttack = useCallback(
    (direction?: Direction) => {
      if (pausedRef.current) return;
      cancelTravel();
      const s = stateRef.current;
      if (s.attack > 0 && !s.isGameOver && !s.isLevelUp && !s.pendingDraft) {
        const dir = direction ?? s.facingDir;
        const { tiles, targetIndex } = arrowPath(s, dir);
        if (tiles.length > 0) setShot({ key: ++shotCount.current, dir, tiles: tiles.length, hit: targetIndex !== -1 });
      }
      attack(direction);
    },
    [cancelTravel, attack],
  );
  // While the attack button is held, the board shows where the arrow would go (its full reach: what lies ahead stays hidden).
  const [aim, setAim] = useState<Direction | "facing" | null>(null);
  const aimDir: Direction | null = aim === "facing" ? state.facingDir : aim;
  const reach = arrowReachOf(state);
  const aimTiles = useMemo(
    () => (aimDir ? new Set(lineOfFire(state.playerIndex, aimDir, reach, state.rows, state.cols)) : undefined),
    [aimDir, state.playerIndex, state.rows, state.cols, reach],
  );
  // The floating pad keeps walking while it is held, but only over explored, empty ground (never blindly).
  const flagsRef = useRef(flags);
  flagsRef.current = flags;
  const canRepeatMove = useCallback((direction: Direction) => !pausedRef.current && canRepeatStep(stateRef.current, direction, flagsRef.current), []);
  // Drag from the hero: letting go on a side shoots that way (without arrows it is refused, like the button).
  const fireDragged = useCallback(
    (direction: Direction) => {
      if (stateRef.current.attack <= 0) {
        haptic.notify(NotificationFeedbackType.Warning);
        return;
      }
      manualAttack(direction);
    },
    [manualAttack],
  );
  const canPause = !runEnded && !state.isLevelUp && !state.pendingDraft && !showGameOver && !showHighScoreEntry;

  // The clock ticks outside React state: only the timer text in the HUD re-renders every second.
  const clock = useSessionClock(!runEnded && !state.isLevelUp && !paused && !state.pendingDraft);
  const resetTimer = useCallback(() => clock.reset(), [clock]);

  // Latest values for listeners and timers (so effects do not need volatile dependencies).
  const stateRef = useRef(state);
  stateRef.current = state;
  const sessionTimeRef = useMemo(() => ({ get current() { return clock.get(); } }), [clock]);
  const pausedRef = useRef(false);
  pausedRef.current = paused;
  const canPauseRef = useRef(false);
  canPauseRef.current = canPause;
  const busyRef = useRef(false);
  busyRef.current = levelUpWindow || !!state.pendingDraft;

  // Guards / bookkeeping refs
  const prevFeedback = useRef(state);
  const boardOrigin = useRef<{ x: number; y: number } | null>(null);
  const boardBox = useRef<View>(null);
  const descendOnFocus = useRef(false); //    the next floor opens as soon as the level-complete card closes
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
    gemStreak.current = EMPTY_STREAK;
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
    // One step and quit is not a game: it would pay embers and tick the "runs played" goals for nothing.
    const progressed = s.isGameOver || s.isVictory || s.level > 1 || s.turn >= 12;
    if (!progressed) return null;
    runRecorded.current = true;

    const run = {
      score: s.score,
      level: s.level,
      victory: s.isVictory,
      gems: s.totalCoins,
      // Only the relics picked in this run: the ones a Forge upgrade starts with would make relic goals free
      relics: Math.max(0, s.relics.length - (route.params?.meta?.startRelics?.length ?? 0)),
      time: sessionTimeRef.current,
      heroIndex: characterIndex,
      ascension,
      mode,
    };
    try {
      if (isDaily) {
        const r = await recordDailyRun(run, dailyDate);
        return { bestScore: r.dailyBest, isNewBest: r.isNewDailyBest, streak: r.streak, unlocked: r.unlocked, achievements: r.achievements, embers: r.embers, bonus: r.bonus, payout: r.payout, streakLost: r.streakLost, bestStreak: r.bestStreak, freezeUsed: r.freezeUsed, freezeEarned: r.freezeEarned, unlocks: { ...r.unlocks, skins: r.newSkins }, goals: r.goals, canBuyNow: r.affordableNow.length > 0, missionsDone: r.missionsDone, rankUp: r.rankUp, early: r.stats.gamesPlayed <= 2 };
      }
      const r = await recordRun(run);
      // The endless descent keeps its own record, measured in floors.
      return { bestScore: mode === "endless" ? r.stats.bestEndlessFloor : r.stats.bestScore, isNewBest: r.isNewBestScore, unlocked: r.unlocked, achievements: r.achievements, embers: r.embers, bonus: r.bonus, payout: r.payout, unlocks: { ...r.unlocks, skins: r.newSkins }, goals: r.goals, canBuyNow: r.affordableNow.length > 0, missionsDone: r.missionsDone, rankUp: r.rankUp, early: r.stats.gamesPlayed <= 2 };
    } catch (e) {
      console.warn("[GameScreen] recording the run failed:", e);
      runRecorded.current = false; // nothing was saved: the retry, the unmount or the card may try again
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
      // A short, light flash that is gone before the card: the red wash used to stay on screen at 28% and cover the very
      // thing the player needs to see (what killed them).
      Animated.sequence([
        Animated.timing(deathFlash, { toValue: reduceFlash ? 0.08 : 0.34, duration: 70, useNativeDriver: true }),
        Animated.timing(deathFlash, { toValue: 0, duration: 520, useNativeDriver: true }),
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
    // Saving the run (reading and writing the stats, achievements, unlocks) is real work for the JS thread. Doing it in the
    // very frame the hero steps onto the killer made the death animation stutter, so it starts right after the strike has
    // played and still finishes well before the card appears. (Leaving the screen records the run on its own.)
    let recordTimer: ReturnType<typeof setTimeout> | undefined;
    const resultPromise = new Promise<RunResult | null>(resolve => {
      recordTimer = setTimeout(() => resolve(recordCurrentRun()), s.isVictory ? 0 : RECORD_AFTER_STRIKE_MS);
    });

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
      clearTimeout(recordTimer);
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
    setDemoEnd(false);
    gateStage.current = null;
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

  /** The game over's "Try now" on a fresh unlock: leave for the screen where it can be used. */
  const handleTryUnlock = useCallback(
    (kind: "hero" | "depth" | "endless" | "skin", detail?: { hero: number; skin: string }) => {
      leaving.current = true;
      void recordCurrentRun();
      setPaused(false);
      setPopups([]);
      setShowGameOver(false);
      emitSound("GAME_MUSIC_STOP");
      if (kind === "skin" && detail) {
        navigation.popTo("CollectionScreen", { hero: detail.hero, skin: detail.skin as SkinId });
        return;
      }
      navigation.popTo("CharactersScreen", { mode: kind === "endless" ? "endless" : "expedition" });
    },
    [navigation, recordCurrentRun],
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

  const handleShare = useCallback(async () => {
    const s = stateRef.current;
    const streak = runResult?.streak ? plural("over.streak", runResult.streak) : "";
    const message = isDaily
      ? buildDailyShareText({
          dateKey: dailyDate,
          level: s.level,
          floors: GAME_CONFIG.expedition.floors,
          victory: s.isVictory,
          title: n => t("share.daily.title", { n }),
          scoreText: t("share.daily.score", { score: s.score.toLocaleString() }),
          streakText: streak,
          footer: t("share.daily.footer"),
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
    justLeveledUp.current = true;
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
    justLeveledUp.current = true;
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

  // ── Gameplay feedback ────────────────────────────────────────────────────
  // Everything the player sees, hears or feels after a move is derived from the DIFFERENCE between two states
  // (see core/feedback/diffFeedback.ts), so each event fires exactly once and buying, the detector or undo never
  // replay an old pickup.
  const measureBoard = useCallback(() => {
    boardBox.current?.measureInWindow((x, y, w) => {
      if (w > 0) boardOrigin.current = { x: x + 1, y: y + 1 };
    });
  }, []);
  const { tileSize: boardTile } = useGameLayout(state.cols, state.rows);
  useEffect(() => {
    measureBoard();
    const timer = setTimeout(measureBoard, 400); // the layout settles after the first frames
    return () => clearTimeout(timer);
  }, [state.level, state.rows, state.cols, windowWidth, windowHeight, boardTile, bootCover]);

  /** Screen position of a tile (undefined until the board has been measured). */
  const anchorOf = (tile: number): { x?: number; y?: number } => {
    const origin = boardOrigin.current;
    if (!origin) return {};
    return tileCenter(tile, { originX: origin.x, originY: origin.y, tileSize: boardTile, cols: stateRef.current.cols });
  };

  const pushPopup = (popup: Omit<Popup, "id" | "slot" | "at">, tile: number) => {
    const now = Date.now();
    setPopups(prev => {
      const slot = Math.min(3, prev.filter(p => now - p.at < 700).length);
      return [...prev, { ...popup, ...anchorOf(tile), id: now + Math.random(), slot, at: now }];
    });
  };

  const flash = (value: Animated.Value, peak: number, calmPeak: number, up: number, down: number) => {
    Animated.sequence([
      Animated.timing(value, { toValue: reduceFlash ? calmPeak : peak, duration: reduceFlash ? Math.max(up, 120) : up, useNativeDriver: true }),
      Animated.timing(value, { toValue: 0, duration: reduceFlash ? Math.max(down, 160) : down, useNativeDriver: true }),
    ]).start();
  };

  useEffect(() => {
    const prev = prevFeedback.current;
    prevFeedback.current = state;
    if (prev === state || isResetting.current) return;

    const sameFloor = prev.seed === state.seed && prev.runSeed === state.runSeed && prev.level === state.level;
    const events = diffFeedback(prev, state);
    const has = (kind: (typeof events)[number]["kind"]) => events.some(e => e.kind === kind);

    // A plain step (not a gem, not a floor change, not an undo, which makes its own sound).
    if (sameFloor && state.turn > prev.turn && state.playerIndex !== prev.playerIndex && !state.isGameOver && !state.isLevelUp && !has("coin")) {
      // Already sounded at input time (see manualMove) for a tap; travelled and other steps sound here.
      const sinceTap = Date.now() - stepSoundedAt.current;
      if (sinceTap > 400) emitSound("MOVE");
      // How long the board took to react to the tap: JS is busy for that long right after every step (it is what delays
      // the native "playing" notification of the step sound in the audio log, not the sound itself).
      else recordLatency("step>render", sinceTap);
    }
    justLeveledUp.current = false;

    // The gem streak ends as soon as the player pauses (see addGem) or any non-gem move happens after the window.
    for (const e of events) {
      switch (e.kind) {
        case "coin": {
          gemStreak.current = addGem(gemStreak.current, Date.now());
          const streak = gemStreak.current.count;
          emitSound("COIN_COLLECTED", { rate: gemRate(streak) });
          setGemPop(gemPopScale(streak));
          const points = coinReward(
            state.level,
            state.perks.coinMultiplier * omenEffects(state.omen).gemMultiplier * (relicCount(state.relics, "blood_pact") > 0 ? 1.5 : 1),
            relicCount(state.relics, "lucky_coin"),
          );
          pushPopup({ points, type: "coin" }, e.tile);
          const label = gemStreakLabel(streak);
          if (label) pushPopup({ points: 0, type: "streak", sub: label, popScale: Math.min(1.4, 1 + 0.08 * streak) }, e.tile);
          const at = anchorOf(e.tile);
          setActiveCoins(coins => [
            ...coins,
            { id: Date.now() + Math.random(), x: (at.x ?? windowWidth / 2) - 16, y: (at.y ?? windowHeight / 2) - 16 },
          ]);
          break;
        }
        case "kill": {
          emitSound("ENEMY_KILLED", { rate: comboRate(e.combo) });
          if (e.combo > 0) {
            const look = comboLook(e.combo, GAME_CONFIG.multipliers.maxCombo + relicCount(state.relics, "hunter"));
            pushPopup({ points: killValue(e.combo), type: "kill", sub: look.label, subColor: look.color, popScale: look.scale }, e.tile);
          }
          flash(combatFlash, 0.35, 0.08, 25, 35);
          break;
        }
        case "bossHit": {
          emitSound("BOSS_HIT");
          haptic.impact(ImpactFeedbackStyle.Heavy);
          pushPopup({ points: e.dead ? GAME_CONFIG.boss.killScore : GAME_CONFIG.boss.hitScore, type: "boss", popScale: e.dead ? 1.4 : 1 }, e.tile);
          flash(combatFlash, e.dead ? 0.5 : 0.35, 0.1, 25, 60);
          if (!reduceFlash) setShakeKey(k => k + 1);
          break;
        }
        case "miss": {
          emitSound("ATTACK");
          haptic.impact(ImpactFeedbackStyle.Light); // a miss is a soft tap; a hit has its own heavy one
          break;
        }
        case "pickup": {
          if (e.pickup === "trap") {
            emitSound("TRAP_TRIGGERED");
            pushPopup({ points: GAME_CONFIG.scoring.trapPenalty, type: "trap" }, e.tile);
          } else {
            emitSound("POWERUP");
            pushPopup({ points: e.pickup === "ammo" ? GAME_CONFIG.pickups.ammoAmount : 0, type: e.pickup }, e.tile);
          }
          break;
        }
        case "shieldBreak": {
          emitSound("SHIELD_BREAK");
          haptic.notify(NotificationFeedbackType.Warning);
          setShieldBreakKey(k => k + 1);
          flash(hitFlash, 0.45, 0.12, 60, 190); // about 250 ms in all
          break;
        }
        case "charge": {
          emitSound("CHARGE_WARN");
          haptic.impact(ImpactFeedbackStyle.Medium);
          break;
        }
        case "hazardNear": {
          haptic.notify(NotificationFeedbackType.Warning);
          break;
        }
      }
    }
    // A vortex now costs an arrow (or a shop gem), and a few relics/omens pay shop gems without a pickup: say so.
    if (sameFloor && state.vortexCost && state.vortexCost !== prev.vortexCost) {
      pushPopup({ points: 0, type: "streak", sub: state.vortexCost === "arrow" ? "🌀 -1 🏹" : "🌀 -1 💎", subColor: "#B39DDB" }, state.playerIndex);
    }
    if (state.gems > prev.gems && !has("coin") && state.totalCoins === prev.totalCoins) {
      pushPopup({ points: 0, type: "streak", sub: `+${state.gems - prev.gems} 💎`, subColor: "#4FC3F7" }, state.playerIndex);
    }
  }, [state]);

  useProximityAudio(state);

  // The Wumpus lair announces itself.
  useEffect(() => {
    if (isLairFloor(state.mode, state.level) && state.turn === 0) {
      emitSound("BOSS_ROAR");
    }
  }, [state.level]);

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

  const removeCoin = (id: number) => setActiveCoins(prev => prev.filter(c => c.id !== id));
  const flashPeak = reduceFlash ? 0.25 : 1;

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
          coins={state.coins}
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
        />
        </Profiler>
      </View>


      <DangerVignette
        roar={nearby.enemy && !runEnded && !levelUpWindow}
        vortex={nearby.pit && !runEnded && !levelUpWindow}
        intensity={Math.max(nearby.enemyCount, nearby.pitCount)}
        calm={reduceFlash}
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
        <AttackPanel onAttack={manualAttack} onAim={setAim} arrows={state.attack} relics={state.relics} relicsLabel={t("a11y.relics", { names: relicNames })} />

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

      {/* The death blow: red closes in from the edges of the screen (like damage in a console game) and leaves the middle,
          where the killer is, clean. A full-screen red wash hid the very thing the player needs to see. */}
      <Animated.View
        style={[StyleSheet.absoluteFill, { opacity: deathFlash.interpolate({ inputRange: [0, 0.34], outputRange: [0, 1], extrapolate: "clamp" }), zIndex: 997 }]}
        pointerEvents="none"
      >
        <LinearGradient colors={["rgba(255,23,68,0.72)", "rgba(255,23,68,0)"]} style={{ position: "absolute", left: 0, right: 0, top: 0, height: "15%" }} />
        <LinearGradient colors={["rgba(255,23,68,0)", "rgba(255,23,68,0.72)"]} style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "15%" }} />
        <LinearGradient colors={["rgba(255,23,68,0.72)", "rgba(255,23,68,0)"]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "11%" }} />
        <LinearGradient colors={["rgba(255,23,68,0)", "rgba(255,23,68,0.72)"]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "11%" }} />
      </Animated.View>

      {/* A shield (or feather) soaked a deadly touch: a short red flash */}
      <Animated.View
        style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(255,23,68,1)", opacity: hitFlash, zIndex: 996 }]}
        pointerEvents="none"
      />

      {toast && (
        <Toast text={toast.text} toastKey={toast.key} top={insets.top + hudHeight + 8} onDone={() => setToast(null)} />
      )}

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
        altarFree={altarIsFree(state)}
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
        time={clock.get()}
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
        payout={runResult?.payout}
        streakLost={runResult?.streakLost}
        bestStreak={runResult?.bestStreak}
        freezeUsed={runResult?.freezeUsed}
        freezeEarned={runResult?.freezeEarned}
        unlocks={runResult?.unlocks}
        onTryUnlock={handleTryUnlock}
        goals={runResult?.goals}
        canBuyNow={runResult?.canBuyNow}
        explainEmbers={runResult?.early}
        missionsDone={runResult?.missionsDone}
        rankUp={runResult?.rankUp}
        gemsLeft={state.isGameOver ? state.coins : undefined}
        onShare={handleShare}
        floors={GAME_CONFIG.expedition.floors}
        endless={mode === "endless"}
        demo={demoEnd}
        onUnlock={handleUnlock}
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
        time={clock.get()}
        onSubmit={handleHighScoreSubmit}
        onSkip={() => setShowHighScoreEntry(false)}
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
