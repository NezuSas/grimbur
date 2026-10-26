import AsyncStorage from '@react-native-async-storage/async-storage';
import type { GameState } from '../core/engine/types';
import type { MetaEffects } from '../core/stats/forge';
import type { SkinId } from '../data/skinArt';
import type { Character } from '../data/characters';

const STORAGE_KEY = 'grimbur.run.v1';

/**
 * An expedition in progress, written when the game goes to the background or the player leaves to the menu,
 * so Android killing the process (or "Menú" itself) never costs a ten-floor run. Only expeditions and endless
 * runs are saved: the daily is tied to its date, and challenges and duels are live.
 */
export type SavedRun = {
  v: 1;
  /** When it was saved (epoch ms). */
  at: number;
  characterIndex: number;
  skin: SkinId;
  ascension: number;
  /** The Forge effects the run started with (free revive, starting relics): the screen needs them again. */
  meta?: MetaEffects;
  /** Seconds already played. */
  time: number;
  state: GameState;
};

/** The modes a run can be saved and continued in. */
export const canResumeMode = (mode: GameState['mode']) => mode === 'expedition' || mode === 'endless';

/** True while the board is actually being played: between floors (card, draft, shop) too much lives outside the engine. */
export const canSaveState = (s: GameState) =>
  canResumeMode(s.mode) && !s.isGameOver && !s.isVictory && !s.isLevelUp && !s.pendingDraft && (s.turn > 0 || s.level > 1);

/** The hero pictures are looked up again on load (require ids change between app versions), so none are written. */
type Snapshot = { selectedCharacter: Character | null; undo?: Snapshot | null; lastBreath?: Snapshot | null };
function withCharacter<T extends Snapshot>(node: T, character: Character | null): T {
  const out: T = { ...node, selectedCharacter: character };
  if (out.undo) out.undo = withCharacter(out.undo, character);
  if (out.lastBreath) out.lastBreath = withCharacter(out.lastBreath, character);
  return out;
}

export async function saveRun(run: Omit<SavedRun, 'v' | 'at'>): Promise<void> {
  if (!canSaveState(run.state)) return;
  try {
    const payload: SavedRun = { v: 1, at: Date.now(), ...run, state: withCharacter(run.state, null) };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (e) {
    console.warn('[savedRun] saving the run failed:', e);
  }
}

/** The saved run, or null when there is none or it cannot be trusted (then it is discarded). */
export async function loadSavedRun(): Promise<SavedRun | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const run = JSON.parse(raw) as SavedRun;
    const s = run?.state;
    if (
      run?.v !== 1 ||
      typeof run.characterIndex !== 'number' ||
      typeof run.time !== 'number' ||
      !s ||
      typeof s.level !== 'number' ||
      s.level < 1 ||
      typeof s.playerIndex !== 'number' ||
      !Array.isArray(s.entities) ||
      !Array.isArray(s.visited) ||
      !canSaveState(s)
    ) {
      await clearSavedRun();
      return null;
    }
    return run;
  } catch (e) {
    console.warn('[savedRun] reading the saved run failed:', e);
    await clearSavedRun();
    return null;
  }
}

export async function clearSavedRun(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to do: a stale save is caught by validation on the next read.
  }
}

/** Reattaches the hero pictures before the state goes back into the engine. */
export function restoredState(run: SavedRun, character: Character): GameState {
  return withCharacter(run.state, character);
}
