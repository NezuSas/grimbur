import React, { useState } from 'react';
import { StyleSheet, View } from "react-native";
import PressScale from "./PressScale";
import Text from "./Text";
import { Ionicons } from '@expo/vector-icons';
import { MIN_TOUCH, useGameLayout } from '../layout/useGameLayout';
import { useT } from '../../i18n/useT';

type Props = {
  title: string;
  /** A small line under the title. */
  subtitle?: string;
  /** Anything to show on the right (a balance, a counter). */
  right?: React.ReactNode;
  onBack: () => void;
};

/** The header every menu screen shares: back button, centred title with a gold underline, optional right slot. */
const ScreenHeader: React.FC<Props> = ({ title, subtitle, right, onBack }) => {
  const { t } = useT();
  const { fontSize } = useGameLayout();
  // The screens wrap this header in a SafeAreaView, which already pads the notch: only a small margin is left.
  const side = 12;
  // The title keeps clear of the back button and of whatever the right slot holds (a wide balance chip must not cover it).
  const [rightWidth, setRightWidth] = useState(0);
  const sidePad = Math.max(MIN_TOUCH + 24, rightWidth + side + 12);

  return (
    <View style={styles.bar}>
      <PressScale
        style={[styles.back, { left: side }]}
        onPress={onBack}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={t('a11y.back')}
      >
        <Ionicons name="arrow-back" size={24} color="#fff" />
      </PressScale>

      <View style={[styles.center, { paddingHorizontal: sidePad }]}>
        <Text style={[styles.title, { fontSize: Math.min(fontSize(26), 30) }]} accessibilityRole="header" numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.3}>
          {title.toLocaleUpperCase()}
        </Text>
        <View style={styles.underline} />
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={2} maxFontSizeMultiplier={1.2}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {right ? <View style={[styles.right, { right: side }]} onLayout={e => setRightWidth(e.nativeEvent.layout.width)}>{right}</View> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  bar: {
    alignSelf: 'stretch',
    width: '100%',
    minHeight: MIN_TOUCH + 18,
    justifyContent: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(8, 6, 20, 0.6)',
  },
  back: {
    position: 'absolute',
    width: MIN_TOUCH,
    height: MIN_TOUCH,
    borderRadius: MIN_TOUCH / 2,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  center: { alignItems: 'center' },
  title: { color: '#fff', fontWeight: '900', letterSpacing: 4, textAlign: 'center' },
  underline: { height: 3, width: 44, borderRadius: 2, backgroundColor: '#FFD54F', marginTop: 4 },
  subtitle: { color: '#E1D4C8', fontSize: 12, fontWeight: '700', marginTop: 4, textAlign: 'center' },
  right: { position: 'absolute', zIndex: 2 },
});

export default ScreenHeader;
