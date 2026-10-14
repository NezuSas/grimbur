# Audio design

Why the sound used to "disappear", and how the current design avoids it. Evidence and sources:
`docs/market-research-notes/audio_best_practices.md` (thin on device data: nothing here was measured on a phone yet).

## What was wrong (found by reading the installed `expo-audio` Android sources)

1. **Audio focus.** `setAudioModeAsync` was called without `interruptionMode`. On Android the native module then keeps it
   `null` and asks the system for audio focus on every `play()`. Any notification, call, assistant or another app's sound
   takes that focus away and expo-audio pauses **every** player; a permanent loss is never resumed. Fix: set
   `interruptionMode: 'mixWithOthers'` explicitly (no focus is requested at all).
2. **One player per effect.** A second effect arriving while the first still sounded restarted or swallowed it. Fix: each
   short effect has a few "voices" used in strict rotation (`src/state/sound/store.ts`).
3. **Slow async chain per effect** (set loops, set volume, play) that raced with other effects. Fix: `playOneShot` is
   synchronous.
4. **Repeated starts** of the same music (screen focus fires twice) restarted the track. Fix: starts are idempotent.

5. **`isLoaded` is not "exists".** On Android `isLoaded` is `false` while a player is buffering, which happens right after
   `seekTo(0)`. The store treated that as "not loaded": footsteps were skipped when both voices had just been restarted
   (steps sounded, stopped, sounded again), and `ensurePlayer` built a brand new native player every time it met a
   buffering one (churn, leaks and stalls). Fix: a voice that exists is always usable and is never rebuilt; the flag is
   only used while a player is first loading, and that wait is 6 s instead of 2 s.
6. **A music start was lost for good** if the player was not ready yet (slow phone, Expo Go). Now `play` retries up to
   8 times, 750 ms apart, while the sound is still wanted.

7. **~100 ms between action and sound.** The first real device log (Settings > Share audio log) showed every effect going
   `buffering` for about 100 ms before `ready`: restarting a finished player means a seek, and a seek re-buffers. Now an
   effect rewinds itself in the background the moment it ends, so the next play needs no seek. Looping tracks (music and
   the hazard hums) are paused and resumed, never rewound, and `stop` only touches what is actually sounding (a floor
   change used to pause and seek all six music players at once, right when the fanfare started).

## Rules for new sounds

- Create every player once, at start-up; never create or `remove()` players during play (expo/expo#41852).
- Effects go through `playSfx` (rate limit 45 ms per effect, rotating voices). Looping music and hazard loops go through
  `startLoopingTrack`.
- Each expo-audio player is an ExoPlayer plus a MediaSession on Android: keep the number of voices small
  (`EXTRA_VOICES` in the store).
- Never use `player.isLoaded` to decide whether a voice exists or can be played.
- Going to the background pauses every player (expo-audio does it). On return `revive()` recreates dropped players and
  the manager restarts the current music; `useProximityAudio` restarts the hazard loops.

## If problems remain

Test eight simultaneous effects for ten minutes on a low-end Android phone and an iPhone. If overlap or latency is still
a problem, the next step is `react-native-audio-api` (decode once, one cheap node per play), which needs a development
build and is pre-1.0.

## Sound style: horror

The chiptune set (`scripts/generateAudio.js`) was replaced by a dark one made by `scripts/generateHorrorAudio.py` (same file names, nothing else changes): sub drones with a beating minor second, a slow heartbeat, dripping water, wind, distant whispers, bowed creaks, glassy bells with long reverb, stone footsteps, a breathing growl for guardians and a cold, relieved victory. Loops are crossfaded so they do not click. Each file is scaled to the loudness *a phone speaker plays* (energy above 130 Hz) of the file it replaces, so the volume constants stay valid; sub-bass cannot make a track seem loud. It was verified by analysis only (levels, loop seams, spectrum): nobody has listened to it on a phone yet. Run `python scripts/generateHorrorAudio.py` to regenerate it.

## Loudness standard (2026-10-14)

Every effect is normalised to the same loudness (loudest 250 ms RMS = -12 dBFS) and every music track to -18 dBFS RMS, with
peaks under -1 dBFS and 3 ms fades on effects. How loud each event is then heard is decided in ONE table,
`src/core/audio/mix.ts` (target level in dB per event; the playback volume is derived from it), and `tests/engine/audioMix.test.ts`
reads the real WAV files to keep the files and the table in agreement.

- After regenerating or replacing any audio file, run `python scripts/normalizeAudio.py` (use `--check` to only measure).
- To make an event louder or softer, change its `db` in `mix.ts`, never a magic volume number in `soundManager.ts`.
- Hierarchy: big moments (roar, boss hit, death, relic) > feedback (kill, gems, power-ups) > constant feedback (steps, misses,
  warnings) > danger hums > music. The player's music and effects settings scale on top.
- Start-up loads the first sounds (steps, gems, shot, cover music) first, then the rest one by one, and the splash screen waits for
  all of them (up to 9 s, with a progress bar) so nothing loads later during play. See App.tsx and src/core/startup/progress.ts.
