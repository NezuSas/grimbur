import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SettingsState, ControlPosition } from './types';

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      soundEnabled: true,
      controlPosition: 'right',
      setSoundEnabled: (enabled) => set({ soundEnabled: enabled }),
      setControlPosition: (position) => set({ controlPosition: position }),
    }),
    {
      name: 'wumpus-adventures-settings',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
