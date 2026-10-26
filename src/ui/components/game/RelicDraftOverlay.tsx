import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Text from "../Text";

import { RelicId, RELICS } from '../../../core/engine/relics';
import RelicIcon from '../RelicIcon';
import OverlayContainer from './OverlayContainer';
import { PopupTitle } from './popup';
import { useT } from '../../../i18n/useT';
import { relicText } from '../../../i18n/keys';

type Props = {
  /** Relics on offer; the overlay is hidden when null. */
  offer: RelicId[] | null;
  /** The floor the player is about to enter. */
  floor: number;
  /** True when that floor is the Grimbur' lair. */
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
  const cardWidth = Math.max(110, Math.min(220, (width * 0.92 - 12 * (offer.length - 1)) / offer.length));

  return (
    <OverlayContainer>
      <PopupTitle tint="#FFD54F" icon="sparkles" title={t('relic.title')} subtitle={t('relic.kicker', { floor: floor - 1 })} />
      <View style={{ height: 12 }} />

      <Animated.View style={[styles.row, { transform: [{ scale: pop }] }]}>
        {offer.map(id => {
          const name = relicText(t, id, 'name');
          const description = relicText(t, id, 'desc');
          const cursed = !!RELICS[id].cursed;
          return (
            <Pressable
              key={id}
              onPress={() => onPick(id)}
              accessibilityRole="button"
              accessibilityLabel={`${cursed ? `${t('relic.cursed')}. ` : ''}${name}. ${description}`}
              style={({ pressed }) => [styles.shadow, { width: cardWidth, shadowColor: cursed ? '#EF5350' : '#FFD54F' }, pressed && { transform: [{ scale: 0.97 }] }]}
            >
              <LinearGradient
                colors={cursed ? ['#3A1A1E', '#1E0E12'] : ['#2F2458', '#171030']}
                start={{ x: 0.2, y: 0 }}
                end={{ x: 0.8, y: 1 }}
                style={[styles.card, { borderColor: cursed ? '#EF5350' : '#FFD54F' }]}
              >
                <View style={styles.lit} pointerEvents="none" />
                {cursed && (
                  <Text style={styles.cursedTag} maxFontSizeMultiplier={1.3}>
                    {t('relic.cursed').toLocaleUpperCase()}
                  </Text>
                )}
                <View style={[styles.iconWell, { borderColor: cursed ? '#EF535088' : '#FFD54F88', backgroundColor: cursed ? 'rgba(239,83,80,0.12)' : 'rgba(255,213,79,0.12)' }]}>
                  <RelicIcon id={id} size={60} />
                </View>
                <Text style={styles.name} maxFontSizeMultiplier={1.3}>
                  {name.toLocaleUpperCase()}
                </Text>
                <Text style={styles.description} maxFontSizeMultiplier={1.3}>
                  {description}
                </Text>
              </LinearGradient>
            </Pressable>
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
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, justifyContent: 'center' },
  shadow: { shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 12, borderRadius: 20 },
  card: { borderRadius: 20, borderWidth: 2, paddingVertical: 14, paddingHorizontal: 10, alignItems: 'center', gap: 8, overflow: 'hidden' },
  lit: { position: 'absolute', top: 0, left: 18, right: 18, height: 2, borderRadius: 1, backgroundColor: 'rgba(255,255,255,0.22)' },
  iconWell: { width: 84, height: 84, borderRadius: 42, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  cursedTag: { color: '#FF8A80', fontWeight: '900', fontSize: 11, letterSpacing: 2 },
  name: { color: '#fff', fontWeight: '900', fontSize: 13, letterSpacing: 1, textAlign: 'center' },
  description: { color: '#cfcae6', fontSize: 12, textAlign: 'center' },
  lair: { color: '#FF8A80', fontWeight: '900', fontSize: 13, textAlign: 'center', marginTop: 4 },
  hint: { color: '#9d97ba', fontSize: 11, marginTop: 12, letterSpacing: 1, textAlign: 'center' },
});
