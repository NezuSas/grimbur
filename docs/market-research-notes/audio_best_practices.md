# Audio best practices for a small Expo game (research notes, 2026-10-13)

Evidence is thin: about 10 fetches. Several pages came back truncated or summarized by the fetch tool. Nothing here was verified on a device.

## 1. Findings (cited)

### Native approaches
- Android Oboe: a C++ library for low-latency audio. It uses AAudio on API 27+ and OpenSL ES below that. Google says to request low-latency performance mode, exclusive sharing and the game usage type explicitly, because the default mode is higher latency. https://developer.android.com/games/sdk/oboe/low-latency-audio
- MediaPlayer is described (course slides) as meant for long media and a poor fit for short game effects. The same slides say SoundPool loads short samples into memory, caps concurrent streams (maxStreams), drops low-priority streams when the cap is hit, and supports loop and rate. https://courses.edx.org/asset-v1:HKUSTx+COMP107x+3T2016+type@asset+block/Week04-MediaPlayer.pdf (secondary source)
- libGDX uses SoundPool for effects and MediaPlayer for music. Its docs say SoundPool latency is not great for rhythm games and many simultaneous sounds can hurt some devices. https://libgdx.com/wiki/audio/audio
- Overview of Android audio APIs: https://www.ackee.cz/blog/en/android-high-performance-audio-apis/ (only skimmed through the search summary).
- The official SoundPool reference page could not be read; the fetch only returned the navigation sidebar. So the maxStreams default, the stealing rule and the size limits are NOT verified here.
- No iOS source (AVAudioEngine, AVAudioPlayerNode, AudioServices) was successfully retrieved.

### expo-audio docs (https://docs.expo.dev/versions/latest/sdk/audio/)
- `useAudioPlayer` releases the player on unmount. `createAudioPlayer` does not release automatically, and the docs warn of memory leaks if you do not release it.
- The replay example is `player.seekTo(0)` then `player.play()`. The docs do not say what `play()` does after a finish. A third-party guide says the player stays paused at the end after finishing, so you must seek back. https://www.vibeindex.ai/skills/jchaselubitz/drill-app/expo-audio (low-quality source)
- `AudioStatus.didJustFinish` exists.
- `interruptionMode` options are doNotMix, duckOthers and mixWithOthers (default). With mixWithOthers on Android, the app does not receive audio focus loss callbacks (for example, phone calls). `interruptionModeAndroid` is deprecated.
- `shouldPlayInBackground` defaults to false.
- There is a module-scope `preload` API. On iOS, sources are removed from the preload list once consumed. On Android and web they stay until cleared.
- The docs list expo-audio as included in Expo Go. Config-plugin options need a rebuild.
- `updateInterval` defaults to 500 ms.

### expo-audio issues
- expo/expo#41852 (open, last confirmed Jul 2026 on expo 57.0.8 and expo-audio 57.0.3):
  - Creating a new player per short clip and calling `remove()` on `didJustFinish` stops working after about 40 plays on Android. `didJustFinish` stops arriving. It reproduced in Expo Go and dev builds.
  - A commenter says iOS stops after 4-5 minutes of many create/cleanup cycles.
  - Community workaround: also call `player.release()` after `remove()`, and reuse players. Not confirmed by maintainers.
  - https://github.com/expo/expo/issues/41852
- #42773 (linked from the above): the docs for `release()` versus `remove()` are unclear.
- #47458 (open): NativeSharedObjectNotFoundException after navigation, when native objects are released while JS still holds a reference. https://github.com/expo/expo/issues/47458
- PR #50104: Android creates a platform MediaSession per player, which can hit the per-app session limit and crash player creation. https://github.com/expo/expo/pull/50104 (the PR was not checked to see whether it merged).
- PR #49880 proposes defaulting `enableBackgroundPlayback` to false. https://github.com/expo/expo/pull/49880

