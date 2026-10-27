import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, View, useWindowDimensions } from "react-native";
import type { ComponentRef, MutableRefObject } from "react";
import { emitSound } from "../../audio/audioEventBus";
import { recordLatency } from "../../audio/audioDiagnostics";
import { haptic, ImpactFeedbackStyle, NotificationFeedbackType } from "../../shared/haptics";
import { diffFeedback } from "../../core/feedback/diffFeedback";
import { addGem, comboLook, comboRate, EMPTY_STREAK, gemPopScale, gemRate, gemStreakLabel } from "../../core/feedback/combo";
import { tileCenter } from "../../core/feedback/geometry";
import { coinReward, killValue } from "../../core/engine/scoring";
import { omenEffects } from "../../core/engine/omens";
import { relicCount } from "../../core/engine/relics";
import type { GameState } from "../../core/engine/types";
import { GAME_CONFIG } from "../../config/gameConfig";
import { useGameLayout } from "../../ui/layout/useGameLayout";
import type { Popup } from "./types";

type Params = {
  state: GameState;
  stateRef: MutableRefObject<GameState>;
  /** The step sound of a tap is played at input time; the time of the last one, so the state change does not repeat it. */
  stepSoundedAt: MutableRefObject<number>;
  reduceFlash: boolean;
  /** The opaque cover over the board: the board is measured again when it goes away. */
  bootCover: boolean;
};

/**
 * Everything the player sees, hears or feels after a move, derived from the DIFFERENCE between two states (see
 * core/feedback/diffFeedback.ts): so each event fires exactly once, and buying, the detector or undo never replay an old
 * pickup. It owns the floating scores, the flying gems, the screen flashes and the board's anchor for them.
 */
export function useGameFeedback({ state, stateRef, stepSoundedAt, reduceFlash, bootCover }: Params) {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [activeCoins, setActiveCoins] = useState<{ id: number; x: number; y: number }[]>([]);
  const [popups, setPopups] = useState<Popup[]>([]);
  // Feedback that is only seen: the shield blink, a hard shake and the gem streak pop.
  const [shieldBreakKey, setShieldBreakKey] = useState(0);
  const [shakeKey, setShakeKey] = useState(0);
  const [gemPop, setGemPop] = useState(1.15);
  const gemStreak = useRef(EMPTY_STREAK);
  const combatFlash = useRef(new Animated.Value(0)).current;
  const vortexFlash = useRef(new Animated.Value(0)).current;
  const hitFlash = useRef(new Animated.Value(0)).current;
  const prevFeedback = useRef(state);
  const boardOrigin = useRef<{ x: number; y: number } | null>(null);
  const boardBox = useRef<ComponentRef<typeof View>>(null);
  /** Set while a retry restarts the run: the jump from the old board to the new one must not play any feedback. */
  const isResetting = useRef(false);

  // ── Vortex teleport flash ────────────────────────────────────────────────
  useEffect(() => {
    if (!state.wasTeleported) return;
    emitSound("VORTEX_TELEPORT");
    const peak = reduceFlash ? 0.2 : 1;
    Animated.sequence([
      Animated.timing(vortexFlash, { toValue: peak, duration: reduceFlash ? 250 : 120, useNativeDriver: true }),
      Animated.timing(vortexFlash, { toValue: 0, duration: 350, useNativeDriver: true }),
    ]).start();
  }, [state.wasTeleported, state.playerIndex]); // eslint-disable-line react-hooks/exhaustive-deps

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
          // The gem flies to the HUD counter (which ticks when it lands); when calm, the counter simply changes.
          if (reduceFlash) break;
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


  const removeCoin = useCallback((id: number) => setActiveCoins(prev => prev.filter(c => c.id !== id)), []);
  const removePopup = useCallback((id: number) => setPopups(prev => prev.filter(p => p.id !== id)), []);
  const clearPopups = useCallback(() => setPopups([]), []);
  /** A new run starts the gem streak again. */
  const resetStreak = useCallback(() => {
    gemStreak.current = EMPTY_STREAK;
  }, []);

  return { popups, activeCoins, removeCoin, removePopup, clearPopups, resetStreak, gemPop, shieldBreakKey, shakeKey, combatFlash, vortexFlash, hitFlash, boardBox, measureBoard, isResetting };
}
