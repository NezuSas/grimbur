import { EVENT_MIN_RUNS, eventForWeek, floorEffects } from "../core/engine/events";
import Snowfall from "../ui/components/Snowfall";
import { isYuleDay } from "../core/events/yule";
import { provenMarks } from "../core/engine/solver";
import { loadDailyGhosts, type DailyGhost } from "../services/dailyScores";
import { weekKey } from "../core/leaderboard/daily";
import { reviewDeath } from "../core/engine/deathReview";
import { featuresFor } from "../core/engine/newcomer";
import GameIcon from "../ui/components/GameIcon";
import Text from "../ui/components/Text";
import React, { useState, useEffect, useRef, useCallback, useMemo, Profiler } from "react";
import {
  StyleSheet,
  View,
  Pressable,
  StatusBar,
  Animated,
  AppState,
  BackHandler,
  ImageBackground,
} from "react-native";
import { useWindowDimensions } from "../ui/layout/scaledWindow";
import { useKeyboardControls } from "../ui/useKeyboardControls";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";
import { useFocusEffect, useIsFocused } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import ScoreBar from "../ui/components/ScoreBar";
import BoardView from "../ui/components/BoardView";
import { ASSETS, CLUE_ART } from "../ui/components/GridCell";
import ScreenFlashes from "../ui/components/game/ScreenFlashes";
import GameOverlays from "./game/GameOverlays";
import RunLoadingCover from "../ui/components/game/RunLoadingCover";
import Controls from "../ui/components/DirectionPad";
import FloatingPad from "../ui/components/FloatingPad";
import AttackPanel from "../ui/components/AttackPanel";
import CoinFlight from "../ui/components/game/CoinFlight";
import DangerVignette from "../ui/components/game/DangerVignette";
import FloorBanner from "../ui/components/game/FloorBanner";
import BossIntro from "../ui/components/game/BossIntro";
import RelicTray from "../ui/components/RelicTray";
import { devRelics } from "../dev/devHarness";
import { trayCapacity } from "../ui/components/relicStacks";
import ToolBar from "../ui/components/ToolBar";
import CoachHint from "../ui/components/game/CoachHint";
import ScorePopup from "../ui/components/game/ScorePopup";
import Toast from "../ui/components/game/Toast";
import { useGameLayout, GAME_ROW_PADDING } from "../ui/layout/useGameLayout";
import { haptic, ImpactFeedbackStyle } from "../shared/haptics";
import { RELIC_FAMILY, RelicId, activeFamilies, relicCount, type RelicFamily } from "../core/engine/relics";
import type { ImageSourcePropType } from "react-native";
import Fanfare from "../ui/components/game/Fanfare";
import EncounterModal from "../ui/components/game/EncounterModal";
import { FAMILY_COLOR } from "../ui/familyLook";
import { RELIC_IMAGES } from "../ui/relicImages";
import { GLYPHS } from "../ui/glyphArt";
import { BEAST_ART, BEAST_TINT } from "../ui/beastArt";
import type { BeastId } from "../core/stats/bestiary";
import { NotificationFeedbackType } from "../shared/haptics";
import { useSettingsStore } from "../state/settings/store";
import { emitSound } from "../audio/audioEventBus";
import { onRenderProfile } from "../audio/renderProfile";
import { useGameEngine } from "../core/engine/useGameEngine";
import { getNearbyHazards } from "../core/engine/proximity";
import { bossHearts, countGuardians } from "../core/engine/entityCounts";
import { killerTile } from "../core/feedback/diffFeedback";
import { shouldShowShop } from "../core/feedback/flow";
import { floorNovelties, nextHint } from "../core/feedback/hints";
import type { TranslationKey } from "../i18n/en";
import { forkDoors } from "../core/engine/shop";
import { biomeFor, isNewBiome } from "../core/engine/biomes";
import { isLairFloor, runFloors } from "../core/engine/lair";
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
import { equippedCosmetic } from "../core/cosmetics/cosmetics";
import { getLocalStats, peekLocalStats } from "../services/localStats";
import type { DailyGhostPath } from "../core/stats/runStats";
import { getPlayerName } from "../services/playerProfile";
import { lookOf } from "../core/cosmetics/look";
import { rankOf } from "../core/stats/rank";
import { cosmeticText } from "../i18n/keys";
import { BOARD_BIOME, FLAG_ART, PET_TINT, petLook, shotLookFor } from "../ui/cosmeticArt";
import { petStage } from "../core/cosmetics/petGrowth";
import ShareCard, { SHARE_CARD_WIDTH } from "../ui/components/ShareCard";
import type { ShareCardData } from "../ui/components/ShareCard";
import { shareResult } from "../services/shareResult";
import { rememberChallenge } from "../services/challenges";
import { canSaveState, clearSavedRun, loadSavedRun, restoredState, saveRun } from "../services/savedRun";
import { useEntitlements } from "../state/entitlements/useEntitlements";
import { omenText, relicText } from "../i18n/keys";
import { weaponOf } from "../core/engine/weapons";
import { ammoLeftText, weaponLine } from "../i18n/weaponText";
/** The Grimbur's lieutenant on the floor banner. */
const LIEUTENANT_ART = require("../assets/sprites/enemies/Lieutenant_Boss.webp");
const WARDEN_ART = require("../assets/sprites/enemies/Warden_Boss.webp");

type Props = NativeStackScreenProps<RootStackParamList, "GameScreen">;

