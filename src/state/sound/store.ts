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
 * Short effects that can overlap get several "voices" (independent native players of the same file).
 * With a single player, a second shot, step or gem arriving while the first is still sounding restarted
 * or swallowed it, which is why effects seemed to play only some of the time.
 */
const EXTRA_VOICES: Record<string, number> = { move: 1, coin: 2, attack: 2, relic: 1 };
const voicesOf = (name: string): string[] => [
  name,
  ...Array.from({ length: EXTRA_VOICES[name] ?? 0 }, (_, i) => `${name}#${i + 1}`),
];
/** The sound a voice belongs to (`coin#1` -> `coin`); volume and loop targets are shared per sound. */
const baseOf = (voice: string) => voice.split('#')[0];
const nextVoice: Record<string, number> = {};

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
                if (TARGET_VOLUMES[baseOf(name)] !== undefined) player.volume = TARGET_VOLUMES[baseOf(name)];
                if (TARGET_LOOPS[baseOf(name)] !== undefined) player.loop = TARGET_LOOPS[baseOf(name)];
                return player;
            }
            // Never became ready: release it instead of leaking a native player on every retry.
            try { player.remove(); } catch {}
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
      return voicesOf(name).some(v => GLOBAL_PLAYERS[v]?.playing === true);
    },

    play: async () => {
      try {
        SHOULD_BE_PLAYING[name] = true;
        const voices = voicesOf(name);
        // Prefer a voice that is silent right now; otherwise take them in turn.
        let voice = voices.find(v => GLOBAL_PLAYERS[v]?.isLoaded && !GLOBAL_PLAYERS[v]?.playing);
        if (voice === undefined) {
          nextVoice[name] = ((nextVoice[name] ?? -1) + 1) % voices.length;
          voice = voices[nextVoice[name]];
        }
        let p = GLOBAL_PLAYERS[voice];
        if (!p) {
          p = await ensurePlayer(voice);
        }
        if (!p || !SHOULD_BE_PLAYING[name]) return;

        const vol = TARGET_VOLUMES[name] ?? 1.0;

        // 1. Pre-play set
        p.volume = vol;
        p.seekTo(0);

        // 2. Play
        p.play();

        // 3. Looping music only: re-assert the volume for a moment (Android's mixer can reset it).
        if (Platform.OS === 'android' && TARGET_LOOPS[name]) {
          hammerVolumeLoop();
        }
      } catch (e) {
        console.error(`[AudioEngine:${name}] play error:`, e);
      }
    },

    stop: async () => {
      try {
        SHOULD_BE_PLAYING[name] = false;
        for (const voice of voicesOf(name)) {
          const p = GLOBAL_PLAYERS[voice];
          if (p) {
            p.pause();
            p.seekTo(0);
          }
        }
      } catch (e) {
        console.error(`[AudioEngine:${name}] stop error:`, e);
      }
    },

    setNumberOfLoops: async (loops: number) => {
      try {
        TARGET_LOOPS[name] = (loops !== 0);
        for (const voice of voicesOf(name)) {
          const p = await ensurePlayer(voice);
          if (p) p.loop = TARGET_LOOPS[name];
        }
      } catch (e) {
        console.error(`[AudioEngine:${name}] setNumberOfLoops error:`, e);
      }
    },

    setVolume: async (vol: number) => {
      try {
        const v = Math.max(0, Math.min(1, vol));
        TARGET_VOLUMES[name] = v;
        for (const voice of voicesOf(name)) {
          const p = GLOBAL_PLAYERS[voice];
          if (p && p.isLoaded) p.volume = v;
        }
      } catch (e) {
        console.error(`[AudioEngine:${name}] setVolume error:`, e);
      }
    },

    unload: async () => {
      try {
        for (const voice of voicesOf(name)) GLOBAL_PLAYERS[voice]?.pause();
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
    relic:      null,
    roar:       null,
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
      const voices = voicesOf(name);
      for (const voice of voices) GLOBAL_SOURCES[voice] = source;
      await Promise.all(voices.map(voice => ensurePlayer(voice)));
      return toLegacyHandle(name);
    };

    try {
      console.log("Audio Engine: Starting initialization...");
      
      // All players load at the same time (each one polls until the native engine reports it ready).
      const files: [string, any][] = [
        ["cover", require("../../assets/music/cover.wav")],
        ["selection", require("../../assets/music/selection.wav")],
        ["gameplay", require("../../assets/music/gameplay.wav")],
        ["death", require("../../assets/sfx/death.wav")],
        ["coin", require("../../assets/sfx/coin.wav")],
        ["victory", require("../../assets/music/victory.wav")],
        ["move", require("../../assets/sfx/move.wav")],
        ["attack", require("../../assets/sfx/attack.wav")],
        ["monster", require("../../assets/sfx/monster.wav")],
        ["vortex", require("../../assets/sfx/vortex.wav")],
        ["relic", require("../../assets/sfx/relic.wav")],
        ["roar", require("../../assets/sfx/roar.wav")],
      ];
      const handles = await Promise.all(files.map(([name, source]) => prepare(source, name)));
      const p = Object.fromEntries(files.map(([name], i) => [name, handles[i]]));

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
