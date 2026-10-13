import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

type Props = {
  /** Changes whenever a new floor starts; replays the banner. */
  floorKey: string;
  title: string;
  /** Omen name and rule, when the floor has one. */
  omenName?: string;
  omenRule?: string;
  /** Skip the animation (reduce flashes setting). */
  calm?: boolean;
  /** Keep the banner up longer (the lair explains its goal). */
  long?: boolean;
  /** Fade out right away (the player has started moving). */
  dismiss?: boolean;
};

/** Brief "Floor N" announcement that also names the floor's omen. Never blocks touches. */
const FloorBanner: React.FC<Props> = ({ floorKey, title, omenName, omenRule, calm, long, dismiss }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const lift = useRef(new Animated.Value(calm ? 0 : 12)).current;

  useEffect(() => {
    opacity.setValue(0);
    lift.setValue(calm ? 0 : 12);
    const hold = long ? 4200 : omenName ? 2100 : 1100;
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
  }, [floorKey, omenName, calm, long, opacity, lift]);

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
      style={[styles.wrap, { opacity, transform: [{ translateY: lift }] }]}
    >
      <View style={styles.card}>
        <Text style={styles.title} maxFontSizeMultiplier={1.2}>
          {title.toLocaleUpperCase()}
        </Text>
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
      </View>
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
    backgroundColor: 'rgba(0,0,0,0.72)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 22,
    paddingVertical: 8,
    alignItems: 'center',
    maxWidth: '80%',
  },
  title: { color: '#fff', fontWeight: '900', fontSize: 18, letterSpacing: 4 },
  omen: { color: '#FFD54F', fontWeight: '900', fontSize: 13, letterSpacing: 2, marginTop: 2 },
  rule: { color: '#e0e0e0', fontSize: 12, textAlign: 'center', marginTop: 1 },
});

export default FloorBanner;
