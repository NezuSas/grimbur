import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, TouchableOpacity, useWindowDimensions } from "react-native";
import Text from "../Text";

import { RelicId, RELICS } from '../../../core/engine/relics';
import RelicIcon from '../RelicIcon';
import OverlayContainer from './OverlayContainer';
import { useT } from '../../../i18n/useT';
import { relicText } from '../../../i18n/keys';

type Props = {
  /** Relics on offer; the overlay is hidden when null. */
  offer: RelicId[] | null;
  /** The floor the player is about to enter. */
  floor: number;
  /** True when that floor is the Wumpus' lair. */
  lairNext?: boolean;
  onPick: (id: RelicId) => void;
};

const RelicDraftOverlay = ({ offer, floor, lairNext = false, onPick }: Props) => {
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
          const cursed = !!RELICS[id].cursed;
          return (
            <TouchableOpacity
              key={id}
              style={[styles.card, { width: cardWidth }, cursed && styles.cursedCard]}
              activeOpacity={0.85}
              onPress={() => onPick(id)}
              accessibilityRole="button"
              accessibilityLabel={`${cursed ? `${t('relic.cursed')}. ` : ''}${name}. ${description}`}
            >
              {cursed && (
                <Text style={styles.cursedTag} maxFontSizeMultiplier={1.3}>
                  {t('relic.cursed').toLocaleUpperCase()}
                </Text>
              )}
              <RelicIcon id={id} size={64} />
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
        {offer.some(id => RELICS[id].cursed) ? t('relic.cursedHint') : t('relic.hint')}
      </Text>
      {lairNext && (
        <Text style={styles.lair} maxFontSizeMultiplier={1.3}>
          {t('relic.lairNext')}
        </Text>
      )}
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
  cursedCard: { borderColor: '#EF5350', backgroundColor: '#241214' },
  cursedTag: { color: '#FF8A80', fontWeight: '900', fontSize: 11, letterSpacing: 2 },
  name: { color: '#fff', fontWeight: '900', fontSize: 13, letterSpacing: 1, textAlign: 'center' },
  description: { color: '#cfcfcf', fontSize: 12, textAlign: 'center' },
  lair: { color: '#FF8A80', fontWeight: '900', fontSize: 13, textAlign: 'center', marginTop: 4 },
  hint: { color: '#9a9a9a', fontSize: 11, marginTop: 12, letterSpacing: 1, textAlign: 'center' },
});
