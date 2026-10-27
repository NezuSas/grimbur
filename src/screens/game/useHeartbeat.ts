import { useEffect, useRef } from "react";
import { Animated, Easing } from "react-native";

/** One heartbeat: how long a whole beat lasts, from two hazards on it gets quicker, never below 800 ms. */
export const beatCycleMs = (hazards: number) => Math.max(800, 1100 - 150 * Math.max(0, hazards - 1));

/**
 * A heart beating while the hero stands next to a hazard: 0 at rest, a strong beat to 1 and a softer second one
 * (lub-dub), then a pause. The same value drives the screen's glow and the clues on the board, so they beat together.
 * Still at 0 when there is no danger (the caller passes `active` false when calm).
 */
export function useHeartbeat(active: boolean, hazards: number) {
  const beat = useRef(new Animated.Value(0)).current;
  const cycle = beatCycleMs(hazards);
  useEffect(() => {
    if (!active) {
      Animated.timing(beat, { toValue: 0, duration: 200, useNativeDriver: true }).start();
      return;
    }
    const to = (toValue: number, duration: number) => Animated.timing(beat, { toValue, duration, easing: Easing.out(Easing.quad), useNativeDriver: true });
    const loop = Animated.loop(Animated.sequence([to(1, 90), to(0.3, 110), to(0.75, 90), to(0, 180), Animated.delay(cycle - 470)]));
    loop.start();
    return () => loop.stop();
  }, [active, cycle, beat]);
  return beat;
}
