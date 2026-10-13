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
// Every expo-audio player is a whole ExoPlayer plus a MediaSession on Android, so voices are kept few.
const EXTRA_VOICES: Record<string, number> = { move: 1, coin: 1, attack: 1 };
const voicesOf = (name: string): string[] => [
  name,
  ...Array.from({ length: EXTRA_VOICES[name] ?? 0 }, (_, i) => `${name}#${i + 1}`),
];
/** The sound a voice belongs to (`coin#1` -> `coin`); volume and loop targets are shared per sound. */
const baseOf = (voice: string) => voice.split('#')[0];
const nextVoice: Record<string, number> = {};
/** How long a player may take to become ready (x 100 ms): slow phones and Expo Go need more than 2 s. */
const LOAD_WAIT_ATTEMPTS = 60;
const lastRetry: Record<string, number> = {};
const RETRY_AFTER_MS = 5000;

/**
 * Ensures a player is loaded and syncs target state.
 * Uses a single-flight pattern to prevent concurrent initialization race conditions.
 */
async function ensurePlayer(name: string): Promise<any> {
    const source = GLOBAL_SOURCES[name];
    if (!source) return null;

    // 1. Success case: the voice already exists. A player that is momentarily buffering (right after a seek) reports
    //    `isLoaded === false`, so that flag must NOT be used here: it used to make us build a new native player (and
    //    leak the old one) over and over during play, which is what made sounds stutter and drop.
    if (GLOBAL_PLAYERS[name]) {
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
            while (!player.isLoaded && attempts < LOAD_WAIT_ATTEMPTS) {
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

/** Calls `play` again while the sound is still wanted and its player was not ready: up to 8 tries, 750 ms apart. */
function retryPlay(name: string, attempt: number) {
  if (attempt >= 8) return;
  setTimeout(() => {
    if (!SHOULD_BE_PLAYING[name]) return;
    if (GLOBAL_PLAYERS[name]) {
      void HANDLES[name]?.play();
    } else {
      void ensurePlayer(name).then(() => retryPlay(name, attempt + 1));
    }
  }, 750);
}

const HANDLES: Record<string, LegacySoundHandle> = {};

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

  const handle: LegacySoundHandle = {
    playOneShot: (volume: number) => {
      const voices = voicesOf(name);
      // Strict rotation: consecutive effects always land on different players, so the player that just
      // started never has to be restarted. (`playing` is reported late by the native side, so it cannot be trusted.)
      let tried = 0;
      let voice = voices[0];
      let p: any = null;
      while (tried < voices.length) {
        nextVoice[name] = ((nextVoice[name] ?? -1) + 1) % voices.length;
        voice = voices[nextVoice[name]];
        p = GLOBAL_PLAYERS[voice];
        if (p) break; // existing = usable; `isLoaded` flips to false while a voice is buffering after a seek
        tried++;
      }
      if (!p) {
        // Nothing is loaded (the load failed or Android dropped it): try again in the background for next time,
        // but at most every few seconds: creating players over and over during play is itself a known source
        // of stalls in expo-audio (expo/expo#41852).
        const now = Date.now();
        if (now - (lastRetry[name] ?? 0) > RETRY_AFTER_MS) {
          lastRetry[name] = now;
          for (const v of voices) void ensurePlayer(v);
        }
        return;
      }
      try {
        p.volume = Math.max(0, Math.min(1, volume));
        p.loop = false;
        p.seekTo(0);
        p.play();
      } catch (e) {
        console.warn(`[AudioEngine:${name}] one-shot error:`, e);
      }
    },

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
        if (!SHOULD_BE_PLAYING[name]) return;
        if (!p) {
          // The player is not there yet (slow device, load still running): keep trying for a few seconds so music
          // that was asked for at start-up is not lost for good.
          retryPlay(name, 0);
          return;
        }

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
          if (p) p.volume = v;
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
  HANDLES[name] = handle;
  return handle;
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
      // `interruptionMode` MUST be set explicitly. On Android expo-audio leaves it unset (null) unless told otherwise,
      // and then asks the system for audio focus on every play: any notification, call, assistant or other app's
      // sound takes that focus away and expo-audio pauses ALL players (a permanent loss never resumes them).
      // That is the "sound just disappears" bug. `mixWithOthers` asks for no focus at all, so nothing can pause us.
      await setAudioModeAsync({
        playsInSilentMode: true,
        interruptionMode: 'mixWithOthers',
        shouldPlayInBackground: false,
        allowsRecording: false,
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

  revive: async () => {
    // Only builds voices that do not exist (a failed load). A player that exists is never removed or rebuilt: while it
    // is buffering after a seek it reports isLoaded=false, and rebuilding players during play makes expo-audio stall.
    for (const voice of Object.keys(GLOBAL_SOURCES)) {
      if (!GLOBAL_PLAYERS[voice] && !INITIALIZING_PLAYERS[voice]) void ensurePlayer(voice);
    }
  },

  setVolumeAll: async (vol: number) => {
    const { sounds } = get();
    Object.values(sounds).forEach((s: any) => {
      if (s) s.setVolume(vol);
    });
  },
}));