### react-native-audio-api (Software Mansion)
- Not in Expo Go. It needs a development build (`npx expo run:ios` or `run:android`, or EAS). The Expo config plugin is optional, except that microphone permission is mandatory if you use AudioRecorder. https://docs.swmansion.com/react-native-audio-api/docs/fundamentals/getting-started
- An AudioBufferSourceNode can be started only once. To replay, create a new node and reuse the AudioBuffer. Keep one AudioContext per app, as a singleton. https://docs.swmansion.com/react-native-audio-api/docs/next/fundamentals/getting-started and https://www.skills.sh/software-mansion-labs/skills/audio (via search summary)
- It is actively released: 0.13.2 to 0.13.6 between Jul and Sep 2026. These included an iOS engine infinite-recursion crash fix (0.13.2) and an iOS race-condition fix (0.13.4). Pre-1.0, with breaking changes in patch releases. https://api.github.com/repos/software-mansion/react-native-audio-api/releases
- The README does not state New Architecture or RN version requirements, or production readiness. https://github.com/software-mansion/react-native-audio-api

## 2. Inferences (mine, not sourced)
- The industry pattern is: short effects decoded into memory with a polyphony cap, and music streamed through a separate player. This matches the SoundPool and libGDX evidence, but I did not find explicit sources for iOS or for typical maxStreams values. Commonly cited values (about 8-32 streams) are from memory.
- For about 8 effects under 1 s, the main expo-audio risk is not latency. It is native-object lifecycle: creating and destroying players churns ExoPlayer and AVPlayer instances (see #41852). So create all players once at startup, never create or remove per play, and keep strong references at module scope.
- Voice pool design for expo-audio:
  - Allocate 2-4 `createAudioPlayer(src)` instances per effect, depending on how often it overlaps. Rarely overlapping effects need 1-2.
  - Use round-robin. If the next voice is still playing, steal it with `seekTo(0)` and `play()`.
  - Rate-limit identical effects to about 40-60 ms.
  - Expect `seekTo(0)` followed by `play()` to have a tiny async race, and not to be sample-accurate.
  - Never call `remove()` or `release()` during gameplay. Only on app teardown.
- Use a separate single looping player for music. Do the crossfade by volume ramps in JS. Pause it on AppState "background" and resume on "active".
- Set `setAudioModeAsync` once with `playsInSilentMode: true`, `shouldPlayInBackground: false` and `interruptionMode: 'mixWithOthers'` (or doNotMix to get focus callbacks). Use a global mute flag that sets volume to 0 or pauses.
- Recommendation:
  - Keep expo-audio with pooled, preloaded, never-destroyed players. This is the lowest risk, works in Expo Go and keeps your current setup.
  - Move to react-native-audio-api only if you measure unacceptable latency or overlap glitches on real devices. The cost is a dev build (a one-time hit on a project that already builds natively), a pre-1.0 dependency, and unverified RN 0.86 / SDK 57 compatibility.
  - Its model is a better fit for overlaps: decode each effect once into an AudioBuffer and spawn a cheap one-shot node per play. That gives no per-voice reload and unlimited-ish polyphony.
  - A reasonable plan is to hide audio behind a small `playSfx(name)` interface so the backend can be swapped.

## 3. Gaps
- No official or confirmed SoundPool details (maxStreams default, stealing, size limits), and no AVAudioEngine or AVAudioPlayer comparison.
- No evidence from shipped games or professional engines (FMOD, Wwise, Unity), beyond libGDX.
- No benchmarks of expo-audio latency or overlap. Zero measured numbers.
- Could not read most expo/expo GitHub issues in detail. Nothing was found on: play() while already playing, the seekTo-then-play race, volume resets on Android, `playing` / `isLoaded` lag. They may exist but were not found.
- Unconfirmed whether #41852 affects pooled, reused players, or only create/remove churn. The pool design assumes the latter.
- react-native-audio-api: no confirmation of Expo SDK 57 / RN 0.86 / New Architecture compatibility, and no latency numbers.
- Whether expo-audio's `preload` helps sound effects on Android is unknown.
- Behaviour on audio interruptions (phone calls) in expo-audio under mixWithOthers is only inferred from one docs sentence.
- Worth doing next: an on-device test on one low-end Android phone and one iPhone, with 8 simultaneous effects over a 10-minute session.
