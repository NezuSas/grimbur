import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { RELICS, RelicId } from '../../../core/engine/relics';
import { overlayStyles } from './overlayStyles';

type Props = {
  /** Relics on offer; the overlay is hidden when null. */
  offer: RelicId[] | null;
  /** The floor the player is about to enter. */
  floor: number;
  onPick: (id: RelicId) => void;
};

const RelicDraftOverlay = ({ offer, floor, onPick }: Props) => {
  const fade = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    if (!offer) {
      fade.setValue(0);
      pop.setValue(0.85);
      return;
    }
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.spring(pop, { toValue: 1, friction: 6, useNativeDriver: true }),
    ]).start();
  }, [offer]);

  if (!offer || offer.length === 0) return null;

  return (
    <Animated.View style={[overlayStyles.overlay, { opacity: fade }]}>
      <Text style={styles.kicker}>FLOOR {floor - 1} CLEARED</Text>
      <Text style={styles.title}>CHOOSE A RELIC</Text>

      <Animated.View style={[styles.row, { transform: [{ scale: pop }] }]}>
        {offer.map(id => {
          const relic = RELICS[id];
          return (
            <TouchableOpacity key={id} style={styles.card} activeOpacity={0.85} onPress={() => onPick(id)}>
              <Text style={styles.icon}>{relic.icon}</Text>
              <Text style={styles.name}>{relic.name.toUpperCase()}</Text>
              <Text style={styles.description}>{relic.description}</Text>
            </TouchableOpacity>
          );
        })}
      </Animated.View>

      <Text style={styles.hint}>Relics last for the whole expedition</Text>
    </Animated.View>
  );
};

export default RelicDraftOverlay;

const styles = StyleSheet.create({
  kicker: { color: '#4FC3F7', fontWeight: '800', fontSize: 12, letterSpacing: 3 },
  title: { color: '#FFD700', fontWeight: '900', fontSize: 24, letterSpacing: 3, marginTop: 4, marginBottom: 14 },
  row: { flexDirection: 'row', gap: 12, paddingHorizontal: 16 },
  card: {
    flex: 1,
    maxWidth: 220,
    backgroundColor: '#1a1a1a',
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#FFD700',
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#FFD700',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 12,
  },
  icon: { fontSize: 40 },
  name: { color: '#fff', fontWeight: '900', fontSize: 13, letterSpacing: 1, textAlign: 'center' },
  description: { color: '#bbb', fontSize: 12, textAlign: 'center', lineHeight: 16 },
  hint: { color: '#777', fontSize: 11, marginTop: 14, letterSpacing: 1 },
});
