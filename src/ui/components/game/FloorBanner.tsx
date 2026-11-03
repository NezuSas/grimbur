import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from "react-native";
import { useWindowDimensions } from "../../layout/scaledWindow";
import { LinearGradient } from "expo-linear-gradient";
import Text from "../Text";
import SpriteImage from "../SpriteImage";
import type { ImageSourcePropType } from "react-native";

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
  /** Called once the banner has gone (shown in full, or dismissed). */
  onDone?: () => void;
  /** Who waits in the fog of this floor: each kind of creature with how many there are. */
  roster?: { key: string; art: ImageSourcePropType; count: number; label: string }[];
  /** Development only: the banner stays up (for screenshots). */
  hold?: boolean;
};

/** Brief "Floor N" announcement that also names the floor's omen. Never blocks touches. */
const FloorBanner: React.FC<Props> = ({ floorKey, title, omenName, omenRule, story, calm, long, dismiss, minTop = 0, roster, onDone, hold = false }) => {
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  const opacity = useRef(new Animated.Value(0)).current;
  const lift = useRef(new Animated.Value(calm ? 0 : 12)).current;
  const { height: windowHeight } = useWindowDimensions();

  useEffect(() => {
    opacity.setValue(0);
    lift.setValue(calm ? 0 : 12);
    const holdMs = (long ? 4200 : story ? 2600 : omenName ? 1400 : 1100) + (roster && roster.length > 0 ? 900 : 0);
    const run = Animated.sequence([
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.timing(lift, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]),
      Animated.delay(holdMs),
      ...(hold ? [] : [Animated.timing(opacity, { toValue: 0, duration: 320, useNativeDriver: true })]),
    ]);
    run.start(({ finished }) => {
      if (finished) doneRef.current?.();
    });
    return () => run.stop();
  }, [floorKey, omenName, story, calm, long, opacity, lift]);

  // Once the player moves, the banner has done its job and stops covering the board.
  useEffect(() => {
    if (!dismiss) return;
    const fade = Animated.timing(opacity, { toValue: 0, duration: 160, useNativeDriver: true });
    fade.start(() => doneRef.current?.());
    return () => fade.stop();
  }, [dismiss, opacity]);

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      style={[styles.wrap, minTop > 0 && { top: Math.max(minTop, windowHeight * 0.14) }, { opacity, transform: [{ translateY: lift }] }]}
    >
      <LinearGradient colors={['rgba(73, 56, 39,0.96)', 'rgba(22, 14, 8,0.96)']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.card}>
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
        {roster && roster.length > 0 ? (
          <View style={styles.roster} accessible accessibilityLabel={roster.map(r => `${r.count} ${r.label}`).join(', ')}>
            {roster.map(r => (
              <View key={r.key} style={styles.rosterItem}>
                <SpriteImage source={r.art} style={styles.rosterArt} resizeMode="contain" />
                <Text style={styles.rosterCount} maxFontSizeMultiplier={1.1}>{`×${r.count}`}</Text>
              </View>
            ))}
          </View>
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
    borderColor: 'rgba(217, 180, 90,0.7)',
    paddingHorizontal: 24,
    paddingVertical: 9,
    alignItems: 'center',
    maxWidth: '80%',
    overflow: 'hidden',
    shadowColor: '#D9B45A',
    shadowOpacity: 0.45,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  diamond: { color: '#D9B45A', fontSize: 9 },
  title: { color: '#F3EADB', fontWeight: '900', fontSize: 19, letterSpacing: 4, textShadowColor: 'rgba(217, 180, 90,0.6)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 8 },
  omen: { color: '#D9B45A', fontWeight: '900', fontSize: 13, letterSpacing: 2, marginTop: 2 },
  story: { color: '#cdb8ff', fontSize: 12.5, fontStyle: 'italic', textAlign: 'center', marginTop: 5 },
  rule: { color: '#e0e0e0', fontSize: 12, textAlign: 'center', marginTop: 1 },
  roster: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 16, marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(217, 180, 90,0.25)' },
  rosterItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rosterArt: { width: 68, height: 68 },
  rosterCount: { color: '#EAD8A8', fontWeight: '900', fontSize: 26, textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
});

export default FloorBanner;
