import React, { useRef, memo } from "react";
import { View, Text, Pressable, StyleSheet, Animated, Easing, Platform } from "react-native";
import { useGameLayout } from "../layout/useGameLayout";
import { Direction } from "../../core/engine/types";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

type Props = {
  onMove: (direction: Direction) => void;
  onAttack: () => void;
};

const DirectionPad: React.FC<Props> = memo(({ onMove, onAttack }) => {
  const { spacing } = useGameLayout();
  
  // Uniform button size based on screen ratio (approx 60-70px)
  const buttonSize = 64; 
  const buttonGaps = spacing(12);

  const createAnim = () => useRef(new Animated.Value(1)).current;
  const anims = {
    UP: createAnim(),
    DOWN: createAnim(),
    LEFT: createAnim(),
    RIGHT: createAnim(),
    ATTACK: createAnim(),
  };

  const animateScale = (anim: Animated.Value, toValue: number) => {
    Animated.timing(anim, {
      toValue,
      duration: 100,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const NavButton = ({ direction, icon }: { direction: Direction, icon: keyof typeof Ionicons.glyphMap }) => (
    <Animated.View style={{ transform: [{ scale: anims[direction] }] }}>
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onMove(direction);
        }}
        onPressIn={() => animateScale(anims[direction], 0.90)}
        onPressOut={() => animateScale(anims[direction], 1)}
        style={({ pressed }) => [
          styles.buttonWrapper,
          { width: buttonSize, height: buttonSize, borderRadius: buttonSize / 2 },
          pressed && styles.buttonPressed
        ]}
      >
        <LinearGradient
          colors={['#4a4a4a', '#2a2a2a']}
          style={[styles.gradient, { borderRadius: buttonSize / 2 }]}
        >
          <View style={styles.innerBevel}>
             <Ionicons name={icon} size={32} color="#E0E0E0" />
          </View>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );

  return (
    <View style={[styles.container, { padding: spacing(20) }]}>
      {/* Row 1: UP */}
      <View style={[styles.row, { marginBottom: buttonGaps }]}>
        <NavButton direction="UP" icon="caret-up" />
      </View>

      {/* Row 2: LEFT - ATTACK - RIGHT */}
      <View style={[styles.row, { marginBottom: buttonGaps }]}>
        <NavButton direction="LEFT" icon="caret-back" />
        
        <View style={{ marginHorizontal: buttonGaps * 1.5 }}>
          <Animated.View style={{ transform: [{ scale: anims.ATTACK }] }}>
            <Pressable
              onPress={() => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                onAttack();
              }}
              onPressIn={() => animateScale(anims.ATTACK, 0.88)}
              onPressOut={() => animateScale(anims.ATTACK, 1)}
              style={({ pressed }) => [
                styles.attackButtonWrapper,
                { width: buttonSize * 1.1, height: buttonSize * 1.1, borderRadius: (buttonSize * 1.1) / 2 },
                pressed && styles.attackButtonPressed
              ]}
            >
              <LinearGradient
                colors={['#FF4B2B', '#FF416C']}
                style={[styles.gradient, { borderRadius: (buttonSize * 1.1) / 2 }]}
              >
                <View style={styles.attackInnerBevel}>
                   <Ionicons name="flash" size={34} color="#FFF" />
                </View>
              </LinearGradient>
            </Pressable>
          </Animated.View>
        </View>

        <NavButton direction="RIGHT" icon="caret-forward" />
      </View>

      {/* Row 3: DOWN */}
      <View style={styles.row}>
        <NavButton direction="DOWN" icon="caret-down" />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonWrapper: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.15)",
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4 },
      android: { elevation: 6 }
    })
  },
  buttonPressed: {
    borderColor: "#FFD700",
  },
  gradient: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  innerBevel: {
    width: '90%',
    height: '90%',
    borderRadius: 100,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  attackButtonWrapper: {
    backgroundColor: "transparent",
    borderWidth: 3,
    borderColor: "rgba(255, 255, 255, 0.3)",
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: "#FF4B2B", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.6, shadowRadius: 10 },
      android: { elevation: 12 }
    })
  },
  attackButtonPressed: {
    borderColor: "#FFF",
    shadowOpacity: 0.9,
    shadowRadius: 15,
  },
  attackInnerBevel: {
    width: '85%',
    height: '85%',
    borderRadius: 100,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
});

export default DirectionPad;
