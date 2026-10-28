import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import SpriteImage from "../SpriteImage";
import { Burst } from "../Burst";
import type { EntityType } from "../../../core/engine/types";

const ART: Partial<Record<EntityType, number>> = {
  enemy: require("../../../assets/sprites/enemies/Guardian_Enemy.png"),
  stalker: require("../../../assets/sprites/enemies/Stalker_Enemy.png"),
  sleeper: require("../../../assets/sprites/enemies/Sleeper_Enemy.png"),
  boss: require("../../../assets/sprites/enemies/Grimbur_Boss.png"),
};
const SPARK = require("../../../assets/sprites/items/Icon_Ember.png");

/** How long the Grimbur takes to come apart (the victory card waits for it). */
export const BOSS_FALL_MS = 1100;

type Props = {
  type: EntityType;
  x: number;
  y: number;
  tileSize: number;
  onDone: () => void;
};

/**
 * A foe struck by an arrow, played where it stood the moment the arrow arrives: a guardian puffs out (a quick swell and fade);
 * the Grimbur shudders, swells and crumbles into embers. Only mounted when motion is allowed (the board skips it when calm).
 */
const FallenFoe = ({ type, x, y, tileSize, onDone }: Props) => {
  const t = useRef(new Animated.Value(0)).current;
  const boss = type === "boss";
  useEffect(() => {
    const anim = boss
      ? Animated.timing(t, { toValue: 1, duration: BOSS_FALL_MS, easing: Easing.in(Easing.quad), useNativeDriver: true })
      : Animated.timing(t, { toValue: 1, duration: 280, easing: Easing.out(Easing.quad), useNativeDriver: true });
    anim.start(() => onDone());
    return () => anim.stop();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const art = ART[type];
  if (!art) return null;
  const shudder = boss
    ? t.interpolate({ inputRange: [0, 0.08, 0.16, 0.24, 0.32, 0.4, 1], outputRange: [0, -3, 3, -2, 2, 0, 0] })
    : 0;
  return (
    <View style={[styles.spot, { left: x, top: y, width: tileSize, height: tileSize }]} pointerEvents="none">
      <Animated.View
        style={{
          width: tileSize,
          height: tileSize,
          opacity: t.interpolate({ inputRange: boss ? [0, 0.45, 1] : [0, 1], outputRange: boss ? [1, 1, 0] : [1, 0] }),
          transform: [
            { translateX: shudder },
            { scale: t.interpolate({ inputRange: [0, 1], outputRange: boss ? [1, 1.45] : [1, 1.3] }) },
          ],
        }}
      >
        <SpriteImage source={art} style={{ width: tileSize, height: tileSize }} resizeMode="contain" />
      </Animated.View>
      {boss ? <Burst run={1} source={SPARK} spread={1.6} /> : null}
    </View>
  );
};

export default FallenFoe;

const styles = StyleSheet.create({
  spot: { position: "absolute", alignItems: "center", justifyContent: "center", zIndex: 9 },
});
