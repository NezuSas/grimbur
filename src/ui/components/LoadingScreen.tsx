import React from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

/**
 * Startup screen drawn entirely from the game's own assets, so it adapts to any window size.
 */
const LoadingScreen = () => {
  const { width, height } = useWindowDimensions();
  const gem = Math.max(48, Math.min(height * 0.32, width * 0.2, 160));
  const title = Math.max(18, Math.min(height * 0.09, width * 0.045, 40));

  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/sprites/items/Icon_Gem.png')}
        style={{ width: gem, height: gem }}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
      />
      <Text style={[styles.title, { fontSize: title }]} allowFontScaling={false}>
        WUMPUS ADVENTURES
      </Text>
      <ActivityIndicator size="large" color="#FFD700" style={styles.spinner} />
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
  spinner: { marginTop: 12 },
});
