import { create } from "zustand";
import { Platform } from "react-native";
import { createAudioPlayer, setAudioModeAsync } from "expo-audio";
import { Asset } from "expo-asset";
import type { LegacySoundHandle, SoundStore } from "./types";

/**
 * Global registries for native state.
 */
const GLOBAL_PLAYERS: Record<string, any> = {};
const GLOBAL_SOURCES: Record<string, any> = {};
const TARGET_VOLUMES: Record<string, number> = {};
const TARGET_LOOPS: Record<string, boolean> = {};
const INITIALIZING_PLAYERS: Record<string, Promise<any> | undefined> = {};

/**
 * Ensures a player is loaded and syncs target state.
 * Uses a single-flight pattern to prevent concurrent initialization race conditions.
 */
async function ensurePlayer(name: string): Promise<any> {
    const source = GLOBAL_SOURCES[name];
    if (!source) return null;

    // 1. Success case: already loaded and ready
    if (GLOBAL_PLAYERS[name]?.isLoaded) {
        return GLOBAL_PLAYERS[name];
    }

    // 2. Pendency case: already being initialized by another call
    if (INITIALIZING_PLAYERS[name]) {
        return INITIALIZING_PLAYERS[name];
    }

    // 3. Initialization case: Start loading (Single Flight)
    INITIALIZING_PLAYERS[name] = (async () => {
        try {
            const asset = Asset.fromModule(source);
            if (!asset.localUri) await asset.downloadAsync();
            const stableUri = asset.localUri || asset.uri;
            
            const player = createAudioPlayer(stableUri);
            
            // Wait for internal engine to confirm readiness
            let attempts = 0;
            while (!player.isLoaded && attempts < 20) {
                await new Promise(r => setTimeout(r, 100));
                attempts++;
            }

            if (player.isLoaded) {
                GLOBAL_PLAYERS[name] = player;
                // Re-apply target settings
                if (TARGET_VOLUMES[name] !== undefined) player.volume = TARGET_VOLUMES[name];
                if (TARGET_LOOPS[name] !== undefined) player.loop = TARGET_LOOPS[name];
                return player;
            }
            return null;
        } catch (e) {
            console.error(`[AudioEngine:${name}] Init failed:`, e);
            return null;
        } finally {
            delete INITIALIZING_PLAYERS[name];
        }
    })();

    return INITIALIZING_PLAYERS[name];
}

const SHOULD_BE_PLAYING: Record<string, boolean> = {};

function toLegacyHandle(name: string): LegacySoundHandle {
  /**
   * Aggressive volume reinforcement.
   * Runs for 2 seconds to overcome Android's native mixer delays/resets.
   */
  const hammerVolumeLoop = (count = 0) => {
    const p = GLOBAL_PLAYERS[name];
    if (!p || count > 15 || !SHOULD_BE_PLAYING[name]) return; // Stop if not playing or finished

    const vol = TARGET_VOLUMES[name] ?? 1.0;
    try {
        p.volume = vol;
    } catch(e) {}

    setTimeout(() => hammerVolumeLoop(count + 1), 100);
  };

  return {
    isPlaying: async () => {
      const p = GLOBAL_PLAYERS[name];
      return p ? p.playing : false;
    },

    play: async () => {
      try {
        SHOULD_BE_PLAYING[name] = true;
        let p = GLOBAL_PLAYERS[name];
        if (!p) {
          p = await ensurePlayer(name);
        }
        if (!p || !SHOULD_BE_PLAYING[name]) return;

        const vol = TARGET_VOLUMES[name] ?? 1.0;
        
        // 1. Pre-play set
        p.volume = vol;
        p.seekTo(0);
        
        // 2. Play
        p.play();
        
        // 3. Post-play aggressive reinforcement (Android only)
        if (Platform.OS === 'android') {
          hammerVolumeLoop();
        }
      } catch (e) {
        console.error(`[AudioEngine:${name}] play error:`, e);
      }
    },

    stop: async () => {
      try {
        SHOULD_BE_PLAYING[name] = false;
        const p = GLOBAL_PLAYERS[name];
        if (p) {
          p.pause();
          p.seekTo(0);
        }
      } catch (e) {
        console.error(`[AudioEngine:${name}] stop error:`, e);
      }
    },

    setNumberOfLoops: async (loops: number) => {
      try {
        TARGET_LOOPS[name] = (loops !== 0);
        const p = await ensurePlayer(name);
        if (p) p.loop = TARGET_LOOPS[name];
      } catch (e) {
        console.error(`[AudioEngine:${name}] setNumberOfLoops error:`, e);
      }
    },

    setVolume: async (vol: number) => {
      try {
        const v = Math.max(0, Math.min(1, vol));
        TARGET_VOLUMES[name] = v;
        const p = GLOBAL_PLAYERS[name];
        if (p && p.isLoaded) {
            p.volume = v;
        }
      } catch (e) {
        console.error(`[AudioEngine:${name}] setVolume error:`, e);
      }
    },

    unload: async () => {
      try {
        const p = GLOBAL_PLAYERS[name];
        if (p) p.pause();
      } catch (e) {
        console.error(`[AudioEngine:${name}] unload error:`, e);
      }
    },
  };
}

