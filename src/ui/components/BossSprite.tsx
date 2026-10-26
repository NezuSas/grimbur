import React, { memo, useEffect, useRef, useState } from "react";
import { Animated, StyleProp, ViewStyle } from "react-native";
import SpriteImage from "./SpriteImage";

/** The four frames of the Grimbur, cut from one sheet so they share scale and baseline (scripts/sliceBossSheet.py). */
export const BOSS_FRAMES = {
  idle: require("../../assets/sprites/enemies/Grimbur_Boss.png"),
  breathe: require("../../assets/sprites/enemies/Grimbur_Boss_Breathe.png"),
  attack: require("../../assets/sprites/enemies/Grimbur_Boss_Attack.png"),
  hurt: require("../../assets/sprites/enemies/Grimbur_Boss_Hurt.png"),
} as const;

const BREATH_MS = 850;
const HURT_MS = 600;

/**
 * The Grimbur alive on the board: it breathes while it waits, roars with raised claws while its attack
 * winds up, and flinches (with a squash the spring undoes) when an arrow lands. Purely visual: the real
 * danger signals (aura, "!" mark) stay, this only makes them felt.
 */
export default memo(function BossSprite({ hp, charged, style }: { hp: number; charged: boolean; style?: StyleProp<ViewStyle> }) {
  const [breathIn, setBreathIn] = useState(false);
  const [hurt, setHurt] = useState(false);
  const prevHp = useRef(hp);
  const squash = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const id = setInterval(() => setBreathIn(b => !b), BREATH_MS);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (hp < prevHp.current) {
      setHurt(true);
      squash.setValue(0.82);
      Animated.spring(squash, { toValue: 1, friction: 4, useNativeDriver: true }).start();
      const id = setTimeout(() => setHurt(false), HURT_MS);
      prevHp.current = hp;
      return () => clearTimeout(id);
    }
    prevHp.current = hp;
  }, [hp, squash]);

  const source = hurt ? BOSS_FRAMES.hurt : charged ? BOSS_FRAMES.attack : breathIn ? BOSS_FRAMES.breathe : BOSS_FRAMES.idle;
  return (
    <Animated.View style={[style, { transform: [{ scaleY: squash }] }]} pointerEvents="none">
      <SpriteImage style={{ width: "100%", height: "100%" }} source={source} resizeMode="contain" />
    </Animated.View>
  );
});
