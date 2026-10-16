import React from 'react';
import { StyleSheet, View, useWindowDimensions } from "react-native";
import OverlayContainer from './OverlayContainer';
import { PopButton, PopupPanel, PopupTitle } from './popup';
import { useT } from '../../../i18n/useT';

type Props = {
  visible: boolean;
  onResume: () => void;
  onRestart: () => void;
  onMainMenu: () => void;
};

const TINT = '#4FC3F7';

const PauseOverlay = ({ visible, onResume, onRestart, onMainMenu }: Props) => {
  const { t } = useT();
  const { width } = useWindowDimensions();

  if (!visible) return null;

  return (
    <OverlayContainer>
      <PopupPanel tint={TINT} width={Math.min(width * 0.86, 380)}>
        <PopupTitle tint={TINT} icon="pause" title={t('pause.title')} />
        <PopButton label={t('pause.resume')} glyph="▶" onPress={onResume} />
        <View style={styles.row}>
          <PopButton variant="secondary" label={t('pause.restart')} glyph="🔄" onPress={onRestart} style={styles.half} />
          <PopButton variant="secondary" label={t('pause.menu')} glyph="🏠" onPress={onMainMenu} style={styles.half} />
        </View>
      </PopupPanel>
    </OverlayContainer>
  );
};

export default PauseOverlay;

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10, alignSelf: 'stretch' },
  half: { flex: 1 },
});
