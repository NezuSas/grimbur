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

## Rules for new sounds

- Create every player once, at start-up; never create or `remove()` players during play (expo/expo#41852).
- Effects go through `playSfx` (rate limit 45 ms per effect, rotating voices). Looping music and hazard loops go through
  `startLoopingTrack`.
- Each expo-audio player is an ExoPlayer plus a MediaSession on Android: keep the number of voices small
  (`EXTRA_VOICES` in the store).
- Going to the background pauses every player (expo-audio does it). On return `revive()` recreates dropped players and
  the manager restarts the current music; `useProximityAudio` restarts the hazard loops.

## If problems remain

Test eight simultaneous effects for ten minutes on a low-end Android phone and an iPhone. If overlap or latency is still
a problem, the next step is `react-native-audio-api` (decode once, one cheap node per play), which needs a development
build and is pre-1.0.
