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
      attackButton: 'side',
      controlSize: 'medium',
      swipeMove: false,
      language: 'auto',
      tutorialSeen: false,
      achievementsSeen: 0,
      setSoundEnabled: (enabled) => set({ soundEnabled: enabled }),
      setHapticsEnabled: (enabled) => set({ hapticsEnabled: enabled }),
      setReduceFlash: (enabled) => set({ reduceFlash: enabled }),
      setControlPosition: (position) => set({ controlPosition: position }),
      setControlSize: (size) => set({ controlSize: size }),
      setAttackButton: (placement) => set({ attackButton: placement }),
      setSwipeMove: (enabled) => set({ swipeMove: enabled }),
      setLanguage: (language) => set({ language }),
      setTutorialSeen: (seen) => set({ tutorialSeen: seen }),
      setAchievementsSeen: (count) => set({ achievementsSeen: count }),
    }),
    {
      name: 'wumpus-adventures-settings',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
