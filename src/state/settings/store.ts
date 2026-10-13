import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SettingsState } from './types';

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      soundEnabled: true,
      hapticsEnabled: true,
      reduceFlash: false,
      controlPosition: 'right',
      language: 'auto',
      tutorialSeen: false,
      setSoundEnabled: (enabled) => set({ soundEnabled: enabled }),
      setHapticsEnabled: (enabled) => set({ hapticsEnabled: enabled }),
      setReduceFlash: (enabled) => set({ reduceFlash: enabled }),
      setControlPosition: (position) => set({ controlPosition: position }),
      setLanguage: (language) => set({ language }),
      setTutorialSeen: (seen) => set({ tutorialSeen: seen }),
    }),
    {
      name: 'wumpus-adventures-settings',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
