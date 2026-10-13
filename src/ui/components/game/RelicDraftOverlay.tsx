import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';

import { RELICS, RelicId } from '../../../core/engine/relics';
import OverlayContainer from './OverlayContainer';
import { useT } from '../../../i18n/useT';
import { relicText } from '../../../i18n/keys';

type Props = {
  /** Relics on offer; the overlay is hidden when null. */
  offer: RelicId[] | null;
  /** The floor the player is about to enter. */
  floor: number;
  onPick: (id: RelicId) => void;
};

const RelicDraftOverlay = ({ offer, floor, onPick }: Props) => {
  const { t } = useT();
  const { width } = useWindowDimensions();
  const pop = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    if (!offer) {
      pop.setValue(0.9);
      return;
    }
    Animated.spring(pop, { toValue: 1, friction: 6, useNativeDriver: true }).start();
  }, [offer]);

  if (!offer || offer.length === 0) return null;

  // Cards share the row evenly; they grow taller (and the overlay scrolls) rather than overflow.
  const cardWidth = Math.min(220, (width * 0.92 - 12 * (offer.length - 1)) / offer.length);

  return (
    <OverlayContainer>
      <Text style={styles.kicker} maxFontSizeMultiplier={1.3}>
        {t('relic.kicker', { floor: floor - 1 }).toLocaleUpperCase()}
      </Text>
      <Text style={styles.title} accessibilityRole="header" maxFontSizeMultiplier={1.3}>
        {t('relic.title').toLocaleUpperCase()}
      </Text>

      <Animated.View style={[styles.row, { transform: [{ scale: pop }] }]}>
        {offer.map(id => {
          const name = relicText(t, id, 'name');
          const description = relicText(t, id, 'desc');
          return (
            <TouchableOpacity
              key={id}
              style={[styles.card, { width: cardWidth }]}
              activeOpacity={0.85}
              onPress={() => onPick(id)}
              accessibilityRole="button"
              accessibilityLabel={`${name}. ${description}`}
            >
              <Text style={styles.icon}>{RELICS[id].icon}</Text>
              <Text style={styles.name} maxFontSizeMultiplier={1.3}>
                {name.toLocaleUpperCase()}
              </Text>
              <Text style={styles.description} maxFontSizeMultiplier={1.3}>
                {description}
              </Text>
            </TouchableOpacity>
          );
        })}
      </Animated.View>

      <Text style={styles.hint} maxFontSizeMultiplier={1.3}>
        {t('relic.hint')}
      </Text>
    </OverlayContainer>
  );
};

export default RelicDraftOverlay;

const styles = StyleSheet.create({
  kicker: { color: '#4FC3F7', fontWeight: '800', fontSize: 12, letterSpacing: 3, textAlign: 'center' },
  title: {
    color: '#FFD700',
    fontWeight: '900',
    fontSize: 22,
    letterSpacing: 3,
    marginTop: 4,
    marginBottom: 12,
    textAlign: 'center',
  },
  row: { flexDirection: 'row', gap: 12, justifyContent: 'center' },
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#FFD700',
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
    gap: 6,
  },
  icon: { fontSize: 36 },
  name: { color: '#fff', fontWeight: '900', fontSize: 13, letterSpacing: 1, textAlign: 'center' },
  description: { color: '#cfcfcf', fontSize: 12, textAlign: 'center' },
  hint: { color: '#9a9a9a', fontSize: 11, marginTop: 12, letterSpacing: 1, textAlign: 'center' },
});
