import React, { useEffect, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from "react-native";
import OverlayContainer from './OverlayContainer';
import Text from '../Text';
import { PopButton, PopupPanel, PopupTitle } from './popup';
import { useT } from '../../../i18n/useT';

type Props = {
  visible: boolean;
  /** Leaving to the menu keeps the run on disk (expedition, endless): no warning needed, a note instead. */
  saveOnExit: boolean;
  /** A live duel offers no mid-match restart: replaying the same seeded cave would be an unfair preview. */
  canRestart: boolean;
  onResume: () => void;
  onRestart: () => void;
  onMainMenu: () => void;
};

const TINT = '#4FC3F7';
const WARN = '#FF8A80';

const PauseOverlay = ({ visible, saveOnExit, canRestart, onResume, onRestart, onMainMenu }: Props) => {
  const { t } = useT();
  const { width } = useWindowDimensions();
  // Restarting always throws the run away; so does the menu when the mode cannot be saved. Both ask first.
  const [confirm, setConfirm] = useState<null | 'restart' | 'menu'>(null);

  useEffect(() => {
    if (!visible) setConfirm(null);
  }, [visible]);

  if (!visible) return null;
  const panelWidth = Math.min(width * 0.86, 380);

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
      <PopupPanel tint={TINT} width={panelWidth}>
        <PopupTitle tint={TINT} icon="pause" title={t('pause.title')} />
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
      </PopupPanel>
    </OverlayContainer>
  );
};

export default PauseOverlay;

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10, alignSelf: 'stretch' },
  half: { flex: 1 },
  note: { color: '#D6C4B2', fontSize: 12, textAlign: 'center' },
});
