import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import SpriteImage from "./SpriteImage";

type Props = {
  /** 0..1: how much of the start-up work is done. Without it the screen only shows the title. */
  progress?: number;
  /** Short line under the bar ("Loading the cave..."). */
  label?: string;
};

/** Same colour and same logo size as the native splash (app.json, expo-splash-screen: 288 dp canvas, monster 64% of it, so the system circle does not crop it), so that the one gives way to the other unseen. */
export const SPLASH_BACKGROUND = '#0E0B1F';
export const SPLASH_LOGO_SIZE = 200;

/**
 * Startup screen drawn from the game's own assets. The logo sits exactly where the native splash draws it and the title and the bar
 * come in below it, so nothing jumps when the system splash disappears. While the game loads every picture and sound before the
 * first screen, the bar fills so the wait reads as progress, not as a hang.
 */
const LoadingScreen = ({ progress, label }: Props) => {
  const { width, height } = useWindowDimensions();
  const title = Math.max(16, Math.min(height * 0.06, width * 0.035, 28));
  const barWidth = Math.max(160, Math.min(width * 0.4, 320));
  const pct = progress === undefined ? 0 : Math.max(0, Math.min(1, progress));
  // The logo breathes very gently; the text below fades in after the first frame.
  const breath = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 500, delay: 150, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breath, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(breath, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [breath, fade]);

  const logo = Math.min(SPLASH_LOGO_SIZE, height * 0.55);
  const below = height / 2 + logo / 2 + 10;

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.logo, { width: logo, height: logo, marginLeft: -logo / 2, marginTop: -logo / 2, transform: [{ scale: breath.interpolate({ inputRange: [0, 1], outputRange: [1, 1.035] }) }] }]}>
        <SpriteImage source={require('../../../assets/splash.png')} style={{ width: logo, height: logo }} resizeMode="contain" accessibilityIgnoresInvertColors />
      </Animated.View>
      <Animated.View style={[styles.below, { top: below, opacity: fade }]}>
        <Text style={[styles.title, { fontSize: title }]} allowFontScaling={false}>
          WUMPUS ADVENTURES
        </Text>
        {progress !== undefined ? (
          <View style={styles.progressBox} accessible accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(pct * 100) }}>
            <View style={[styles.track, { width: barWidth }]}>
              <View style={[styles.fill, { width: `${Math.round(pct * 100)}%` }]} />
            </View>
            {label ? (
              <Text style={styles.label} allowFontScaling={false}>
                {label}
              </Text>
            ) : null}
          </View>
        ) : null}
      </Animated.View>
    </View>
  );
};

export default LoadingScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SPLASH_BACKGROUND },
  logo: { position: 'absolute', left: '50%', top: '50%' },
  below: { position: 'absolute', left: 0, right: 0, alignItems: 'center', gap: 10 },
  title: { color: '#FFD54F', fontWeight: '900', letterSpacing: 3, textAlign: 'center' },
  progressBox: { alignItems: 'center', gap: 8 },
  track: { height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.14)', overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3, backgroundColor: '#FFD54F' },
  label: { color: '#bdb7d8', fontSize: 12, letterSpacing: 1 },
});