export const useSoundStore = create<SoundStore & { ready: boolean }>((set, get) => ({
  sounds: {
    cover:      null,
    selection:  null,
    gameplay:   null,
    death:      null,
    coin:       null,
    victory:    null,
    move:       null,
    attack:     null,
    monster:    null,
    vortex:     null,
  },
  ready: false,

  init: async () => {
    if (get().ready) return;

    // Default Mix Constants
    TARGET_VOLUMES['cover'] = 0.3;
    TARGET_VOLUMES['selection'] = 0.3;
    TARGET_VOLUMES['gameplay'] = 0.3;
    TARGET_VOLUMES['death'] = 0.7;
    TARGET_VOLUMES['coin'] = 0.7;
    TARGET_VOLUMES['victory'] = 0.30;
    TARGET_VOLUMES['move'] = 0.5;
    TARGET_VOLUMES['attack'] = 0.7;
    TARGET_VOLUMES['monster'] = 0.4;
    TARGET_VOLUMES['vortex'] = 0.4;

    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
        shouldRouteThroughEarpiece: false,
      });
    } catch (e) {
      console.warn("[AudioStore] setAudioModeAsync failed:", e);
    }

    const prepare = async (source: any, name: string) => {
      GLOBAL_SOURCES[name] = source;
      await ensurePlayer(name);
      return toLegacyHandle(name);
    };

    try {
      console.log("Audio Engine: Starting initialization...");
      
      const p = {
        cover:      await prepare(require("../../assets/music/cover.mp3"), "cover"),
        selection:  await prepare(require("../../assets/sfx/selection.mp3"), "selection"),
        gameplay:   await prepare(require("../../assets/music/gameplay.mp3"), "gameplay"),
        death:      await prepare(require("../../assets/sfx/death.mp3"), "death"),
        coin:       await prepare(require("../../assets/sfx/coin.mp3"), "coin"),
        victory:    await prepare(require("../../assets/music/victory.mp3"), "victory"),
        move:       await prepare(require("../../assets/sfx/move.mp3"), "move"),
        attack:     await prepare(require("../../assets/sfx/attack.mp3"), "attack"),
        monster:    await prepare(require("../../assets/sfx/monster.mp3"), "monster"),
        vortex:     await prepare(require("../../assets/sfx/vortex.mp3"), "vortex"),
      };

      set({ sounds: p as any, ready: true });
      console.log("Audio Engine: Ready.");
    } catch (err) {
      console.error("Audio Engine: Init error", err);
    }
  },

  setVolumeAll: async (vol: number) => {
    const { sounds } = get();
    Object.values(sounds).forEach((s: any) => {
      if (s) s.setVolume(vol);
    });
  },
}));
