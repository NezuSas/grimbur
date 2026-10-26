import React, { useEffect, useRef, useState } from 'react';
import { Animated } from "react-native";
import Text from "../Text";
import type { EntityType } from '../../../core/engine/types';

export const KILLERS: Partial<Record<EntityType, number>> = {
  enemy: require('../../../assets/sprites/enemies/Guardian_Enemy.png'),
  stalker: require('../../../assets/sprites/enemies/Stalker_Enemy.png'),
  sleeper: require('../../../assets/sprites/enemies/Sleeper_Enemy.png'),
  boss: require('../../../assets/sprites/enemies/Grimbur_Boss.png'),
  pit: require('../../../assets/sprites/tiles/Danger_Vortex.png'),
};

/** Counts a number up to its value (a small reward moment for the score). */
export function useCountUp(target: number, active: boolean, durationMs = 900, delayMs = 0): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!active) {
      setValue(0);
      return;
    }
    if (durationMs <= 0) {
      setValue(target);
      return;
    }
    const anim = new Animated.Value(0);
    const id = anim.addListener(({ value: v }) => setValue(Math.round(v)));
    // The card comes in first; counting starts once it has settled (it is a JS-driven animation: it must not compete with the entrance).
    const timer = setTimeout(() => {
      Animated.timing(anim, { toValue: target, duration: durationMs, useNativeDriver: false }).start(() => setValue(target));
    }, delayMs);
    return () => {
      clearTimeout(timer);
      anim.removeListener(id);
      anim.stopAnimation();
    };
  }, [target, active, durationMs, delayMs]);
  return value;
}

/**
 * The score, counting up. It lives in its own component so that each frame of the count re-renders only this number and not
 * the whole card (it used to re-render every row of the card ~60 times a second while the card was coming in).
 */
export const CountedScore = ({ score, active, calm, style }: { score: number; active: boolean; calm: boolean; style: React.ComponentProps<typeof Text>['style'] }) => {
  const shown = useCountUp(score, active, calm ? 0 : 800, 420);
  return (
    <Text style={style} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.2}>
      {shown.toLocaleString()}
    </Text>
  );
};

/** A block of the card that slides up and fades in after `delay` ms, so the rewards arrive one by one (instantly when calm). */
export const Reveal = ({ delay, calm, children }: { delay: number; calm: boolean; children: React.ReactNode }) => {
  const v = useRef(new Animated.Value(calm ? 1 : 0)).current;
  useEffect(() => {
    if (calm) {
      v.setValue(1);
      return;
    }
    Animated.timing(v, { toValue: 1, duration: 340, delay, useNativeDriver: true }).start();
  }, [calm, delay, v]);
  return <Animated.View style={{ opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }}>{children}</Animated.View>;
};
