import { useCallback, useEffect, useRef, useState } from "react";
import { Animated } from "react-native";
import type { MutableRefObject } from "react";
import { emitSound } from "../../audio/audioEventBus";
import { analytics } from "../../services/analytics";
import { addHighscore, isTopTenScore } from "../../services/highscores";
import { recordDailyRun, recordRun } from "../../services/localStats";
import type { GameState } from "../../core/engine/types";
import type { GameMode } from "../../core/engine/seed";
import { dailyRunResult, runResultOf } from "./runResult";
import { GAME_OVER_CARD_DELAY_MS, RECORD_AFTER_STRIKE_MS, TOP_TEN_CHECK_TIMEOUT_MS } from "./types";
import type { RunResult } from "./types";

type Params = {
  stateRef: MutableRefObject<GameState>;
  /** The run is over (the hero died or the Wumpus fell). */
  runEnded: boolean;
  characterIndex: number;
  ascension: number;
  mode: GameMode;
  isDaily: boolean;
  dailyDate: string;
  /** Relics a Forge upgrade starts the run with: they are not counted as picked. */
  startRelics: number;
  /** The seconds played, read when it is needed. */
  sessionTimeRef: { readonly current: number };
  /** The red edges on a death. */
  deathFlash: Animated.Value;
  reduceFlash: boolean;
};

/**
 * The end of a run: saving it once to the local stats, the result the card shows, the card itself and the high-score entry. It
 * keeps the guards that make each of those happen exactly once (a retry, leaving the screen and the card may all try to save).
 */
export function useRunRecord({ stateRef, runEnded, characterIndex, ascension, mode, isDaily, dailyDate, startRelics, sessionTimeRef, deathFlash, reduceFlash }: Params) {
  const [runResult, setRunResult] = useState<RunResult | null>(null);
  const [showGameOver, setShowGameOver] = useState(false);
  const [showHighScoreEntry, setShowHighScoreEntry] = useState(false);
  const gameOverTriggered = useRef(false); // prevents the end-of-run flow from running twice
  const runRecorded = useRef(false); //       the run is saved to local stats exactly once
  const mounted = useRef(true);

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
      relics: Math.max(0, s.relics.length - (startRelics)),
      time: sessionTimeRef.current,
      heroIndex: characterIndex,
      ascension,
      mode,
    };
    try {
      if (isDaily) {
        const r = await recordDailyRun(run, dailyDate);
        return dailyRunResult(r);
      }
      const r = await recordRun(run);
      return runResultOf(r, mode);
    } catch (e) {
      console.warn("[GameScreen] recording the run failed:", e);
      runRecorded.current = false; // nothing was saved: the retry, the unmount or the card may try again
      return null;
    }
  }, [isDaily, dailyDate, characterIndex, ascension, mode, startRelics, sessionTimeRef, stateRef]);

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


  /** A new run (retry): the guards open again and the old result goes away. */
  const rearm = useCallback(() => {
    runRecorded.current = false;
    gameOverTriggered.current = false;
    setRunResult(null);
    setShowGameOver(false);
    setShowHighScoreEntry(false);
  }, []);

  return { runResult, setRunResult, showGameOver, setShowGameOver, showHighScoreEntry, setShowHighScoreEntry, recordCurrentRun, handleHighScoreSubmit, rearm, runRecorded, mounted };
}
