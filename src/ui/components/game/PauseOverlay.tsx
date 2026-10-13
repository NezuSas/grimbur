import React from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { overlayStyles } from './overlayStyles';

const { width: screenWidth } = Dimensions.get('window');

type Props = {
  visible: boolean;
  onResume: () => void;
  onRestart: () => void;
  onMainMenu: () => void;
};

const PauseOverlay = ({ visible, onResume, onRestart, onMainMenu }: Props) => {
  if (!visible) return null;

  return (
    <View style={overlayStyles.overlay}>
      <View style={styles.card}>
        <Text style={styles.title}>PAUSED</Text>

        <TouchableOpacity style={styles.resumeButton} onPress={onResume} activeOpacity={0.8}>
          <Text style={styles.resumeText}>▶  RESUME</Text>
        </TouchableOpacity>

        <View style={styles.row}>
          <TouchableOpacity style={styles.secondaryButton} onPress={onRestart} activeOpacity={0.8}>
            <Text style={styles.secondaryText}>🔄  RESTART</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={onMainMenu} activeOpacity={0.8}>
            <Text style={styles.secondaryText}>🏠  MENU</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default PauseOverlay;

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#4FC3F7',
    paddingHorizontal: 24,
    paddingVertical: 20,
    alignItems: 'center',
    width: Math.min(screenWidth * 0.7, 320),
    gap: 12,
  },
  title: {
    color: '#4FC3F7',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 3,
  },
  resumeButton: {
    width: '100%',
    backgroundColor: '#FFD700',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'rgba(0,0,0,0.2)',
  },
  resumeText: { color: '#000', fontWeight: '900', fontSize: 16, letterSpacing: 1 },
  row: { flexDirection: 'row', gap: 10, width: '100%' },
  secondaryButton: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  secondaryText: { color: '#fff', fontWeight: '900', fontSize: 13, letterSpacing: 1 },
});
