import React from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import SpriteImage from "./SpriteImage";

type Props = {
  /** 0..1: how much of the start-up work is done. Without it the screen only shows the title. */
  progress?: number;
  /** Short line under the bar ("Loading the cave..."). */
  label?: string;
};

/**
 * Startup screen drawn entirely from the game's own assets, so it adapts to any window size. While the game loads
 * every picture and sound before the first screen, the bar fills so the wait reads as progress, not as a hang.
 */
const LoadingScreen = ({ progress, label }: Props) => {
  const { width, height } = useWindowDimensions();
  const gem = Math.max(48, Math.min(height * 0.3, width * 0.2, 150));
  const title = Math.max(18, Math.min(height * 0.09, width * 0.045, 40));
  const barWidth = Math.max(160, Math.min(width * 0.45, 360));
  const pct = progress === undefined ? 0 : Math.max(0, Math.min(1, progress));

  return (
    <View style={styles.container}>
      <SpriteImage
        source={require('../../assets/sprites/items/Icon_Gem.png')}
        style={{ width: gem, height: gem }}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
      />
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
    </View>
  );
};

export default LoadingScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  title: {
    color: '#FFD700',
    fontWeight: '900',
    letterSpacing: 3,
    textAlign: 'center',
  },
  progressBox: { marginTop: 14, alignItems: 'center', gap: 8 },
  track: { height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.14)', overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4, backgroundColor: '#FFD700' },
  label: { color: '#bdb7d8', fontSize: 12, letterSpacing: 1 },
});
