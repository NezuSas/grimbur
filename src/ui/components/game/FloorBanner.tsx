import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Text from "../Text";

type Props = {
  /** Changes whenever a new floor starts; replays the banner. */
  floorKey: string;
  title: string;
  /** Omen name and rule, when the floor has one. */
  omenName?: string;
  omenRule?: string;
  /** A line of the story that goes with the floor (a new cave, the lair), in italics under the rule. */
  story?: string;
  /** Skip the animation (reduce flashes setting). */
  calm?: boolean;
  /** Keep the banner up longer (the lair explains its goal). */
  long?: boolean;
  /** Fade out right away (the player has started moving). */
  dismiss?: boolean;
  /** Lowest the banner may start (just under the HUD); it sits at 14% of the window otherwise. */
  minTop?: number;
};

/** Brief "Floor N" announcement that also names the floor's omen. Never blocks touches. */
const FloorBanner: React.FC<Props> = ({ floorKey, title, omenName, omenRule, story, calm, long, dismiss, minTop = 0 }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const lift = useRef(new Animated.Value(calm ? 0 : 12)).current;
  const { height: windowHeight } = useWindowDimensions();

  useEffect(() => {
    opacity.setValue(0);
    lift.setValue(calm ? 0 : 12);
    const hold = long ? 4200 : story ? 2600 : omenName ? 1400 : 1100;
    const run = Animated.sequence([
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.timing(lift, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]),
      Animated.delay(hold),
      Animated.timing(opacity, { toValue: 0, duration: 320, useNativeDriver: true }),
    ]);
    run.start();
    return () => run.stop();
  }, [floorKey, omenName, story, calm, long, opacity, lift]);

  // Once the player moves, the banner has done its job and stops covering the board.
  useEffect(() => {
    if (!dismiss) return;
    const fade = Animated.timing(opacity, { toValue: 0, duration: 160, useNativeDriver: true });
    fade.start();
    return () => fade.stop();
  }, [dismiss, opacity]);

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      style={[styles.wrap, minTop > 0 && { top: Math.max(minTop, windowHeight * 0.14) }, { opacity, transform: [{ translateY: lift }] }]}
    >
      <LinearGradient colors={['rgba(43,32,80,0.96)', 'rgba(18,12,38,0.96)']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.card}>
        <View style={styles.titleRow}>
          <Text style={styles.diamond}>◆</Text>
          <Text style={styles.title} maxFontSizeMultiplier={1.2}>
            {title.toLocaleUpperCase()}
          </Text>
          <Text style={styles.diamond}>◆</Text>
        </View>
        {omenName ? (
          <>
            <Text style={styles.omen} maxFontSizeMultiplier={1.2}>
              {omenName.toLocaleUpperCase()}
            </Text>
            {omenRule ? (
              <Text style={styles.rule} maxFontSizeMultiplier={1.2}>
                {omenRule}
              </Text>
            ) : null}
          </>
        ) : null}
        {story ? (
          <Text style={styles.story} maxFontSizeMultiplier={1.2}>
            {story}
          </Text>
        ) : null}
      </LinearGradient>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: '14%',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 40,
  },
  card: {
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'rgba(255,213,79,0.7)',
    paddingHorizontal: 24,
    paddingVertical: 9,
    alignItems: 'center',
    maxWidth: '80%',
    overflow: 'hidden',
    shadowColor: '#FFD54F',
    shadowOpacity: 0.45,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  diamond: { color: '#FFD54F', fontSize: 9 },
  title: { color: '#fff', fontWeight: '900', fontSize: 19, letterSpacing: 4, textShadowColor: 'rgba(255,213,79,0.6)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 8 },
  omen: { color: '#FFD54F', fontWeight: '900', fontSize: 13, letterSpacing: 2, marginTop: 2 },
  story: { color: '#cdb8ff', fontSize: 12.5, fontStyle: 'italic', textAlign: 'center', marginTop: 5 },
  rule: { color: '#e0e0e0', fontSize: 12, textAlign: 'center', marginTop: 1 },
});

export default FloorBanner;
