import React, { useMemo, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from "react-native";
import Text from "./Text";
import type { RelicId } from '../../core/engine/relics';
import type { WeaponId } from '../../core/engine/weapons';
import RelicIcon from './RelicIcon';
import RelicSheet from './RelicSheet';
import { relicStacks, trayView } from './relicStacks';
import { useT } from '../../i18n/useT';

type Props = {
  relics: readonly RelicId[];
  /** Icon size in dp. */
  size: number;
  /** Spoken description for screen readers. */
  label: string;
  /** How many tiles the tray shows at most: past that, the newest relics and a "+N" chip (see trayView). */
  max?: number;
  /** Tapping the tray opens every relic with its name and what it does (like the relic bars of other roguelites). */
  details?: boolean;
  /** For the relic texts that name the hero's weapon. */
  weapon?: WeaponId;
};

/** The relics collected so far: one icon each, with a "x2" badge for duplicates. */
const RelicTray: React.FC<Props> = ({ relics, size, label, max, details = false, weapon }) => {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const stacks = useMemo(() => relicStacks(relics), [relics]);
  if (stacks.length === 0) return null;
  const { shown, hidden } = trayView(stacks, max);

  const body = (
    <>
      {shown.map(([id, count]) => (
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
      {hidden > 0 && (
        <View style={[styles.more, { width: size, height: size, borderRadius: size * 0.28 }]}>
          <Text style={[styles.moreText, { fontSize: Math.max(11, size * 0.36) }]} allowFontScaling={false}>
            +{hidden}
          </Text>
        </View>
      )}
    </>
  );

  if (!details) {
    return (
      <View style={styles.tray} accessible accessibilityLabel={label} pointerEvents="none">
        {body}
      </View>
    );
  }
  return (
    <>
      <TouchableOpacity
        style={styles.tray}
        onPress={() => setOpen(true)}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={t('relics.sheet.hint')}
      >
        {body}
      </TouchableOpacity>
      <RelicSheet visible={open} relics={relics} weapon={weapon} onClose={() => setOpen(false)} />
    </>
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
    backgroundColor: 'rgba(22, 15, 9, 0.78)',
    borderWidth: 1,
    borderColor: 'rgba(201, 165, 90, 0.35)',
  },
  count: {
    position: 'absolute',
    right: -3,
    bottom: -3,
    paddingHorizontal: 3,
    borderRadius: 6,
    backgroundColor: '#1B150F',
    borderWidth: 1,
    borderColor: '#C9A55A',
  },
  countText: { color: '#C9A55A', fontSize: 11, fontWeight: '900' },
  more: { alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(201, 165, 90, 0.16)', borderWidth: 1.5, borderColor: '#C9A55A' },
  moreText: { color: '#F0D79A', fontWeight: '900' },
});

export default RelicTray;
