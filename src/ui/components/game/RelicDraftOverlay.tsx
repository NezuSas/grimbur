import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from '@expo/vector-icons';
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
  /** True when that floor is the Grimbur' lair. */
  lairNext?: boolean;
  onPick: (id: RelicId) => void;
};

const GOLD = '#FFD54F';
const RED = '#EF5350';

/**
 * The relic draft between floors. The game is played in landscape, where height is what runs out: a one-line header,
 * then the cards side by side, all the same size (the tallest decides) with the same fixed slots (tag, icon, name,
 * description), so icons, names and texts line up like a hand of cards. Everything is sized from the window so the
 * whole draft fits a small phone without scrolling.
 */
const RelicDraftOverlay = ({ offer, floor, lairNext = false, onPick }: Props) => {
  const { t } = useT();
  const { width, height } = useWindowDimensions();
  const pop = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    if (!offer) {
      pop.setValue(0.9);
      return;
    }
    Animated.spring(pop, { toValue: 1, friction: 6, useNativeDriver: true }).start();
  }, [offer]);

  if (!offer || offer.length === 0) return null;

  // Small landscape phones (~360 high) get a tighter card; taller windows a roomier one.
  const tight = height < 430;
  const gap = tight ? 10 : 14;
  const cardWidth = Math.max(130, Math.min(240, (width * 0.9 - gap * (offer.length - 1)) / offer.length));
  // Four narrow cards need more lines for their text: their icons give up the room.
  const icon = tight ? (height < 350 || offer.length > 3 ? 38 : 48) : 56;
  const well = icon + (tight ? 16 : 24);
  // The description is never cut: a rule the player cannot read cannot be chosen. This only reserves its usual height.
  const descLines = 3;
  const cursedOffered = offer.some(id => RELICS[id].cursed);

  return (
    <OverlayContainer>
      <View style={styles.header} accessibilityRole="header">
        <Ionicons name="sparkles" size={tight ? 18 : 22} color={GOLD} />
        <Text style={[styles.title, tight && { fontSize: 17 }]} numberOfLines={1} maxFontSizeMultiplier={1.2}>
          {t('relic.title').toLocaleUpperCase()}
        </Text>
        <Text style={styles.kicker} numberOfLines={1} maxFontSizeMultiplier={1.2}>
          {t('relic.kicker', { floor: floor - 1 })}
        </Text>
      </View>
      <LinearGradient colors={['transparent', GOLD, 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.rule, { width: Math.min(width * 0.6, 520) }]} />

      <Animated.View style={[styles.row, { gap, marginTop: tight ? 10 : 14, transform: [{ scale: pop }] }]}>
        {offer.map(id => {
          const name = relicText(t, id, 'name');
          const description = relicText(t, id, 'desc');
          const cursed = !!RELICS[id].cursed;
          const tint = cursed ? RED : GOLD;
          return (
            <Pressable
              key={id}
              onPress={() => onPick(id)}
              accessibilityRole="button"
              accessibilityLabel={`${cursed ? `${t('relic.cursed')}. ` : ''}${name}. ${description}`}
              style={({ pressed }) => [styles.shadow, { width: cardWidth, shadowColor: tint }, pressed && { transform: [{ scale: 0.97 }] }]}
            >
              <LinearGradient
                colors={cursed ? ['#3A1A1E', '#1E0E12'] : ['#513E2B', '#2A2016']}
                start={{ x: 0.2, y: 0 }}
                end={{ x: 0.8, y: 1 }}
                style={[styles.card, { borderColor: tint, paddingVertical: tight ? 8 : 12 }]}
              >
                <View style={styles.lit} pointerEvents="none" />
                <View style={styles.tagSlot}>
                  {cursed ? (
                    <Text style={styles.cursedTag} numberOfLines={1} maxFontSizeMultiplier={1.1}>
                      {t('relic.cursed').toLocaleUpperCase()}
                    </Text>
                  ) : null}
                </View>
                <View style={[styles.iconWell, { width: well, height: well, borderRadius: well / 2, borderColor: tint + '88', backgroundColor: tint + '1F' }]}>
                  <RelicIcon id={id} size={icon} />
                </View>
                <View style={styles.nameSlot}>
                  <Text style={styles.name} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.8} maxFontSizeMultiplier={1.1}>
                    {name.toLocaleUpperCase()}
                  </Text>
                </View>
                <View style={[styles.descSlot, { minHeight: 16 * descLines }]}>
                  <Text style={styles.description} maxFontSizeMultiplier={1.1}>
                    {description}
                  </Text>
                </View>
              </LinearGradient>
            </Pressable>
          );
        })}
      </Animated.View>

      <Text style={[styles.hint, lairNext && styles.lair, { marginTop: tight ? 8 : 12 }]} numberOfLines={2} maxFontSizeMultiplier={1.2}>
        {lairNext ? t('relic.lairNext') : cursedOffered ? t('relic.cursedHint') : t('relic.hint')}
      </Text>
    </OverlayContainer>
  );
};

export default RelicDraftOverlay;

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 10, flexWrap: 'wrap' },
  title: { color: GOLD, fontWeight: '900', fontSize: 20, letterSpacing: 3, textShadowColor: GOLD + '88', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 10 },
  kicker: { color: '#cfc6ee', fontSize: 13, fontWeight: '700' },
  rule: { height: 1.5, alignSelf: 'center', marginTop: 6 },
  // Cards on a line stretch to the tallest one, and each card's background fills its whole height.
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'stretch', justifyContent: 'center' },
  shadow: { shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 12, borderRadius: 18 },
  card: { flex: 1, borderRadius: 18, borderWidth: 2, paddingHorizontal: 12, alignItems: 'center', gap: 6, overflow: 'hidden' },
  lit: { position: 'absolute', top: 0, left: 18, right: 18, height: 2, borderRadius: 1, backgroundColor: 'rgba(255,255,255,0.22)' },
  // Fixed slots, the same on every card, so icons, names and descriptions start at the same height on all of them.
  tagSlot: { height: 13, justifyContent: 'center' },
  cursedTag: { color: '#FF8A80', fontWeight: '900', fontSize: 11, letterSpacing: 1.2 },
  iconWell: { borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  nameSlot: { alignSelf: 'stretch', height: 34, justifyContent: 'center' },
  name: { color: '#fff', fontWeight: '900', fontSize: 13, lineHeight: 16, letterSpacing: 1, textAlign: 'center' },
  descSlot: { alignSelf: 'stretch' },
  description: { color: '#d4cfe9', fontSize: 12, lineHeight: 16, textAlign: 'center' },
  hint: { color: '#a59fc4', fontSize: 11.5, letterSpacing: 0.5, textAlign: 'center', maxWidth: 620, alignSelf: 'center' },
  lair: { color: '#FF8A80', fontWeight: '900', fontSize: 12.5 },
});
