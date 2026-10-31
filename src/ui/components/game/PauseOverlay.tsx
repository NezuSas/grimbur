import React, { useEffect, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from "react-native";
import OverlayContainer from './OverlayContainer';
import Text from '../Text';
import { PopButton, PopupPanel, PopupTitle } from './popup';
import { useT } from '../../../i18n/useT';
import SpriteImage from '../SpriteImage';
import RelicTray from '../RelicTray';
import type { RelicId } from '../../../core/engine/relics';
import type { ImageSourcePropType } from 'react-native';

/** Where the run stands, shown under the title so a paused player knows what they come back to. */
export type PauseSummary = { floor: number; floors: number; score: number; gems: number; arrows: number; relics: readonly RelicId[] };

const TILE_ART: Record<'floor' | 'score' | 'gems' | 'arrows', ImageSourcePropType> = {
  floor: require('../../../assets/sprites/ui/Icon_Flag.png'),
  score: require('../../../assets/sprites/ui/Icon_Trophy.png'),
  gems: require('../../../assets/sprites/items/Icon_Gem.png'),
  arrows: require('../../../assets/sprites/items/Icon_Arrows.png'),
};

type Props = {
  visible: boolean;
  /** Leaving to the menu keeps the run on disk (expedition, endless): no warning needed, a note instead. */
  saveOnExit: boolean;
  /** A live duel offers no mid-match restart: replaying the same seeded cave would be an unfair preview. */
  canRestart: boolean;
  onResume: () => void;
  onRestart: () => void;
  onMainMenu: () => void;
  summary?: PauseSummary;
};

const TINT = '#4FC3F7';
const WARN = '#FF8A80';

const PauseOverlay = ({ visible, saveOnExit, canRestart, onResume, onRestart, onMainMenu, summary }: Props) => {
  const { t, n } = useT();
  const { width, height } = useWindowDimensions();
  // A short window lays the run's state beside the buttons instead of above them.
  const side = !!summary && height < 460 && width >= 560;
  // Restarting always throws the run away; so does the menu when the mode cannot be saved. Both ask first.
  const [confirm, setConfirm] = useState<null | 'restart' | 'menu'>(null);

  useEffect(() => {
    if (!visible) setConfirm(null);
  }, [visible]);

  if (!visible) return null;
  const panelWidth = side ? Math.min(width * 0.92, 660) : Math.min(width * 0.86, summary ? 460 : 380);

  if (confirm) {
    const abandon = confirm === 'restart' ? onRestart : onMainMenu;
    return (
      <OverlayContainer>
        <PopupPanel tint={WARN} width={panelWidth}>
          <PopupTitle tint={WARN} icon="warning" title={t('pause.confirm.title')} subtitle={t('pause.confirm.body')} />
          <PopButton variant="danger" label={confirm === 'restart' ? t('pause.confirm.restart') : t('pause.confirm.menu')} onPress={abandon} />
          <PopButton label={t('pause.confirm.cancel')} icon="play" onPress={() => setConfirm(null)} />
        </PopupPanel>
      </OverlayContainer>
    );
  }

  return (
    <OverlayContainer>
      <PopupPanel tint={TINT} width={panelWidth} style={side ? styles.sideRow : undefined}>
        <View style={side ? styles.sideCol : styles.stack}>
        <PopupTitle tint={TINT} icon="pause" title={t('pause.title')} />
        {summary ? (
          <View style={styles.summary}>
            <View style={styles.tiles}>
              {(
                [
                  ['floor', `${summary.floor}/${summary.floors}`, t('pause.floor')],
                  ['score', n(summary.score), t('over.score')],
                  ['gems', String(summary.gems), t('over.gems')],
                  ['arrows', String(summary.arrows), t('pause.arrows')],
                ] as const
              ).map(([key, value, label]) => (
                <View key={key} style={styles.tile} accessible accessibilityLabel={`${label}: ${value}`}>
                  <SpriteImage source={TILE_ART[key]} style={styles.tileArt} resizeMode="contain" />
                  <Text style={styles.tileValue} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.1}>{value}</Text>
                  <Text style={styles.tileLabel} numberOfLines={1} maxFontSizeMultiplier={1.05}>{label.toLocaleUpperCase()}</Text>
                </View>
              ))}
            </View>
            {summary.relics.length > 0 ? (
              <View style={styles.relics}>
                <RelicTray relics={summary.relics} size={24} label={t('pause.relics')} />
              </View>
            ) : null}
          </View>
        ) : null}
        </View>
        <View style={side ? styles.sideCol : styles.stack}>
        <PopButton label={t('pause.resume')} icon="play" onPress={onResume} />
        <View style={styles.row}>
          {canRestart && <PopButton variant="secondary" label={t('pause.restart')} icon="refresh" onPress={() => setConfirm('restart')} style={styles.half} />}
          <PopButton
            variant="secondary"
            label={t('pause.menu')}
            icon="home"
            onPress={saveOnExit ? onMainMenu : () => setConfirm('menu')}
            style={styles.half}
          />
        </View>
        {saveOnExit ? (
          <Text style={styles.note} maxFontSizeMultiplier={1.3}>
            {t('pause.saveNote')}
          </Text>
        ) : null}
        </View>
      </PopupPanel>
    </OverlayContainer>
  );
};

export default PauseOverlay;

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10, alignSelf: 'stretch' },
  stack: { alignSelf: 'stretch', alignItems: 'center', gap: 12 },
  sideRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  sideCol: { flex: 1, alignItems: 'center', gap: 10 },
  half: { flex: 1 },
  note: { color: '#D6C4B2', fontSize: 12, textAlign: 'center' },
  summary: { alignSelf: 'stretch', gap: 8 },
  tiles: { flexDirection: 'row', gap: 6 },
  tile: { flex: 1, alignItems: 'center', gap: 1, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(0,0,0,0.3)' },
  tileArt: { width: 24, height: 24 },
  tileValue: { color: '#FFF4DE', fontWeight: '900', fontSize: 16 },
  tileLabel: { color: '#B99A7C', fontWeight: '900', fontSize: 11, letterSpacing: 0.6 },
  relics: { alignItems: 'center' },
});
