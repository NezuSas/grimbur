import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SettingsState } from './types';
import { DEFAULT_VOLUME, clampVolume } from '../../core/audio/volume';

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      soundEnabled: true,
      musicVolume: DEFAULT_VOLUME,
      sfxVolume: DEFAULT_VOLUME,
      hapticsEnabled: true,
      reduceFlash: false,
      controlPosition: 'right',
      attackButton: 'side',
      movePad: 'fixed',
      joystickSkin: 'console',
      controlSize: 'medium',
      swipeMove: false,
      dragAim: true,
      language: 'auto',
      tutorialSeen: false,
      achievementsSeen: 0,
      hintsSeen: [],
      reviewAskedAt: 0,
      lastHero: 0,
      setSoundEnabled: (enabled) => set({ soundEnabled: enabled }),
      setMusicVolume: (level) => set({ musicVolume: clampVolume(level) }),
      setSfxVolume: (level) => set({ sfxVolume: clampVolume(level) }),
      setHapticsEnabled: (enabled) => set({ hapticsEnabled: enabled }),
      setReduceFlash: (enabled) => set({ reduceFlash: enabled }),
      setControlPosition: (position) => set({ controlPosition: position }),
      setControlSize: (size) => set({ controlSize: size }),
      setAttackButton: (placement) => set({ attackButton: placement }),
      setMovePad: (style) => set({ movePad: style }),
      setJoystickSkin: (skin) => set({ joystickSkin: skin }),
      setSwipeMove: (enabled) => set({ swipeMove: enabled }),
      setDragAim: (enabled) => set({ dragAim: enabled }),
      setLanguage: (language) => set({ language }),
      setTutorialSeen: (seen) => set({ tutorialSeen: seen }),
      setAchievementsSeen: (count) => set({ achievementsSeen: count }),
      markReviewAsked: (at) => set({ reviewAskedAt: at }),
      setLastHero: (heroIndex) => set({ lastHero: heroIndex }),
      markHintSeen: (id) => set(s => (s.hintsSeen.includes(id) ? s : { hintsSeen: [...s.hintsSeen, id] })),
    }),
    {
      name: 'wumpus-adventures-settings',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
