import { StyleSheet } from 'react-native';

/** Full-screen dimmed backdrop shared by the game-over and high-score overlays. */
export const overlayStyles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
});