// ── Main Screen ──────────────────────────────────────────────────────────
export default function GameScreen({ navigation, route }: Props) {
  const { t, plural } = useT();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const { controlPanelWidth, hudHeight, splitAttack, screenHeight, padDiameter } = useGameLayout();
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

  const { state, isAttacking, move, attack, reset, restore, levelUp, pickRelic, buy, useAltar: spendAltar, sellArrows, useItem: spendItem, useAbility: castAbility, undo, revive, refill, resolveEncounter, dismissEncounter } = useGameEngine();
  // Expeditions and endless runs can be left and continued later; the daily is tied to its date, challenges and duels are live.
  const resumable = !challenge && !duelParam && !isDaily;
  // Between two floors: the shop and the fork, shown once the level-complete card is dismissed.
  // Development only: `devIntermission` opens the between-floors screen, for screenshots.
  const [intermission, setIntermission] = useState(() => __DEV__ && !!route.params?.devIntermission);
  // Dev harness: `window.__replayEncounter()` plays the shown scene's outcome again (to capture its animation frame by frame).
  const [devEncounterKey, setDevEncounterKey] = useState(0);
  useEffect(() => {
    if (!__DEV__ || typeof window === "undefined") return;
    (window as unknown as { __replayEncounter?: () => void }).__replayEncounter = () => setDevEncounterKey(k => k + 1);
  }, []);
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
  // Practice help: only in an expedition or the endless descent (the daily, challenges and duels are the same test for everyone).
  const hintAllowed = (useSettingsStore(s => s.deductionHint) || (__DEV__ && !!route.params?.devHint)) && !isDaily && !challenge;
  const practiceRef = useRef(false);
  if (hintAllowed) practiceRef.current = true; // a run that saw the help once stays out of the top 10
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
  // The week's event is announced on the first floor (the later banners tell their own omens).
  const eventAnnounce = state.level === 1 && !!state.event;
  // What the explored clues prove about the hidden tiles (the practice help); the gems and items lying in plain sight are left alone.
  const deduced = useMemo(() => {
    if (!hintAllowed || state.isGameOver || state.isVictory) return null;
    const marks = provenMarks(state.rows, state.cols, state.entities, state.visited);
    for (const e of state.entities) if (e.type === "coin" || e.type === "shield" || e.type === "ammo") marks.delete(e.index);
    return marks;
  }, [hintAllowed, state.rows, state.cols, state.entities, state.visited, state.isGameOver, state.isVictory]);
  const floorBiome = (__DEV__ ? route.params?.devBiome : undefined) ?? biomeFor(state.level, state.mode);
  // Equipped looks (Collection): read once per run. A board theme only repaints the floor; the biome's rules stay.
  const readLooks = () => {
    const saved = peekLocalStats();
    const board = saved ? equippedCosmetic(saved, "board") : null;
    const flag = saved ? equippedCosmetic(saved, "flag") : null;
    const pet = saved ? equippedCosmetic(saved, "pet") : null;
    // A companion shows its stage: its adult form, and an aura from young on.
    const stage = pet && saved ? petStage(saved.petFloors?.[pet]) : 0;
    return {
      // The shot's style per weapon: the arrow trail (bow), the orb style (Mira), the bomb style (Bram).
      trail: shotLookFor(saved, "bow"),
      orb: shotLookFor(saved, "orb"),
      bomb: shotLookFor(saved, "bomb"),
      board: board ? BOARD_BIOME[board] ?? null : null,
      flag: flag ? FLAG_ART[flag] ?? null : null,
      pet: pet ? petLook(pet, stage) ?? null : null,
      petAura: pet && stage >= 1 ? PET_TINT[pet] ?? null : null,
    };
  };
  const [looks, setLooks] = useState(readLooks);
  const looksRead = useRef(!!peekLocalStats());
  // Opened before the save was read (a link straight into a run): the looks follow as soon as it is.
  useEffect(() => {
    if (looksRead.current) return;
    let live = true;
    void getLocalStats().then(() => {
      if (live) setLooks(readLooks());
    });
    return () => {
      live = false;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const artBiome = looks.board ?? floorBiome;
  // Dev harness only: show the whole floor, to review the art of every tile and creature at once.
  const shownVisited = useMemo(() => (__DEV__ && route.params?.devReveal ? Array.from({ length: state.rows * state.cols }, (_, i) => i) : state.visited), [route.params?.devReveal, state.rows, state.cols, state.visited]);
  const isLair = isLairFloor(state.mode, state.level);
  const levelUpWindow = state.isLevelUp && !state.isVictory;

  const runOver = state.isGameOver || state.isVictory;
  // ── Your own ghost on the daily: the path of today's best attempt as footprints, and where it fell ──
  // The tiles the hero really stood on, floor by floor (not the ones a lantern or a scout only lit), for this attempt alone.
  const pathsRef = useRef<Record<number, number[]>>({});
  const pathsRun = useRef(runNumber);
  useEffect(() => {
    if (!isDaily) return;
    if (pathsRun.current !== runNumber) {
      pathsRun.current = runNumber;
      pathsRef.current = {};
    }
    const floor = pathsRef.current[state.level] ?? (pathsRef.current[state.level] = []);
    if (floor[floor.length - 1] !== state.playerIndex) floor.push(state.playerIndex);
  }, [isDaily, runNumber, state.level, state.playerIndex]);
  const [myGhost, setMyGhost] = useState<DailyGhostPath | null>(null);
  useEffect(() => {
    if (!isDaily) return;
    let live = true;
    void getLocalStats()
      .then(s => live && setMyGhost(s.daily?.date === dailyDate ? s.daily.ghost ?? null : null))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [isDaily, dailyDate, runNumber]);
  const pastSteps = useMemo(() => (myGhost && !runOver ? myGhost.paths[String(state.level)] ?? [] : []), [myGhost, runOver, state.level]);
  const myFall = useMemo(
    () => (myGhost?.fell && myGhost.fell[0] === state.level && !runOver ? [{ tile: myGhost.fell[1], name: t("ghost.you"), art: selectedCharacter.scoreImage }] : []),
    [myGhost, state.level, runOver, t, selectedCharacter],
  );

  // ── Friends' ghosts on the daily: where each friend's best run of today ended (shown once this run is over) ──
  const [dailyGhosts, setDailyGhosts] = useState<DailyGhost[]>([]);
  useEffect(() => {
    if (!isDaily || !runOver) return;
    const pids = (peekLocalStats()?.friends ?? []).map(f => f.pid);
    if (pids.length === 0) return;
    let live = true;
    void loadDailyGhosts(dailyDate, pids).then(g => live && setDailyGhosts(g)).catch(() => {});
    return () => {
      live = false;
    };
  }, [isDaily, runOver, dailyDate]);
  const ghostsHere = useMemo(
    () => (runOver ? dailyGhosts.filter(g => g.level === state.level && g.fell < state.rows * state.cols).map(g => ({ tile: g.fell, name: g.name, art: characters[g.characterIndex]?.scoreImage ?? characters[0].scoreImage })) : []),
    [runOver, dailyGhosts, state.level, state.rows, state.cols],
  );
  const boardGhosts = useMemo(() => [...myFall, ...ghostsHere], [myFall, ghostsHere]);

  // ── Fanfares: a relic family completed, a creature new to the bestiary ──
  const [fanfare, setFanfare] = useState<{ key: number; tint: string; art: ImageSourcePropType | ImageSourcePropType[]; kicker: string; title: string; line?: string } | null>(null);
  const familiesSeen = useRef<{ seed: number; families: RelicFamily[] } | null>(null);
  useEffect(() => {
    const now = activeFamilies(state.relics);
    const before = familiesSeen.current;
    familiesSeen.current = { seed: state.runSeed, families: now };
    // A new run, or a run restored from disk: its families were already there.
    if (!before || before.seed !== state.runSeed) return;
    const fresh = now.find(f => !before.families.includes(f));
    if (!fresh) return;
    const own = [...new Set(state.relics.filter(r => RELIC_FAMILY[r] === fresh))].slice(0, 3);
    emitSound("FAMILY_SET");
    haptic.notify(NotificationFeedbackType.Success);
    setFanfare({
      key: Date.now(),
      tint: FAMILY_COLOR[fresh],
      art: own.map(r => RELIC_IMAGES[r]),
      kicker: t("fanfare.family.kicker"),
      title: t("fanfare.family.title", { name: t(`family.${fresh}.name` as TranslationKey) }),
      line: weaponLine(t, `family.${fresh}.bonus` as TranslationKey, weaponOf(state)),
    });
  }, [state.relics, state.runSeed, t]);

  // Development: a fanfare at once (for screenshots).
  useEffect(() => {
    const kind = __DEV__ ? route.params?.devFanfare : undefined;
    if (!kind) return;
    const timer = setTimeout(() => {
      setFanfare(
        kind === "family"
          ? { key: 1, tint: FAMILY_COLOR.archer, art: (["quiver", "long_bow", "hunter"] as RelicId[]).map(r => RELIC_IMAGES[r]), kicker: t("fanfare.family.kicker"), title: t("fanfare.family.title", { name: t("family.archer.name") }), line: weaponLine(t, "family.archer.bonus", weaponOf(state)) }
          : { key: 2, tint: BEAST_TINT.mimic, art: [BEAST_ART.mimic], kicker: t("fanfare.beast.kicker"), title: t("bestiary.mimic.name"), line: t("fanfare.beast.line") },
      );
    }, 1500);
    return () => clearTimeout(timer);
  }, [route.params?.devFanfare, t]);

  // Creatures new to the bestiary: announced at once in the middle of a floor, or once the next floor opens when they were
  // met as a floor ended (the level card covers the board then). A defeat shows nothing: the card has the floor's story.
  const metSeen = useRef<{ seed: number; n: number } | null>(null);
  const beastsDue = useRef<BeastId[]>([]);
  const announced = useRef<Set<string>>(new Set());
  const announceBeasts = useCallback(() => {
    const list = beastsDue.current;
    if (list.length === 0) return;
    beastsDue.current = [];
    const first = list[0];
    emitSound("BEAST_FOUND");
    haptic.notify(NotificationFeedbackType.Success);
    setFanfare({
      key: Date.now(),
      tint: BEAST_TINT[first],
      art: list.slice(0, 3).map(b => BEAST_ART[b]),
      kicker: t("fanfare.beast.kicker"),
      title: list.map(b => t(`bestiary.${b}.name` as TranslationKey)).join(" · "),
      line: t("fanfare.beast.line"),
    });
  }, [t]);
  useEffect(() => {
    const met = (state.met ?? []) as BeastId[];
    const before = metSeen.current;
    metSeen.current = { seed: state.runSeed, n: met.length };
    if (!before || before.seed !== state.runSeed || met.length <= before.n) return;
    const known = peekLocalStats()?.bestiary?.met ?? [];
    const fresh = met.slice(before.n).filter(b => !known.includes(b) && !announced.current.has(b));
    if (fresh.length === 0) return;
    fresh.forEach(b => announced.current.add(b));
    beastsDue.current = [...beastsDue.current, ...fresh];
    if (!state.isLevelUp && !state.isGameOver && !state.isVictory) announceBeasts();
  }, [state.met, state.runSeed, state.isLevelUp, state.isGameOver, state.isVictory, announceBeasts]);
  useEffect(() => {
    if (beastsDue.current.length === 0 || state.isLevelUp || state.isGameOver) return;
    // A new floor: after its banner.
    const timer = setTimeout(announceBeasts, 3200);
    return () => clearTimeout(timer);
  }, [state.level, state.isLevelUp, state.isGameOver, announceBeasts]);
  // The floor banner holds the board until it has gone (or is tapped away), so no step is taken under it.
  const bannerKey = `${runNumber}-${state.runSeed}-${state.level}`;
  const [bannerDone, setBannerDone] = useState<string | null>(null);
  const [bannerSkipped, setBannerSkipped] = useState<string | null>(null);
  const bannerUp = bannerDone !== bannerKey && !runEnded;
  useEffect(() => {
    // Never hold the board for good if the banner cannot finish (it is hidden behind something else).
    if (!isFocused) return;
    const timer = setTimeout(() => setBannerDone(bannerKey), 9000);
    return () => clearTimeout(timer);
  }, [bannerKey, isFocused]);
  // Who waits in this floor's fog, shown on the floor banner: the creatures are met by name before they are deduced.
  const floorRoster = useMemo(() => {
    const kinds = [
      { key: "enemy", art: ASSETS.enemy, label: t("roster.enemy") },
      { key: "stalker", art: ASSETS.stalker, label: t("roster.stalker") },
      { key: "sleeper", art: ASSETS.sleeper, label: t("roster.sleeper") },
      { key: "mimic", art: ASSETS.mimic, label: t("roster.mimic") },
      { key: "thief", art: ASSETS.thief, label: t("roster.thief") },
      { key: "brute", art: LIEUTENANT_ART, label: t("roster.brute") },
      { key: "warden", art: WARDEN_ART, label: t("roster.warden") },
      { key: "pit", art: ASSETS.pit, label: t("roster.pit") },
      { key: "chest", art: ASSETS.chest, label: t("roster.chest") },
    ] as const;
    return kinds
      .map(k => ({ ...k, count: state.entities.filter(e => (k.key === "brute" ? e.type === "boss" && e.mini && !e.warden : k.key === "warden" ? e.type === "boss" && e.warden : e.type === k.key)).length }))
      .filter(k => k.count > 0);
    // Counted when the floor starts; kills during the floor do not rewrite the banner.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.level, state.runSeed, runNumber, t]);
  // A new cave type is announced on its first floor (the omen, when there is one, takes the banner).
  const biomeAnnounce = isNewBiome(state.level, state.mode) && floorBiome !== "cave" && floorBiome !== "lair";
  const doors = useMemo(
    () => (intermission ? (__DEV__ && route.params?.devDoors) || forkDoors(state.runSeed, state.level + 1, state.mode) : null),
    [intermission, state.runSeed, state.level, state.mode, route.params?.devDoors],
  );
  useEffect(() => {
    if (!levelUpWindow && !(__DEV__ && route.params?.devIntermission)) setIntermission(false);
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
  const { flags, flagPing, toggleFlag, manualMove, manualAttack, canRepeatMove, fireDragged, setAim, aimDir, aimTiles, aimArea, shot, shotRef, travelTo, cancelTravel, stepSoundedAt } = useBoardInput({
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
    shotRef,
  });
  // The clock ticks outside React state: only the timer text in the HUD re-renders every second.
  const clock = useSessionClock(!runEnded && !state.isLevelUp && !paused && !state.pendingDraft && isFocused);
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
    afterQuestion: second.declined,
    characterIndex,
    ascension,
    mode,
    isDaily,
    dailyDate,
    challengeCode: challenge?.code ?? null,
    startRelics: route.params?.meta?.startRelics?.length ?? 0,
    practiceRef,
    pathsRef,
    sessionTimeRef,
    deathFlash,
    reduceFlash,
  });

  // While an overlay is open, the HUD, board and pad must not be reachable by screen readers (Android ignores
  // accessibilityViewIsModal).
  // A look at the board behind the defeat card: the tiles the lesson says were provably safe are outlined.
  const [peek, setPeek] = useState(false);
  const review = useMemo(() => reviewDeath(state), [state]);
  const peekTiles = review?.kind === "avoidable" ? review.tiles : [];
  useEffect(() => {
    if (!state.isGameOver) setPeek(false);
  }, [state.isGameOver]);
  const overlayOpen = paused || !!state.pendingDraft || showGameOver || second.visible || showHighScoreEntry || intermission;
  const behindOverlay = {
    importantForAccessibility: overlayOpen ? ("no-hide-descendants" as const) : ("auto" as const),
    accessibilityElementsHidden: overlayOpen,
  };
  const canPause = !runEnded && !state.isLevelUp && !state.pendingDraft && !showGameOver && !showHighScoreEntry;

  const canPauseRef = useRef(false);
  canPauseRef.current = canPause;
  const runEndedRef = useRef(runEnded);
  runEndedRef.current = runEnded;
  const busyRef = useRef(false);
  busyRef.current = levelUpWindow || !!state.pendingDraft || second.visible; // the second-chance question is answered with its buttons

  // Guards / bookkeeping refs
  const leaving = useRef(false); //           blocks timers from navigating after we left
  const floorStart = useRef({ enemies: 0, gems: 0 });

  // ── Run bookkeeping ──────────────────────────────────────────────────────
  const startRun = useCallback(() => {
    practiceRef.current = hintAllowed;
    deathFlash.setValue(0);
    resetStreak();
    setRunNumber(n => n + 1); // replays the floor banner even when a daily restarts on the same seed
    reset(selectedCharacter, {
      heroIndex: characterIndex,
      ascension,
      meta: challenge ? undefined : route.params?.meta,
      ...(challenge ? { runSeed: challenge.seed } : {}),
      ...(isDaily ? { mode: "daily" as const, runSeed: dailySeed(dailyDate) } : {}),
      ...(mode === "endless" || mode === "quick" ? { mode } : {}),
      // The week's event: every expedition this week (never a challenge or a duel, nor a newcomer's first runs).
      event: !challenge && (peekLocalStats()?.gamesPlayed ?? 0) >= EVENT_MIN_RUNS ? eventForWeek(weekKey(dailyKey())) : null,
      // A newcomer meets the extras one run at a time (secret rooms, then encounters).
      features: featuresFor(peekLocalStats()?.gamesPlayed ?? 0, isDaily ? "daily" : mode, !!challenge || !!duelParam),
    });
  }, [reset, selectedCharacter, characterIndex, ascension, isDaily, dailyDate, challenge, route.params?.meta, hintAllowed, mode]);

  /** Writes the run to disk so "Continuar" (or Android killing the process) does not cost it. */
  const saveCurrentRun = useCallback(() => {
    if (!resumable || !canSaveState(stateRef.current)) return false;
    void saveRun({ characterIndex, skin, ascension, meta: route.params?.meta, time: clock.get(), state: stateRef.current });
    return true;
  }, [resumable, characterIndex, skin, ascension, clock, route.params?.meta]);

  // Every new floor is written as soon as it opens. Between floors nothing can be saved (the card, the draft and the shop live
  // outside the engine), so if Android closes the app there, "Continuar" opens the start of the last floor reached, never an older one.
  useEffect(() => {
    if (state.level > 1 && state.turn === 0) saveCurrentRun();
  }, [state.level, state.runSeed]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // Dev web only (?relics=N): the run starts holding N relics, to check how the tray fits every screen.
  useEffect(() => {
    const ids = devRelics();
    if (ids && state.relics.length === 0 && state.entities.length > 0) restore({ ...state, relics: ids });
  }, [state.runSeed, state.entities.length > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  // The finished run can no longer be continued.
  useEffect(() => {
    if (runEnded && resumable) void clearSavedRun();
  }, [runEnded, resumable]);

  // Music, hardware Back and AppState only act while this screen is focused.
  useFocusEffect(
    useCallback(() => {
      // Back from the Forge (or anywhere) over a finished run: the menu music it left with goes on; the run's loop does not return.
      if (!runEndedRef.current) emitSound("GAME_MUSIC_START");

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
  const shareReady = useRef<(() => void) | null>(null);
  const handleShare = useCallback(async () => {
    if (sharing.current) return; // a second tap while the picture is being made
    sharing.current = true;
    try {
      const s = stateRef.current;
      const run = { level: s.level, score: s.score, totalCoins: s.totalCoins, isVictory: s.isVictory, time: sessionTimeRef.current };
      const opts = { isDaily, dailyDate, ascension, streak: runResult?.streak, endless: mode === "endless", floors: runFloors(mode), heroName: selectedCharacter.playerName, challengeCode: challenge?.code, route: isDaily ? routeOf() : undefined };
      const message = buildShareMessage(run, opts, { t, plural });
      analytics.track(isDaily ? "daily_shared" : "run_shared", { score: s.score });
      // Who played: the public name, the title worn and the rank, on the hero's nameplate.
      const saved = peekLocalStats();
      const name = await getPlayerName().catch(() => null);
      const worn = saved ? lookOf(saved).title : undefined;
      const rank = saved ? rankOf(saved.lifetimeEmbers) : null;
      const player = {
        playerName: name ?? undefined,
        playerTitle: worn ? cosmeticText(t, worn) : undefined,
        playerRank: rank ? t("share.rank", { n: rank.level, name: t(`rank.${rank.level}` as TranslationKey) }) : undefined,
        frame: saved ? lookOf(saved).frame ?? null : null,
      };
      // The card is captured once every picture in it has drawn (or after a while, so sharing never hangs).
      await new Promise<void>(resolve => {
        const done = () => {
          clearTimeout(timer);
          shareReady.current = null;
          setTimeout(resolve, 120); // one more frame for the last picture to reach the screen
        };
        const timer = setTimeout(done, 2500);
        shareReady.current = done;
        setShareCard({ ...buildShareCard(run, opts, { t, plural }, selectedCharacter), ...player });
      });
      await shareResult(shareCardRef, message, t("share.dialog"), Math.min(windowWidth, SHARE_CARD_WIDTH));
    } finally {
      setShareCard(null);
      sharing.current = false;
    }
  }, [dailyDate, runResult, t, plural, isDaily, ascension, mode, challenge, selectedCharacter, sessionTimeRef, routeOf, windowWidth]);

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

  // Between floors the old board stays hidden under a dark cover, which lifts once the next floor is there.
  const [floorCovered, setFloorCovered] = useState(false);
  const coverOpacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (floorCovered && !state.isLevelUp) {
      Animated.timing(coverOpacity, { toValue: 0, duration: reduceFlash ? 0 : 180, useNativeDriver: true }).start(() => setFloorCovered(false));
    } else if (floorCovered) {
      coverOpacity.setValue(1);
    }
  }, [floorCovered, state.isLevelUp, coverOpacity, reduceFlash]);

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
      // The cleared floor is covered from here on: coming back, only the next floor (or its relic draft) is ever seen.
      coverOpacity.setValue(1);
      setFloorCovered(true);
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
      else {
        // The first floors skip the shop and the fork: the next floor is built while the card is on screen (behind it), so
        // "Next floor" lands straight on it, with nothing old or black in between.
        setTimeout(() => {
          const later = stateRef.current;
          if (!mounted.current || leaving.current || !later.isLevelUp || later.isVictory) return;
          levelUp(undefined);
        }, 400);
      }
    }, 2200); // long enough to see the floor unveiled (its creatures and whether each flag was right)

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
  const handleSell = useCallback(() => {
    haptic.impact();
    emitSound("EMBER_GAIN");
    sellArrows();
  }, [sellArrows]);
  const handleAltar = useCallback(() => { emitSound("RELIC_PICKED"); spendAltar(); }, [spendAltar]);
  const handleAbility = useCallback(() => { cancelTravel(); emitSound("POWERUP"); castAbility(); }, [cancelTravel, castAbility]);
  const handleItem = useCallback((item: "detector" | "bomb") => { cancelTravel(); emitSound("POWERUP"); spendItem(item); }, [cancelTravel, spendItem]);
  const handleDetector = useCallback(() => handleItem("detector"), [handleItem]);
  const handleBomb = useCallback(() => handleItem("bomb"), [handleItem]);
  const handleUndo = useCallback(() => { cancelTravel(); emitSound("MOVE"); undo(); }, [cancelTravel, undo]);
  // A mouse: Shift + click on a tile in the hero's row or column shoots that way.
  const shootToward = useCallback(
    (tile: number) => {
      const s = state;
      const hr = Math.floor(s.playerIndex / s.cols);
      const hc = s.playerIndex % s.cols;
      const r = Math.floor(tile / s.cols);
      const c = tile % s.cols;
      if (tile === s.playerIndex || (r !== hr && c !== hc)) return;
      manualAttack(r < hr ? "UP" : r > hr ? "DOWN" : c < hc ? "LEFT" : "RIGHT");
    },
    [state, manualAttack],
  );
  // A computer's keyboard plays the run too (arrows/WASD, Space or Shift+direction to shoot, Q ability, Z undo, P pause),
  // only while the board is live: no card, pause or end of run in front.
  useKeyboardControls(
    {
      onMove: manualMove,
      onAttack: manualAttack,
      onPause: canPause ? openPause : undefined,
      onAbility: handleAbility,
      onUndo: state.undo && !state.undoUsed ? handleUndo : undefined,
    },
    isFocused && canPause && !paused && !intermission && !state.encounter,
  );

  // The gems the floor started with (the HUD counts found / total). Gems are never added within a floor, so the count at the
  // floor's first render is its total.
  const floorKey = `${state.runSeed}:${state.level}`;
  const gemsTotal = useMemo(() => state.coins, [floorKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // The hums and the heartbeat stop behind the pause menu and while another screen is in front.
  useProximityAudio(state, !paused && isFocused);

  // The Grimbur lair announces itself once its board is in sight (after the relic draft that opens the floor): the
  // Grimbur's entrance card, a roar, a heavy thump in the hand and a dark red veil that lifts. Once per lair.
  const lairVeil = useRef(new Animated.Value(0)).current;
  const [bossIntro, setBossIntro] = useState(false);
  // The Ancestral Grimbur holds the lair on the hardest depths and deep in the endless descent.
  const lairAncient = state.entities.some(e => e.type === 'boss' && !e.mini && e.ancient);
  const lairShown = useRef("");
  const lairInSight = isLair && state.turn === 0 && !state.pendingDraft && !levelUpWindow && !runEnded && !bootCover;
  useEffect(() => {
    const lairKey = `${runNumber}-${state.runSeed}-${state.level}`;
    if (lairInSight && lairShown.current !== lairKey) {
      lairShown.current = lairKey;
      setBossIntro(true);
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
  }, [lairInSight]);

  const nearby = getNearbyHazards(state.playerIndex, state.rows, state.cols, state.entityMap);
  // Next to a hazard the screen's glow and the clues on the board beat with one heart (still when calm).
  const inDanger = (nearby.enemy || nearby.pit) && !runEnded && !levelUpWindow;
  const heartbeat = useHeartbeat(inDanger && !reduceFlash && !paused && isFocused, Math.max(nearby.enemyCount, nearby.pitCount));
  const relicNames = state.relics.map(id => relicText(t, id, "name")).join(", ");
  // Narrow screens put the relics above the tools and the pad: they get the height those leave, so they never cover a button.
  const toolSize = Math.max(34, Math.min(46, (controlPanelWidth + 12 - 18) / 4));
  const relicRoom = screenHeight - hudHeight - insets.top - insets.bottom - padDiameter - toolSize - 8 - 10 - 4 - 6;

  const boardSummary = [
    t("hud.floorOf", { level: state.level, floors: runFloors(mode) }),
    plural("a11y.gemsLeft", state.coins),
    ammoLeftText(t, weaponOf(state), state.attack),
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
        novelties: floorNovelties(state),
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
    {shareCard ? (
      // Drawn inside the window (Android does not draw what lies outside it) but under the opaque game screen, so the player
      // never sees it; it is only on screen while a result is being shared.
      <View ref={shareCardRef} collapsable={false} pointerEvents="none" style={{ position: "absolute", left: 0, top: 0 }}>
        <ShareCard {...shareCard} width={Math.min(windowWidth, SHARE_CARD_WIDTH)} onReady={() => shareReady.current?.()} />
      </View>
    ) : null}
    <ImageBackground
      fadeDuration={0}
      resizeMethod="none"
      source={BIOME_ART[artBiome].background}
      style={styles.container}
      resizeMode="cover"
    >
      {/* Dark overlay for gameplay clarity */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: BIOME_TINT[artBiome] }]} />

      <StatusBar hidden />

      <View style={{ paddingTop: insets.top, zIndex: 10 }} {...behindOverlay}>
        <Profiler id="hud" onRender={onRenderProfile}>
        <ScoreBar
          weapon={weaponOf(state)}
          score={state.score}
          // Gems still flying are not counted off yet: the counter ticks as each one lands.
          coins={state.coins + activeCoins.length}
          gemsTotal={Math.max(gemsTotal, state.coins + activeCoins.length)}
          attackValue={state.attack}
          shield={state.shield}
          onPause={canPause ? openPause : undefined}
          level={state.level}
          floors={mode === "endless" ? undefined : runFloors(mode)}
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


      {/* Christmas in the cave: a light snow over the floor (a look only). */}
      {isYuleDay(dailyKey()) ? <Snowfall count={18} calm={reduceFlash} /> : null}
      <DangerVignette
        roar={nearby.enemy && !runEnded && !levelUpWindow}
        vortex={nearby.pit && !runEnded && !levelUpWindow}
        intensity={Math.max(nearby.enemyCount, nearby.pitCount)}
        calm={reduceFlash}
        beat={heartbeat}
      />
      {/* While the floor banner is up the board waits: a tap anywhere closes it and play begins. */}
      {bannerUp && isFocused && !levelUpWindow && !state.pendingDraft && !bootCover && !bossIntro && (
        <Pressable style={[StyleSheet.absoluteFill, { zIndex: 39 }]} onPress={() => setBannerSkipped(bannerKey)} accessibilityRole="button" accessibilityLabel={t("floor.bannerSkip")} />
      )}
      {!runEnded && isFocused && !levelUpWindow && !state.pendingDraft && !bootCover && !bossIntro && (
        <FloorBanner
          floorKey={bannerKey}
          onDone={() => setBannerDone(bannerKey)}
          title={isLair ? t("floor.banner.lair") : t("floor.banner", { n: state.level })}
          omenName={isLair ? t("boss.goalTitle") : floorOmen ? omenText(t, floorOmen, "name") : biomeAnnounce ? t(`biome.${floorBiome}.name` as TranslationKey) : eventAnnounce ? `${t("event.kicker")}: ${t(`event.${state.event}.name` as TranslationKey)}` : undefined}
          omenRule={isLair ? t("boss.goalRule", { hearts: bossHearts(state) }) : floorOmen ? omenText(t, floorOmen, "rule", weaponOf(state)) : biomeAnnounce ? weaponLine(t, `biome.${floorBiome}.rule` as TranslationKey, weaponOf(state)) : eventAnnounce ? weaponLine(t, `event.${state.event}.rule` as TranslationKey, weaponOf(state)) : undefined}
          story={isLair ? t("story.lair") : biomeAnnounce ? t(`story.biome.${floorBiome}` as TranslationKey) : undefined}
          long={isLair}
          dismiss={bannerSkipped === bannerKey}
          hold={__DEV__ && !!route.params?.devBanner}
          minTop={insets.top + hudHeight + 6}
          calm={reduceFlash}
          roster={floorRoster}
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
        <AttackPanel weapon={weaponOf(state)} onAttack={manualAttack} onAim={setAim} arrows={state.attack} refill={{ show: arrowShop.show, price: arrowShop.price, arrows: arrowShop.arrows, busy: arrowShop.busy, onBuy: () => void arrowShop.buy() }} relics={state.relics} relicsLabel={t("a11y.relics", { names: relicNames })} />

        <View ref={boardBox} onLayout={measureBoard} accessible accessibilityRole="summary" accessibilityLabel={boardSummary}>
          <Profiler id="board" onRender={onRenderProfile}>
          <BoardView
            onTileShiftClick={shootToward}
            deduced={deduced}
            friendGhosts={boardGhosts}
            secretTile={state.secret ?? null}
            pastSteps={pastSteps}
            dark={!!floorEffects(state.omen, state.event).dark}
            level={state.level}
            rows={state.rows}
            cols={state.cols}
            entityMap={state.entityMap}
            playerIndex={state.playerIndex}
            visited={shownVisited}
            facingDir={state.facingDir}
            characterIndex={characterIndex}
            skin={skin}
            biome={artBiome}
            trail={looks.trail}
            weapon={weaponOf(state)}
            orbLook={looks.orb}
            bombLook={looks.bomb}
            flag={looks.flag}
            pet={looks.pet}
            petAura={looks.petAura}
            // A cleared or lost floor shows what the fog hid: the creatures finally seen, the deductions checked.
            unveil={state.isLevelUp || (state.isGameOver && !state.isVictory) || (__DEV__ && !!route.params?.devUnveil)}
            isAttacking={isAttacking}
            guardianCount={countGuardians(state)}
            onTilePress={travelTo}
            flags={flags}
            aimTiles={aimTiles}
            aimArea={state.attack > 0 ? aimArea : undefined}
            aimDir={state.attack > 0 ? aimDir : null}
            shot={shot}
            teleported={state.wasTeleported}
            trapBit={state.lastPickup === "trap"}
            paused={paused || !isFocused}
            dying={state.isGameOver && !state.isVictory}
            highlight={peek ? peekTiles : undefined}
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
            <View style={styles.relicSlot} pointerEvents="box-none">
              <RelicTray relics={state.relics} size={28} max={Math.min(8, trayCapacity(controlPanelWidth, relicRoom, 28))} details weapon={weaponOf(state)} label={t("a11y.relics", { names: relicNames })} />
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
              size={toolSize}
            />
          </View>
          {movePad === "floating" ? (
            <FloatingPad onMove={manualMove} canRepeat={canRepeatMove} onAttack={manualAttack} onAim={setAim} arrows={state.attack} weapon={weaponOf(state)} />
          ) : (
            <Controls onMove={manualMove} onAttack={manualAttack} onAim={setAim} arrows={state.attack} weapon={weaponOf(state)} />
          )}
        </View>
      </View>

      {floorCovered ? <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.floorCover, { opacity: coverOpacity }]} /> : null}

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
          art={p.art}
          subArt={p.subArt}
          weapon={weaponOf(state)}
          onComplete={() => removePopup(p.id)}
        />
      ))}

      {/* Development: one of each label, held still (for screenshots). */}
      {__DEV__ && route.params?.devPopups ? (
        <>
          <ScorePopup points={0} type="streak" sub="Linterna del minero" subColor="#C9A55A" popScale={1.1} art={RELIC_IMAGES.lantern} hold onComplete={() => {}} />
          <ScorePopup points={120} type="coin" x={420} y={140} hold onComplete={() => {}} />
          <ScorePopup points={300} type="kill" sub="x3 COMBO" subColor="#C8763A" x={600} y={140} hold onComplete={() => {}} />
          <ScorePopup points={250} type="streak" sub={weaponLine(t, "secret.found", weaponOf(state), { gems: 3, arrows: 1 })} subColor="#DCC48E" popScale={1.1} art={GLYPHS.sparkles} x={200} y={260} hold onComplete={() => {}} />
          <ScorePopup points={0} type="streak" sub="−1" subColor="#A397BF" art={CLUE_ART.vortex} subArt={GLYPHS.arrows} x={420} y={260} hold onComplete={() => {}} />
          <ScorePopup points={0} type="shield" x={600} y={260} hold onComplete={() => {}} />
        </>
      ) : null}
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

      {bossIntro && (
        <BossIntro
          name={t(lairAncient ? "boss.ancient.name" : "boss.intro.name")}
          title={t(lairAncient ? "boss.ancient.title" : "boss.intro.title")}
          skipLabel={t("boss.intro.skip")}
          calm={reduceFlash}
          ancient={lairAncient}
          onDone={() => setBossIntro(false)}
        />
      )}

      {toast && (
        <Toast text={toast.text} toastKey={toast.key} top={insets.top + hudHeight + 8} onDone={() => setToast(null)} />
      )}

      {hint && (
        <CoachHint
          hintKey={hint.id}
          // Long tips stay longer: about 50 ms per character (7 s at least), so a new mechanic can be read in full.
          duration={Math.max(7000, hint.text.length * 50)}
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

      {/* Looking at the board behind the defeat card: one tap brings the card back. */}
      {peek && showGameOver ? (
        <Pressable
          onPress={() => setPeek(false)}
          accessibilityRole="button"
          accessibilityLabel={t("review.back")}
          style={{ position: "absolute", bottom: insets.bottom + 16, alignSelf: "center", flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 10, paddingHorizontal: 18, borderRadius: 22, backgroundColor: "#C99A5C", zIndex: 50 }}
        >
          <GameIcon name="arrow-back" size={16} color="#2A1A08" />
          <Text style={{ color: "#2A1A08", fontWeight: "900", fontSize: 13 }} maxFontSizeMultiplier={1.1}>{t("review.back").toLocaleUpperCase()}</Text>
        </Pressable>
      ) : null}


      <GameOverlays
        state={state}
        character={selectedCharacter}
        time={clock.get()}
        bootCover={bootCover}
        shop={{ visible: intermission, preview: __DEV__ && !!route.params?.devIntermission, doors, chosen: door, onChoose: setDoor, onBuy: handleBuy, onAltar: handleAltar, onSell: handleSell, onGo: handleGo }}
        onPickRelic={handlePickRelic}
        encounter={{ visible: !!state.encounter && !state.pendingDraft && !bannerUp && !runEnded && !paused && !state.isGameOver, onChoose: resolveEncounter, onClose: dismissEncounter }}
        pause={{ visible: paused, saveOnExit: resumable, canRestart: !duelParam, onResume: () => setPaused(false), onRestart: handleRetry, onMainMenu: handleMainMenu }}
        gameOver={{
          visible: showGameOver && !peek,
          onPeek: () => setPeek(true),
          friendGhosts: ghostsHere.length,
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
          onForge: () => {
            // The defeat or victory stopped the run's music: the Forge is a menu, it gets the menu music.
            emitSound("COVER_SCREEN_START");
            navigation.navigate("ForgeScreen");
          },
          onRetry: duelParam ? handleRematch : handleRetry,
          retryLabel: duelParam ? t("duel.rematch") : undefined,
          onMainMenu: handleMainMenu,
        }}
        revive={{ visible: second.visible, price: second.price, embers: second.embers, used: second.used, busy: second.busy, onRevive: () => void second.accept(), onDecline: second.decline }}
        highScore={{ visible: showHighScoreEntry, daily: isDaily, challenge: !!challenge, onSubmit: handleHighScoreSubmit, onSkip: () => setShowHighScoreEntry(false) }}
      />

      {/* Over everything, the pick and the shop included: the moment it marks often happens there. */}
      {__DEV__ && route.params?.devEncounter ? <EncounterModal key={devEncounterKey} encounter={route.params.devEncounter} state={{ ...state, attack: 3, gems: 5 }} onChoose={() => {}} onClose={() => {}} /> : null}
      {fanfare && !showGameOver ? (
        <Fanfare fanfareKey={fanfare.key} tint={fanfare.tint} art={fanfare.art} kicker={fanfare.kicker} title={fanfare.title} line={fanfare.line} top={insets.top + 10} calm={reduceFlash} hold={__DEV__ && !!route.params?.devFanfare} onDone={() => setFanfare(null)} />
      ) : null}
    </ImageBackground>
    </Profiler>
  );
}

const styles = StyleSheet.create({
  floorCover: { backgroundColor: "#0A0704", zIndex: 20 },
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
