import { useEffect, useRef } from "react";
import { AppState, AppStateStatus } from "react-native";
import { onSound, SoundOptions } from "./audioEventBus";
import { SoundEvent } from "./soundEvents";
import { useSoundStore } from "../state/sound/store";
import { useSettingsStore } from "../state/settings/store";
import { LegacySoundHandle } from "../state/sound/types";
import { audioLog } from "./audioDiagnostics";
import { scaledVolume } from "../core/audio/volume";
import { mixVolume } from "../core/audio/mix";

// Playback volumes come from the mix table (core/audio/mix.ts): every sound is aimed at a loudness in dB, so none is
// louder than it should be just because its recording was.
const MUSIC_VOL = mixVolume('music');
const SFX_VOL = mixVolume('coin');
const HAZARD_VOL = mixVolume('hazard');
const FANFARE_VOL = mixVolume('fanfare');
/** The same effect is never started twice within this many milliseconds. */
const MIN_REPEAT_MS = 45;

/**
 * Every start/stop bumps a per-track counter. A start that is still waiting on the native player
 * checks it again before playing, so a quick STOP right after a START always wins.
 */
const epochs = new WeakMap<LegacySoundHandle, number>();
const epochOf = (handle: LegacySoundHandle) => epochs.get(handle) ?? 0;
const bumpEpoch = (handle: LegacySoundHandle) => {
  const next = epochOf(handle) + 1;
  epochs.set(handle, next);
  return next;
};

/** Utility to stop a track without crashing if busy */
const stopTrack = (handle: LegacySoundHandle | null) => {
  if (!handle) return;
  bumpEpoch(handle);
  handle.stop().catch(e => console.warn("[SoundManager] stop error:", e));
};

