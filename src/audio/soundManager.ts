import { useEffect, useRef } from "react";
import { AppState, AppStateStatus } from "react-native";
import { onSound } from "./audioEventBus";
import { SoundEvent } from "./soundEvents";
import { useSoundStore } from "../state/sound/store";
import { useSettingsStore } from "../state/settings/store";
import { LegacySoundHandle } from "../state/sound/types";

// Dynamic volume offsets
const MUSIC_VOL = 0.12;
const SFX_VOL = 0.45;
const HAZARD_VOL = 0.10;
const VICTORIA_VOL = 0.30;

/** Utility to stop a track without crashing if busy */
const stopTrack = (handle: LegacySoundHandle | null) => {
  if (!handle) return;
  handle.stop().catch(e => console.warn("[SoundManager] stop error:", e));
};

export function useSoundManager(): void {
  const { sounds: currentSounds, ready } = useSoundStore();
  const { soundEnabled: currentSoundEnabled } = useSettingsStore();
  
  const soundsRef = useRef(currentSounds);
  const soundEnabledRef = useRef(currentSoundEnabled);
  const lastMusicIntent = useRef<SoundEvent | null>(null);

  useEffect(() => { soundsRef.current = currentSounds; }, [currentSounds]);
  useEffect(() => { soundEnabledRef.current = currentSoundEnabled; }, [currentSoundEnabled]);

  /** Fast playback for SFX */
  const playSfx = (handle: LegacySoundHandle | null, vol: number = SFX_VOL) => {
    if (!handle || !soundEnabledRef.current) return;
    handle.setNumberOfLoops(0).then(() => {
      handle.setVolume(vol).then(() => {
        handle.play();
      });
    });
  };

  /** One-shot play (stops loop, plays once at given volume) */
  const playOnce = (handle: LegacySoundHandle | null, vol: number = SFX_VOL) => {
    if (!handle || !soundEnabledRef.current) return;
    handle.stop().catch(() => {}).finally(() => {
      handle.setNumberOfLoops(0).then(() => {
        handle.setVolume(vol).then(() => handle.play());
      });
    });
  };

  /** Fast looping for BGM */
  const startLoopingTrack = (handle: LegacySoundHandle | null, vol: number = MUSIC_VOL) => {
    if (!handle || !soundEnabledRef.current) return;
    handle.setNumberOfLoops(-1).then(() => {
      handle.setVolume(vol).then(() => {
        handle.play();
      });
    });
  };

  /** Stops ONLY music/hazard loops, leaving SFX alone */
  const stopAllBackgroundMusic = (reason: string = "general") => {
    const s = soundsRef.current;
    if (!s) return;
    console.log(`[SoundManager] Nuclear Stop. Reason: ${reason}`);
    
    // Specifically target long-running tracks that can leak
    stopTrack(s.cover);
    stopTrack(s.selection);
    stopTrack(s.gameplay);
    stopTrack(s.monster);
    stopTrack(s.vortex);
    stopTrack(s.victory);
  };

  const processEvent = (event: SoundEvent) => {
    const sounds = soundsRef.current;
    const soundEnabled = soundEnabledRef.current;
    if (!sounds || !ready) return;

    const isStopEvent = event.includes('STOP') || event === 'QUIT' || event === 'GAME_MUSIC_STOP';
    if (!soundEnabled && !isStopEvent && event !== 'LEVEL_UP' && event !== 'GAME_OVER') return;

    console.log(`[SoundManager] -> ${event}`);

    // Update intent for global BGM tracks
    if (['COVER_SCREEN_START', 'GAME_MUSIC_START', 'SELECTION_SCREEN_START'].includes(event)) {
      lastMusicIntent.current = event;
    }

    switch (event) {
      case 'MOVE':           playSfx(sounds.move, 0.4); break;
      case 'COIN_COLLECTED': playSfx(sounds.coin); break;
      case 'POWERUP':        playSfx(sounds.coin, 0.6); break;
      case 'TRAP_TRIGGERED': playSfx(sounds.attack, 0.7); break;
      case 'ATTACK':
      case 'ENEMY_KILLED':   playSfx(sounds.attack); break;

      case 'LEVEL_UP':
        stopAllBackgroundMusic("level_up");
        // Delay victory SFX slightly to avoid mixer clash
        setTimeout(() => playSfx(sounds.victory, VICTORIA_VOL), 80);
        break;

      case 'LEVEL_RESUME':
        stopTrack(sounds.victory);
        startLoopingTrack(sounds.gameplay, MUSIC_VOL);
        break;

      case 'GAME_OVER':
        stopAllBackgroundMusic("game_over");
        playSfx(sounds.death, VICTORIA_VOL);
        break;

      case 'COVER_SCREEN_START':
        stopAllBackgroundMusic("cover_start");
        startLoopingTrack(sounds.cover, MUSIC_VOL);
        break;

      case 'GAME_MUSIC_START':
        stopAllBackgroundMusic("game_start");
        startLoopingTrack(sounds.gameplay, MUSIC_VOL);
        break;

      case 'GAME_MUSIC_STOP':
        // Only stop gameplay-specific loops to prevent killing victory/death SFX
        stopTrack(sounds.gameplay);
        stopTrack(sounds.monster);
        stopTrack(sounds.vortex);
        break;

      case 'SELECTION_SCREEN_START':
        stopAllBackgroundMusic("selection_start");
        startLoopingTrack(sounds.selection, MUSIC_VOL);
        break;

      case 'SELECTION_SCREEN_STOP':
        stopTrack(sounds.selection);
        break;

      case 'GUARDIAN_NEAR':      startLoopingTrack(sounds.monster, HAZARD_VOL); break;
      case 'STOP_GUARDIAN_NEAR': stopTrack(sounds.monster); break;
      case 'VORTEX_NEAR':       startLoopingTrack(sounds.vortex, HAZARD_VOL); break;
      case 'STOP_VORTEX_NEAR':  stopTrack(sounds.vortex); break;
      case 'VORTEX_TELEPORT':   playOnce(sounds.vortex, 0.85); break;

      case 'QUIT':            stopAllBackgroundMusic("quit"); break;
    }
  };

  /** Reactive Toggle & Initial Boot */
  useEffect(() => {
    if (!ready) return;

    if (!currentSoundEnabled) {
      stopAllBackgroundMusic("settings_off");
    } else if (lastMusicIntent.current) {
      processEvent(lastMusicIntent.current);
    } else {
      // Force initial portada if no intent yet (fresh boot)
      processEvent('COVER_SCREEN_START');
    }
  }, [currentSoundEnabled, ready]);

  /** App Subscription */
  useEffect(() => {
    if (!ready) return;
    const unsubscribeBus = onSound(processEvent);

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && soundEnabledRef.current && lastMusicIntent.current) {
        processEvent(lastMusicIntent.current);
      }
    };
    const appStateSub = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      unsubscribeBus();
      appStateSub.remove();
    };
  }, [ready]);
}
