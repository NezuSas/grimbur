export type ControlPosition = 'left' | 'right';

export interface SettingsState {
  soundEnabled: boolean;
  controlPosition: ControlPosition;
  setSoundEnabled: (enabled: boolean) => void;
  setControlPosition: (position: ControlPosition) => void;
}
