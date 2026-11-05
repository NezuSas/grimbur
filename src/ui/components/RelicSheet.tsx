import React, { useMemo } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import Text from './Text';
import RelicIcon from './RelicIcon';
import GameIcon from './GameIcon';
import { activeFamilies, type RelicId } from '../../core/engine/relics';
import type { WeaponId } from '../../core/engine/weapons';
import { useT } from '../../i18n/useT';
import { relicText } from '../../i18n/keys';
import { weaponLine } from '../../i18n/weaponText';
import type { TranslationKey } from '../../i18n/en';
import { FAMILY_COLOR } from '../familyLook';
import { relicStacks } from './relicStacks';

type Props = { visible: boolean; relics: readonly RelicId[]; weapon?: WeaponId; onClose: () => void };

/** Every relic of the run in one list: its art, its name, what it does and how many are stacked, plus the set bonuses in force. */
const RelicSheet: React.FC<Props> = ({ visible, relics, weapon, onClose }) => {
  const { t } = useT();
  const stacks = useMemo(() => relicStacks(relics), [relics]);
  const families = useMemo(() => activeFamilies(relics), [relics]);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} supportedOrientations={['landscape', 'portrait']}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={t('relics.sheet.close')}>
        <Pressable style={styles.card} onPress={() => {}}>
          <View style={styles.header}>
            <Text style={styles.title} maxFontSizeMultiplier={1.1}>{t('relics.sheet.title', { n: relics.length })}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} accessibilityRole="button" accessibilityLabel={t('relics.sheet.close')}>
              <GameIcon name="close" size={24} color="#E9D9B4" />
            </TouchableOpacity>
          </View>
          {families.map(f => (
            <Text key={f} style={[styles.family, { color: FAMILY_COLOR[f] }]} maxFontSizeMultiplier={1.1}>
              {`${t(`family.${f}.name` as TranslationKey)}: ${weaponLine(t, `family.${f}.bonus` as TranslationKey, weapon ?? 'bow')}`}
            </Text>
          ))}
          <ScrollView contentContainerStyle={styles.grid}>
            {stacks.map(([id, count]) => (
              <View key={id} style={styles.row} accessible accessibilityLabel={`${relicText(t, id, 'name')}${count > 1 ? ` x${count}` : ''}. ${relicText(t, id, 'desc', weapon)}`}>
                <View style={styles.iconBox}>
                  <RelicIcon id={id} size={40} />
                  {count > 1 && (
                    <View style={styles.count}>
                      <Text style={styles.countText} allowFontScaling={false}>x{count}</Text>
                    </View>
                  )}
                </View>
                <View style={styles.texts}>
                  <Text style={styles.name} numberOfLines={1} maxFontSizeMultiplier={1.1}>{relicText(t, id, 'name')}</Text>
                  <Text style={styles.desc} numberOfLines={3} maxFontSizeMultiplier={1.1}>{relicText(t, id, 'desc', weapon)}</Text>
                </View>
              </View>
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  card: { width: '100%', maxWidth: 720, maxHeight: '92%', backgroundColor: '#1B140D', borderRadius: 16, borderWidth: 1.5, borderColor: 'rgba(201,165,90,0.55)', padding: 14 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  title: { color: '#F0D79A', fontSize: 18, fontWeight: '900', letterSpacing: 1 },
  family: { fontSize: 13, fontWeight: '800', marginBottom: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingTop: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, flexBasis: '48%', flexGrow: 1, minWidth: 240, padding: 8, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(201,165,90,0.18)' },
  iconBox: { width: 40, height: 40 },
  count: { position: 'absolute', right: -4, bottom: -4, paddingHorizontal: 3, borderRadius: 6, backgroundColor: '#1B150F', borderWidth: 1, borderColor: '#C9A55A' },
  countText: { color: '#C9A55A', fontSize: 11, fontWeight: '900' },
  texts: { flex: 1 },
  name: { color: '#F3E6C8', fontSize: 14, fontWeight: '900' },
  desc: { color: '#CBB994', fontSize: 12, lineHeight: 16 },
});

export default RelicSheet;
