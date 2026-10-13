import * as Haptics from 'expo-haptics';
import { useSettingsStore } from '../state/settings/store';

/** Haptic feedback that respects the player's "Vibration" setting and never throws. */
const enabled = () => useSettingsStore.getState().hapticsEnabled;

export const haptic = {
  impact(style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) {
    if (enabled()) Haptics.impactAsync(style).catch(() => {});
  },
  notify(type: Haptics.NotificationFeedbackType) {
    if (enabled()) Haptics.notificationAsync(type).catch(() => {});
  },
};

export { ImpactFeedbackStyle, NotificationFeedbackType } from 'expo-haptics';
