import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  StyleSheet,
  View,
  StatusBar,
  Dimensions,
  Animated,
  AppState,
  BackHandler,
  Share,
  ImageBackground,
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
import ScorePopup, { PopupType } from "../ui/components/game/ScorePopup";
import { useSettingsStore } from "../state/settings/store";
import { emitSound } from "../audio/audioEventBus";
import { useGameEngine } from "../core/engine/useGameEngine";
import { getNearbyHazards } from "../core/engine/proximity";
import { coinValue, killValue } from "../core/engine/scoring";
import characters from "../data/characters";
import { getDifficulty } from "../core/difficulty/difficulty";
import { addHighscore, isTopTenScore } from "../services/highscores";
import { recordRun, recordDailyRun } from "../services/localStats";
import { dailyKey, dailySeed } from "../core/engine/seed";
import { analytics } from "../services/analytics";
import { GAME_CONFIG } from "../config/gameConfig";
import { useSessionTimer } from "../hooks/useSessionTimer";
import { useProximityAudio } from "../hooks/useProximityAudio";

type Props = NativeStackScreenProps<RootStackParamList, "GameScreen">;

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

// ── Main Screen ──────────────────────────────────────────────────────────
export default function GameScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const characterIndex = (route.params as any)?.characterIndex ?? 0;
  const selectedCharacter = characters[characterIndex];

  const { state, isAttacking, move, attack, reset, levelUp } = useGameEngine();
  const [activeCoins, setActiveCoins] = useState<{ id: number; x: number; y: number }[]>([]);
  const [killPopups, setKillPopups] = useState<{ id: number; points: number; type: PopupType }[]>([])
  const [runResult, setRunResult] = useState<{ bestScore: number; isNewBest: boolean; streak?: number } | null>(null);
  const [showGameOver, setShowGameOver] = useState(false);
  const [showHighScoreEntry, setShowHighScoreEntry] = useState(false);
  const combatFlash = useRef(new Animated.Value(0)).current;
  const vortexFlash = useRef(new Animated.Value(0)).current;

  const [paused, setPaused] = useState(false);
  const { time: sessionTime, reset: resetTimer } = useSessionTimer(!state.isGameOver && !state.isLevelUp && !paused);

  // Refs so the back-button / AppState listeners always see the latest values.
  const pausedRef = useRef(false);
  const canPauseRef = useRef(false);
  pausedRef.current = paused;
  canPauseRef.current = !state.isGameOver && !state.isLevelUp && !showGameOver && !showHighScoreEntry;

  // Refs for tracking changes
  const lastPlayerIndex = useRef(state.playerIndex);
  const lastCoins = useRef(state.coins);
  const lastAttack = useRef(state.attack);
  const lastEnemyCount = useRef(state.entities.filter(e => e.type === 'enemy').length);
  const gameOverTriggered = useRef(false); // Guard: prevent multiple triggers
  const justLeveledUp     = useRef(false); // Guard: suppress phantom MOVE on level start
  const isResetting       = useRef(false); // Guard: suppress feedbacks on retry/reset

  // Handle game music on focus/unfocus
  useFocusEffect(
    useCallback(() => {
      emitSound('GAME_MUSIC_START');
      return () => {
        emitSound('GAME_MUSIC_STOP');
        emitSound('STOP_GUARDIAN_NEAR');
        emitSound('STOP_VORTEX_NEAR');
      };
    }, [])
  );

  // The daily challenge fixes the board seed to today's UTC date (captured once per screen visit).
  const mode = route.params?.mode ?? 'expedition';
  const isDaily = mode === 'daily';
  const dailyDate = useRef(dailyKey()).current;

  const startRun = useCallback(() => {
    reset(selectedCharacter, {
      heroIndex: characterIndex,
      ...(isDaily ? { mode: 'daily' as const, runSeed: dailySeed(dailyDate) } : {}),
    });
  }, [reset, selectedCharacter, characterIndex, isDaily, dailyDate]);

  // Initialize game on mount
  useEffect(() => {
    startRun();
    analytics.track('game_start', { mode, character: characterIndex });

    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      // Back pauses a running game, and resumes a paused one, instead of silently abandoning the run.
      if (pausedRef.current) {
        setPaused(false);
        return true;
      }
      if (canPauseRef.current) {
        setPaused(true);
        return true;
      }
      emitSound('GAME_MUSIC_STOP');
      emitSound('STOP_GUARDIAN_NEAR');
      emitSound('STOP_VORTEX_NEAR');
      return false; // Let navigation handle the actual back
    });

    // Leaving the app mid-run pauses it.
    const appStateSub = AppState.addEventListener('change', next => {
      if (next !== 'active' && canPauseRef.current) setPaused(true);
    });

    return () => {
      backHandler.remove();
      appStateSub.remove();
    };
  }, []);

  // ── VORTEX TELEPORT Flash ─────────────────────────────────────────────────
  useEffect(() => {
    if (!state.wasTeleported) return;
    emitSound('VORTEX_TELEPORT');
    // Quick purple flash: fade in fast, fade out slower
    Animated.sequence([
      Animated.timing(vortexFlash, { toValue: 1, duration: 120, useNativeDriver: true }),
      Animated.timing(vortexFlash, { toValue: 0, duration: 350, useNativeDriver: true }),
    ]).start();
  }, [state.wasTeleported, state.playerIndex]);

  // ── GAME OVER Handler ────────────────────────────────────────────────────
  const runEnded = state.isGameOver || state.isVictory;

  useEffect(() => {
    if (runEnded && !gameOverTriggered.current) {
      gameOverTriggered.current = true;
      if (state.isVictory) {
        emitSound('LEVEL_UP'); // victory fanfare
        analytics.track('expedition_won', { score: state.score, time: sessionTime, character: characterIndex, mode });
      } else {
        emitSound('GAME_OVER');
        analytics.track('game_over', {
          level: state.level,
          score: state.score,
          time: sessionTime,
          cause: state.deathCause ?? 'unknown',
        });
      }
      if (isDaily) {
        // Daily runs are tracked locally (best of the day + streak) and never enter the global top 10.
        recordDailyRun({ score: state.score, level: state.level }, dailyDate)
          .then(({ dailyBest, isNewDailyBest, streak }) =>
            setRunResult({ bestScore: dailyBest, isNewBest: isNewDailyBest, streak }))
          .catch(e => console.warn('[GameScreen] recordDailyRun error:', e));
        const t = setTimeout(() => setShowGameOver(true), 400);
        return () => clearTimeout(t);
      }

      recordRun({ score: state.score, level: state.level })
        .then(({ stats, isNewBestScore }) => setRunResult({ bestScore: stats.bestScore, isNewBest: isNewBestScore }))
        .catch(e => console.warn('[GameScreen] recordRun error:', e));
      
      const checkPromise = isTopTenScore(state.score, sessionTime);
      const t = setTimeout(async () => {
        const qualifies = await checkPromise;
        if (qualifies) {
          setShowHighScoreEntry(true);
        } else {
          setShowGameOver(true);
        }
      }, 400);
      return () => clearTimeout(t);
    }
  }, [runEnded, sessionTime]);

  const handleHighScoreSubmit = useCallback(async (playerName: string) => {
    try {
      await addHighscore({
        score: state.score,
        level: state.level,
        name: playerName,
        coins: state.totalCoins,
        characterIndex,
        time: sessionTime,
      });
      analytics.track('high_score_submitted', { level: state.level, score: state.score });
    } catch (e) {
      console.warn('[GameScreen] addHighscore error:', e);
    }
    setShowHighScoreEntry(false);
    setShowGameOver(true);
  }, [state.score, state.level, state.totalCoins, characterIndex, sessionTime]);

  const handleRetry = useCallback(() => {
    isResetting.current = true;
    gameOverTriggered.current = false;
    setKillPopups([]);
    setRunResult(null);
    setShowGameOver(false);
    resetTimer();
    setPaused(false);
    startRun();
    
    setTimeout(() => { 
      isResetting.current = false; 
    }, 100);
  }, [startRun]);

  const handleShare = useCallback(async () => {
    const streakText = runResult?.streak ? ` · 🔥 ${runResult.streak}-day streak` : '';
    const message =
      `Wumpus Adventures · Daily ${dailyDate}
` +
      `Level ${state.level} · ${state.score.toLocaleString()} pts · ${state.totalCoins} 💎${streakText}
` +
      `Same cave for everyone today. Can you beat me?`;
    analytics.track('daily_shared', { score: state.score });
    try {
      await Share.share({ message });
    } catch (e) {
      console.warn('[GameScreen] share error:', e);
    }
  }, [dailyDate, runResult, state.level, state.score, state.totalCoins]);

  const handleMainMenu = useCallback(() => {
    setPaused(false);
    setKillPopups([]);
    setShowGameOver(false);
    emitSound('GAME_MUSIC_STOP'); // Force stop on exit
    navigation.navigate('CoverScreen');
  }, [navigation]);

  // ── Level Up & Transition ───────────────────────────────────────────────
  useEffect(() => {
    if (state.isLevelUp && !state.isVictory) {
      emitSound('LEVEL_UP');
      analytics.track('level_complete', { level: state.level, score: state.score, time: sessionTime });
      const diffLevel = getDifficulty(state.level);
      const remainingEnemies = state.entities.filter(e => e.type === 'enemy').length;
      const enemiesKilled = diffLevel.enemies - remainingEnemies;

      const timer = setTimeout(() => {
        navigation.navigate("LevelCompleteScreen", {
          characterIndex,
          score: state.score,
          level: state.level,
          coins: diffLevel.coins - state.coins,
          totalCoins: diffLevel.coins,
          sessionCoins: state.totalCoins,
          kills: enemiesKilled,
          totalEnemies: diffLevel.enemies,
          time: sessionTime, // Total run time
        });
        justLeveledUp.current = true;
        levelUp();
      }, 800);

      return () => clearTimeout(timer);
    }
  }, [state.isLevelUp, state.level, state.entities.length, sessionTime]);

  // ── Gameplay Feedback ─────────────────────────────────────────────────
  useEffect(() => {
    const collectingCoin  = state.coins < lastCoins.current;
    const isPhantomMove   = justLeveledUp.current;
    justLeveledUp.current = false;

    if (
      state.playerIndex !== lastPlayerIndex.current &&
      !state.isGameOver &&
      !state.isLevelUp &&
      !collectingCoin &&
      !isPhantomMove
    ) {
      emitSound('MOVE');
    }
    lastPlayerIndex.current = state.playerIndex;

    if (state.coins < lastCoins.current && !isResetting.current) {
      emitSound('COIN_COLLECTED');
      setKillPopups(prev => [...prev, { id: Date.now() + Math.random(), points: coinValue(state.level), type: 'coin' }]);
      
      const coinX = screenWidth / 2 - 16;
      const coinY = screenHeight / 2 - 16;
      setActiveCoins(prev => [...prev, { id: Date.now() + Math.random(), x: coinX, y: coinY }]);
    }
    lastCoins.current = state.coins;

    if (state.attack < lastAttack.current) {
      emitSound('ATTACK');
    }
    lastAttack.current = state.attack;

  }, [state.playerIndex, state.coins, state.attack, state.isGameOver, state.isLevelUp]);

  useEffect(() => {
    const currentEnemyCount = state.entities.filter(e => e.type === 'enemy').length;
    if (currentEnemyCount < lastEnemyCount.current && !isResetting.current) {
      emitSound('ENEMY_KILLED');
      setKillPopups(prev => [...prev, { id: Date.now() + Math.random(), points: killValue(state.enemyCombo), type: 'kill' }]);
      
      Animated.sequence([
        Animated.timing(combatFlash, { toValue: 0.35, duration: 25, useNativeDriver: true }),
        Animated.timing(combatFlash, { toValue: 0,    duration: 35, useNativeDriver: true }),
      ]).start();
    }
    lastEnemyCount.current = currentEnemyCount;
  }, [state.entities]);

  useProximityAudio(state);

  // The Wumpus lair announces itself.
  useEffect(() => {
    if (mode !== 'endless' && state.level === GAME_CONFIG.expedition.floors && state.turn === 0) {
      emitSound('BOSS_ROAR');
    }
  }, [state.level]);

  // Power-ups and traps: sound + floating label
  useEffect(() => {
    if (!state.lastPickup) return;
    const id = Date.now() + Math.random();
    if (state.lastPickup === 'trap') {
      emitSound('TRAP_TRIGGERED');
      setKillPopups(prev => [...prev, { id, points: GAME_CONFIG.scoring.trapPenalty, type: 'trap' }]);
    } else {
      emitSound('POWERUP');
      setKillPopups(prev => [
        ...prev,
        { id, points: state.lastPickup === 'ammo' ? GAME_CONFIG.pickups.ammoAmount : 0, type: state.lastPickup! },
      ]);
    }
  }, [state]);

  const nearby = getNearbyHazards(state.playerIndex, state.rows, state.cols, state.entityMap);

  const removeCoin = (id: number) => {
    setActiveCoins(prev => prev.filter(c => c.id !== id));
  };

  return (
    <ImageBackground
      source={require("../assets/sprites/backgrounds/Cover_Background.png")}
      style={styles.container}
      resizeMode="cover"
    >
      {/* Dark Overlay for Gameplay Clarity */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.55)' }]} />
      
      <StatusBar hidden />

      <View style={{ paddingTop: insets.top, zIndex: 10 }}>
        <ScoreBar
          score={state.score}
          coins={state.coins}
          attackValue={state.attack}
          shield={state.shield}
          onPause={canPauseRef.current ? () => setPaused(true) : undefined}
          level={state.level}
          floors={mode === 'endless' ? undefined : GAME_CONFIG.expedition.floors}
          character={selectedCharacter}
          time={sessionTime}
        />
      </View>

      <DangerVignette roar={nearby.enemy} vortex={nearby.pit} />

      <View style={[
        styles.gameContent, 
        { flexDirection: useSettingsStore.getState().controlPosition === 'left' ? 'row-reverse' : 'row' }
      ]}>
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
          lastKilledEnemyCount={state.entities.filter(e => e.type === 'enemy').length}
        />

        <View style={styles.controlsWrapper}>
          <Controls
            onMove={move}
            onAttack={attack}
          />
        </View>
      </View>

      {killPopups.map(p => (
        <ScorePopup
          key={p.id}
          points={p.points}
          type={p.type}
          onComplete={() => setKillPopups(prev => prev.filter(k => k.id !== p.id))}
        />
      ))}

      {activeCoins.map(c => (
        <CoinFlight 
          key={c.id} 
          startX={c.x} 
          startY={c.y} 
          onComplete={() => removeCoin(c.id)} 
        />
      ))}

      <Animated.View 
        style={[
          StyleSheet.absoluteFill, 
          { backgroundColor: '#FFF', opacity: combatFlash, zIndex: 999 }
        ]} 
        pointerEvents="none" 
      />

      {/* Purple flash on vortex teleport */}
      <Animated.View 
        style={[
          StyleSheet.absoluteFill, 
          { backgroundColor: 'rgba(156,39,176,0.55)', opacity: vortexFlash, zIndex: 998 }
        ]} 
        pointerEvents="none" 
      />

      <PauseOverlay
        visible={paused}
        onResume={() => setPaused(false)}
        onRestart={handleRetry}
        onMainMenu={handleMainMenu}
      />

      <HighScoreEntryModal
        visible={showHighScoreEntry}
        score={state.score}
        level={state.level}
        totalCoins={state.totalCoins}
        time={sessionTime}
        onSubmit={handleHighScoreSubmit}
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
        onShare={isDaily ? handleShare : undefined}
        onRetry={handleRetry}
        onMainMenu={handleMainMenu}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
  },
  controlsWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
