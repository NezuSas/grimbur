import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, StyleSheet, View } from "react-native";
import Text from "../Text";
import SpriteImage from '../SpriteImage';
import { useT } from '../../../i18n/useT';

type Props = {
  /** While true the cover is fully opaque; when it turns false it fades out and unmounts. */
  visible: boolean;
};

/**
 * Opaque cover shown while a run is being created and the first board's illustrations are drawn, so the player
 * never sees an empty or half-painted board. Never intercepts touches once it is fading out.
 */
const RunLoadingCover: React.FC<Props> = ({ visible }) => {
  const { t } = useT();
  const opacity = useRef(new Animated.Value(1)).current;
  const [mounted, setMounted] = useState(true);

  useEffect(() => {
    if (visible) {
      opacity.setValue(1);
      setMounted(true);
      return;
    }
    const fade = Animated.timing(opacity, { toValue: 0, duration: 260, useNativeDriver: true });
    fade.start(({ finished }) => {
      if (finished) setMounted(false);
    });
    return () => fade.stop();
  }, [visible, opacity]);

  if (!mounted) return null;
  return (
    <Animated.View
      style={[styles.cover, { opacity }]}
      pointerEvents={visible ? 'auto' : 'none'}
      accessibilityLiveRegion="polite"
      accessibilityLabel={t('loading.cave')}
    >
      <View style={styles.center}>
        <SpriteImage source={require('../../../assets/sprites/items/Icon_Gem.png')} style={styles.gem} resizeMode="contain" />
        <ActivityIndicator size="large" color="#FFD54F" />
        <Text style={styles.text} allowFontScaling={false}>
          {t('loading.cave')}
        </Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  cover: { ...StyleSheet.absoluteFill, backgroundColor: '#0E0B1F', zIndex: 2000, elevation: 2000 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  gem: { width: 72, height: 72 },
  text: { color: '#d0c8f0', fontWeight: '800', letterSpacing: 2, fontSize: 13 },
});

export default RunLoadingCover;
