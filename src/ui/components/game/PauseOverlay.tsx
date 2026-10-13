import React from 'react';
import { StyleSheet, TouchableOpacity, View, useWindowDimensions } from "react-native";
import Text from "../Text";

import OverlayContainer from './OverlayContainer';
import { MIN_TOUCH } from '../../layout/useGameLayout';
import { useT } from '../../../i18n/useT';

type Props = {
  visible: boolean;
  onResume: () => void;
  onRestart: () => void;
  onMainMenu: () => void;
};

const PauseOverlay = ({ visible, onResume, onRestart, onMainMenu }: Props) => {
  const { t } = useT();
  const { width } = useWindowDimensions();

  if (!visible) return null;

  return (
    <OverlayContainer>
      <View style={[styles.card, { width: Math.min(width * 0.8, 340) }]}>
        <Text style={styles.title} accessibilityRole="header" maxFontSizeMultiplier={1.3}>
          {t('pause.title').toLocaleUpperCase()}
        </Text>

        <TouchableOpacity
          style={styles.resumeButton}
          onPress={onResume}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={t('pause.resume')}
        >
          <Text style={styles.resumeText} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.3}>
            ▶  {t('pause.resume').toLocaleUpperCase()}
          </Text>
        </TouchableOpacity>

        <View style={styles.row}>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={onRestart}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={t('pause.restart')}
          >
            <Text style={styles.secondaryText} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.3}>
              🔄  {t('pause.restart').toLocaleUpperCase()}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={onMainMenu}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={t('pause.menu')}
          >
            <Text style={styles.secondaryText} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.3}>
              🏠  {t('pause.menu').toLocaleUpperCase()}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </OverlayContainer>
  );
};

export default PauseOverlay;

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#4FC3F7',
    paddingHorizontal: 20,
    paddingVertical: 16,
    alignItems: 'center',
    gap: 12,
  },
  title: { color: '#4FC3F7', fontSize: 20, fontWeight: '900', letterSpacing: 3 },
  resumeButton: {
    width: '100%',
    minHeight: MIN_TOUCH,
    backgroundColor: '#FFD700',
    borderRadius: 14,
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'rgba(0,0,0,0.2)',
  },
  resumeText: { color: '#000', fontWeight: '900', fontSize: 16, letterSpacing: 1 },
  row: { flexDirection: 'row', gap: 10, width: '100%' },
  secondaryButton: {
    flex: 1,
    minHeight: MIN_TOUCH,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  secondaryText: { color: '#fff', fontWeight: '900', fontSize: 13, letterSpacing: 1 },
});
