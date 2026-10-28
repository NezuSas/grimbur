import React, { useMemo } from 'react';
import { StyleSheet, View } from "react-native";
import Text from "./Text";
import type { RelicId } from '../../core/engine/relics';
import RelicIcon from './RelicIcon';

type Props = {
  relics: readonly RelicId[];
  /** Icon size in dp. */
  size: number;
  /** Spoken description for screen readers. */
  label: string;
};

/** The relics collected so far: one icon each, with a "x2" badge for duplicates. */
const RelicTray: React.FC<Props> = ({ relics, size, label }) => {
  const stacks = useMemo(() => {
    const counts = new Map<RelicId, number>();
    for (const id of relics) counts.set(id, (counts.get(id) ?? 0) + 1);
    return [...counts.entries()];
  }, [relics]);
  if (stacks.length === 0) return null;

  return (
    <View style={styles.tray} accessible accessibilityLabel={label} pointerEvents="none">
      {stacks.map(([id, count]) => (
        <View key={id} style={{ width: size, height: size }}>
          <RelicIcon id={id} size={size} />
          {count > 1 && (
            <View style={styles.count}>
              <Text style={styles.countText} allowFontScaling={false}>
                x{count}
              </Text>
            </View>
          )}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  tray: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 4,
    padding: 5,
    borderRadius: 12,
    backgroundColor: 'rgba(14, 11, 31, 0.78)',
    borderWidth: 1,
    borderColor: 'rgba(255, 213, 79, 0.35)',
  },
  count: {
    position: 'absolute',
    right: -3,
    bottom: -3,
    paddingHorizontal: 3,
    borderRadius: 6,
    backgroundColor: '#1B150F',
    borderWidth: 1,
    borderColor: '#FFD54F',
  },
  countText: { color: '#FFD54F', fontSize: 10, fontWeight: '900' },
});

export default RelicTray;
