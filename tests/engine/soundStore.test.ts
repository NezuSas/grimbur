/**
 * The sound store drives native players. These tests replace expo-audio with fakes that behave like the real
 * Android player in the one way that matters here: right after a seek a player is "buffering" and reports
 * `isLoaded === false`.
 */
interface FakePlayer {
  id: number;
  isLoaded: boolean;
  playing: boolean;
  volume: number;
  loop: boolean;
  plays: number;
  seeks: number;
  /** ExoPlayer's playWhenReady: still true after a track ends, so a seek to 0 restarts playback. */
  wantsPlay: boolean;
  /** Times the player started sounding without anybody calling play (a seek after the end, with wantsPlay on). */
  selfStarts: number;
  listener?: (status: Record<string, unknown>) => void;
  addListener(event: string, cb: (status: Record<string, unknown>) => void): void;
  finish(): void;
  play(): void;
  pause(): void;
  seekTo(t: number): void;
  remove(): void;
}

const created: FakePlayer[] = [];
let buffering = false; // when true, every new seek leaves the player buffering (isLoaded=false)

jest.mock('react-native', () => ({ Platform: { OS: 'ios' } }));
jest.mock('expo-asset', () => ({
  Asset: { fromModule: () => ({ localUri: 'file://x.wav', uri: 'file://x.wav', downloadAsync: async () => {} }) },
}));
jest.mock('expo-audio', () => ({
  setAudioModeAsync: jest.fn(async () => {}),
  createAudioPlayer: () => {
    const p: FakePlayer = {
      id: created.length,
      isLoaded: true,
      playing: false,
      volume: 1,
      loop: false,
      plays: 0,
      seeks: 0,
      wantsPlay: false,
      selfStarts: 0,
      addListener(_event: string, cb: (status: Record<string, unknown>) => void) { this.listener = cb; },
      finish() { this.playing = false; this.listener?.({ playing: false, isLoaded: true, playbackState: 'ended', didJustFinish: true }); },
      play() { this.plays += 1; this.playing = true; this.wantsPlay = true; },
      pause() { this.playing = false; this.wantsPlay = false; },
      seekTo() {
        this.seeks += 1;
        if (buffering) this.isLoaded = false;
        if (this.wantsPlay && !this.playing) { this.playing = true; this.selfStarts += 1; }
      },
      remove() {},
    };
    created.push(p);
    return p;
  },
}));

import { setAudioModeAsync } from 'expo-audio';
import { useSoundStore } from '../../src/state/sound/store';

beforeAll(async () => {
  await useSoundStore.getState().init();
});

describe('sound store', () => {
  it('asks Android for no audio focus, so other sounds can never pause every player', () => {
    expect(setAudioModeAsync).toHaveBeenCalledWith(expect.objectContaining({ interruptionMode: 'mixWithOthers' }));
  });

  it('builds each player exactly once, however often it is used afterwards', async () => {
    const before = created.length;
    const { sounds } = useSoundStore.getState();
    buffering = true;
    for (let i = 0; i < 20; i++) {
      sounds.move!.playOneShot(0.4);
      sounds.coin!.playOneShot(0.4); // leaves that voice buffering (isLoaded=false)
      await sounds.coin!.setNumberOfLoops(0);
    }
    expect(created.length).toBe(before);
    buffering = false;
  });

  it('still plays a footstep when every voice is buffering after a seek', () => {
    const { sounds } = useSoundStore.getState();
    buffering = true;
    const voices = created.filter(p => p.plays >= 0);
    const totalBefore = voices.reduce((n, p) => n + p.plays, 0);
    for (let i = 0; i < 10; i++) sounds.move!.playOneShot(0.4);
    const totalAfter = created.reduce((n, p) => n + p.plays, 0);
    expect(totalAfter - totalBefore).toBe(10); // none of the ten steps was swallowed
    buffering = false;
  });

  it('rotates effects across voices instead of restarting the one that just started', () => {
    const { sounds } = useSoundStore.getState();
    const before = created.map(p => p.plays);
    sounds.attack!.playOneShot(0.7);
    sounds.attack!.playOneShot(0.7);
    const touched = created.filter((p, i) => p.plays !== before[i]);
    expect(touched).toHaveLength(2);
  });

  it('never lets a finished effect start playing again by itself (the Android loop bug)', () => {
    const { sounds } = useSoundStore.getState();
    // ExoPlayer keeps "play when ready" after a track ends, so rewinding it without pausing replays it forever.
    sounds.coin!.playOneShot(0.7);
    sounds.coin!.playOneShot(0.7);
    const sounding = created.filter(p => p.playing);
    expect(sounding.length).toBeGreaterThan(0);
    sounding.forEach(p => p.finish());
    // Nothing was started by the rewind: no player restarted by itself and none is sounding.
    expect(created.reduce((n, p) => n + p.selfStarts, 0)).toBe(0);
    expect(created.some(p => p.playing)).toBe(false);
  });

  it('rewinds an effect when it ends, so the next one starts at once with no seek (and no 100 ms re-buffer)', () => {
    const { sounds } = useSoundStore.getState();
    const voices = created.filter(p => p.plays >= 0);
    // Play the step on both of its voices, let both end, then play two more: no seek may happen for those two.
    sounds.move!.playOneShot(0.4);
    sounds.move!.playOneShot(0.4);
    sounds.move!.playOneShot(0.4);
    const moveVoices = voices.filter(p => p.playing);
    moveVoices.forEach(p => p.finish());
    const seeksBefore = created.reduce((n, p) => n + p.seeks, 0);
    sounds.move!.playOneShot(0.4);
    sounds.move!.playOneShot(0.4);
    const seeksAfter = created.reduce((n, p) => n + p.seeks, 0);
    expect(seeksAfter).toBe(seeksBefore);
  });
});
