import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface EntitlementsState {
  /** The one-time "full game" purchase is owned (kept on the device; the store re-confirms it at startup). */
  fullUnlocked: boolean;
  setFullUnlocked: (unlocked: boolean) => void;
}

export const useEntitlementsStore = create<EntitlementsState>()(
  persist(
    (set) => ({
      fullUnlocked: false,
      setFullUnlocked: (unlocked) => set({ fullUnlocked: unlocked }),
    }),
    {
      name: 'wumpus-adventures-entitlements',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