export function useSoundManager(): void {
  // Each value on its own: this hook lives in the root component, and subscribing to a whole store re-rendered the entire
  // app whenever ANY setting changed (a hint marked as seen, a toggle in Settings...).
  const currentSounds = useSoundStore(s => s.sounds);
  const ready = useSoundStore(s => s.ready);
  const currentSoundEnabled = useSettingsStore(s => s.soundEnabled);
  const musicVolume = useSettingsStore(s => s.musicVolume);
  const sfxVolume = useSettingsStore(s => s.sfxVolume);
  
  const soundsRef = useRef(currentSounds);
  const soundEnabledRef = useRef(currentSoundEnabled);
  /** Player-chosen levels (percent) applied on top of each track's mix volume. */
  const musicLevelRef = useRef(musicVolume);
  const sfxLevelRef = useRef(sfxVolume);
  const lastMusicIntent = useRef<SoundEvent | null>(null);
  /** The music event whose track is playing now, so a repeated start (screen focus fires twice) never restarts it. */
  const activeMusic = useRef<SoundEvent | null>(null);

  useEffect(() => { soundsRef.current = currentSounds; }, [currentSounds]);
  useEffect(() => { soundEnabledRef.current = currentSoundEnabled; }, [currentSoundEnabled]);
  useEffect(() => {
    musicLevelRef.current = musicVolume;
    sfxLevelRef.current = sfxVolume;
    // Tracks that are already sounding follow the new level right away.
    const s = soundsRef.current;
    if (!s) return;
    for (const track of [s.cover, s.selection, s.gameplay]) track?.setVolume(scaledVolume(MUSIC_VOL, musicVolume)).catch(() => {});
    for (const track of [s.monster, s.vortex]) track?.setVolume(scaledVolume(HAZARD_VOL, sfxVolume)).catch(() => {});
  }, [musicVolume, sfxVolume]);

  /** Effects that fire twice for one event (a shot that also kills) sound once. */
  const lastPlayed = useRef(new WeakMap<LegacySoundHandle, number>());

  /** Fast playback for SFX: synchronous, on the next free voice, never waits on another effect. */
  const playSfx = (handle: LegacySoundHandle | null, vol: number = SFX_VOL, rate: number = 1) => {
    if (!handle || !soundEnabledRef.current) return;
    const now = Date.now();
    if (now - (lastPlayed.current.get(handle) ?? 0) < MIN_REPEAT_MS) return;
    lastPlayed.current.set(handle, now);
    handle.playOneShot(scaledVolume(vol, sfxLevelRef.current), rate);
  };

  /** One-shot play (stops loop, plays once at given volume) */
  const playOnce = (handle: LegacySoundHandle | null, vol: number = SFX_VOL) => {
    if (!handle || !soundEnabledRef.current) return;
    const ticket = bumpEpoch(handle); // a stop that arrives while this is still being prepared wins
    handle.stop().catch(() => {}).finally(() => {
      handle
        .setNumberOfLoops(0)
        .then(() => {
          if (epochOf(handle) !== ticket) return;
          return handle.setVolume(scaledVolume(vol, sfxLevelRef.current)).then(() => {
            if (epochOf(handle) === ticket) handle.play();
          });
        })
        .catch(() => {});
    });
  };

  /** Fast looping for BGM */
  const startLoopingTrack = (handle: LegacySoundHandle | null, vol: number = MUSIC_VOL, level: 'music' | 'sfx' = 'music') => {
    if (!handle || !soundEnabledRef.current) return;
    const ticket = bumpEpoch(handle);
    handle.setNumberOfLoops(-1).then(() => {
      if (epochOf(handle) !== ticket) return; // stopped (or restarted) while loading
      handle.setVolume(scaledVolume(vol, level === 'music' ? musicLevelRef.current : sfxLevelRef.current)).then(() => {
        if (epochOf(handle) !== ticket) return;
        handle.play();
      });
    });
  };

  /** Stops ONLY music/hazard loops, leaving SFX alone */
  const stopAllBackgroundMusic = (reason: string = "general") => {
    const s = soundsRef.current;
    if (!s) return;
    audioLog('music', `stop all background audio: ${reason}`);
    activeMusic.current = null;
    
    // Specifically target long-running tracks that can leak
    stopTrack(s.cover);
    stopTrack(s.selection);
    stopTrack(s.gameplay);
    stopTrack(s.monster);
    stopTrack(s.vortex);
    stopTrack(s.victory);
  };

  const processEvent = (event: SoundEvent, options?: SoundOptions) => {
    const rate = options?.rate ?? 1;
    const sounds = soundsRef.current;
    const soundEnabled = soundEnabledRef.current;
    if (!sounds || !ready) {
      audioLog('event', `${event} IGNORED (audio not ready)`);
      return;
    }

    const isStopEvent = event.includes('STOP') || event === 'QUIT' || event === 'GAME_MUSIC_STOP';
    if (!soundEnabled && !isStopEvent && event !== 'LEVEL_UP' && event !== 'GAME_OVER') return;

    audioLog('event', event);

    // Once a run ends or the player leaves, coming back to the app must not restart the gameplay loop.
    if (event === 'GAME_OVER' || event === 'GAME_MUSIC_STOP' || event === 'QUIT') lastMusicIntent.current = null;
    if (event === 'LEVEL_RESUME') lastMusicIntent.current = 'GAME_MUSIC_START';

    // Update intent for global BGM tracks
    if (['COVER_SCREEN_START', 'GAME_MUSIC_START', 'SELECTION_SCREEN_START'].includes(event)) {
      lastMusicIntent.current = event;
    }

    switch (event) {
      case 'MOVE':           playSfx(sounds.move, mixVolume('step')); break;
      case 'COIN_COLLECTED': playSfx(sounds.coin, mixVolume('coin'), rate); break;
      case 'POWERUP':        playSfx(sounds.coin, mixVolume('powerup')); break;
      case 'RELIC_PICKED':   playSfx(sounds.relic, mixVolume('relic')); break;
      case 'BOSS_ROAR':      playOnce(sounds.roar, mixVolume('roar')); break;
      // The same recordings, played at different speeds and levels, so a hit, a miss, a kill and a trap all sound apart.
      case 'TRAP_TRIGGERED': playSfx(sounds.attack, mixVolume('trap'), 0.55); break;
      case 'ATTACK':         playSfx(sounds.attack, mixVolume('miss'), 0.92); break;
      case 'ENEMY_KILLED':   playSfx(sounds.attack, mixVolume('kill'), 1.25 * rate); setTimeout(() => playSfx(sounds.coin, mixVolume('killTail'), 1.4 * rate), 60); break;
      case 'BOSS_HIT':       playSfx(sounds.attack, mixVolume('bossHit'), 0.8); setTimeout(() => playSfx(sounds.attack, mixVolume('bossEcho'), 0.65), 70); break;
      case 'SHIELD_BREAK':   playSfx(sounds.death, mixVolume('shieldCrack'), 1.9); playSfx(sounds.attack, mixVolume('shieldThud'), 0.7); break;
      case 'CHARGE_WARN':    playSfx(sounds.move, mixVolume('charge'), 0.55); setTimeout(() => playSfx(sounds.move, mixVolume('charge'), 0.45), 110); break;
      case 'UI_TAP':         playSfx(sounds.ui, mixVolume('uiTap')); break;
      case 'FORGE_HAMMER':   playSfx(sounds.forge, mixVolume('forgeHammer')); break;
      case 'EMBER_GAIN':     playSfx(sounds.ember, mixVolume('emberGain')); break;

      case 'LEVEL_UP':
        stopAllBackgroundMusic("level_up");
        // Delay victory SFX slightly to avoid mixer clash
        setTimeout(() => playSfx(sounds.victory, FANFARE_VOL), 80);
        break;

      case 'LEVEL_RESUME':
        stopTrack(sounds.victory);
        startLoopingTrack(sounds.gameplay, MUSIC_VOL);
        activeMusic.current = 'GAME_MUSIC_START';
        break;

      case 'GAME_OVER':
        stopAllBackgroundMusic("game_over");
        playSfx(sounds.death, mixVolume('death'));
        break;

      case 'COVER_SCREEN_START':
        if (activeMusic.current === event) {
          audioLog('music', 'cover already playing, start skipped');
          break;
        }
        stopAllBackgroundMusic("cover_start");
        startLoopingTrack(sounds.cover, MUSIC_VOL);
        activeMusic.current = event;
        break;

      case 'GAME_MUSIC_START':
        if (activeMusic.current === event) {
          audioLog('music', 'gameplay already playing, start skipped');
          break;
        }
        stopAllBackgroundMusic("game_start");
        startLoopingTrack(sounds.gameplay, MUSIC_VOL);
        activeMusic.current = event;
        break;

      case 'GAME_MUSIC_STOP':
        // Only stop gameplay-specific loops to prevent killing victory/death SFX
        if (activeMusic.current === 'GAME_MUSIC_START') activeMusic.current = null;
        stopTrack(sounds.gameplay);
        stopTrack(sounds.monster);
        stopTrack(sounds.vortex);
        break;

      case 'SELECTION_SCREEN_START':
        if (activeMusic.current === event) {
          audioLog('music', 'selection already playing, start skipped');
          break;
        }
        stopAllBackgroundMusic("selection_start");
        startLoopingTrack(sounds.selection, MUSIC_VOL);
        activeMusic.current = event;
        break;

      case 'SELECTION_SCREEN_STOP':
        if (activeMusic.current === 'SELECTION_SCREEN_START') activeMusic.current = null;
        stopTrack(sounds.selection);
        break;

      case 'GUARDIAN_NEAR':      startLoopingTrack(sounds.monster, HAZARD_VOL, 'sfx'); break;
      case 'STOP_GUARDIAN_NEAR': stopTrack(sounds.monster); break;
      case 'VORTEX_NEAR':       startLoopingTrack(sounds.vortex, HAZARD_VOL, 'sfx'); break;
      case 'STOP_VORTEX_NEAR':  stopTrack(sounds.vortex); break;
      case 'VORTEX_TELEPORT':   playOnce(sounds.vortex, mixVolume('teleport')); break;

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
    const unsubscribeBus = onSound((event, options) => processEvent(event, options));

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      audioLog('app', nextAppState);
      if (nextAppState === 'active') void useSoundStore.getState().revive();
      if (nextAppState === 'active' && soundEnabledRef.current && lastMusicIntent.current) {
        activeMusic.current = null; // the OS may have paused the track while we were away: restart it
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
