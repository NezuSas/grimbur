import * as Clipboard from 'expo-clipboard';
import { DecodeResult, decodeBackup, encodeBackup } from '../core/stats/backup';
import type { BackupSettings } from '../core/stats/backup';
import { getLocalStats, replaceLocalStats } from './localStats';
import { useSettingsStore } from '../state/settings/store';

/** The player's progress as a backup code, or null if it could not be read. Never throws. */
export async function createBackupCode(): Promise<string | null> {
  try {
    const s = useSettingsStore.getState();
    const settings: BackupSettings = {
      soundEnabled: s.soundEnabled,
      musicVolume: s.musicVolume,
      sfxVolume: s.sfxVolume,
      hapticsEnabled: s.hapticsEnabled,
      reduceFlash: s.reduceFlash,
      controlPosition: s.controlPosition,
      attackButton: s.attackButton,
      controlSize: s.controlSize,
      swipeMove: s.swipeMove,
      dragAim: s.dragAim,
      language: s.language,
      tutorialSeen: s.tutorialSeen,
      achievementsSeen: s.achievementsSeen,
      hintsSeen: s.hintsSeen,
    };
    return encodeBackup(await getLocalStats(), settings);
  } catch (e) {
    console.warn('[Backup] export failed', e);
    return null;
  }
}

/** Copies the backup code to the clipboard. Resolves with the code, or null when it could not be copied. */
export async function copyBackupCode(): Promise<string | null> {
  const code = await createBackupCode();
  if (!code) return null;
  try {
    return (await Clipboard.setStringAsync(code)) === false ? null : code;
  } catch (e) {
    console.warn('[Backup] copy failed', e);
    return null;
  }
}

/** Reads the clipboard for the paste field. Empty string when unavailable. */
export async function readClipboard(): Promise<string> {
  try {
    return await Clipboard.getStringAsync();
  } catch {
    return '';
  }
}

/** Checks a pasted code without touching anything saved. */
export const inspectBackupCode = (code: string): DecodeResult => decodeBackup(code);

/**
 * Replaces the local progress and settings with a code's content. Call only after the player confirmed.
 * Returns false when the code is invalid or saving failed; never throws.
 */
export async function restoreBackupCode(code: string): Promise<boolean> {
  const decoded = decodeBackup(code);
  if (!decoded.ok) return false;
  try {
    await replaceLocalStats(decoded.stats);
    useSettingsStore.setState(decoded.settings);
    return true;
  } catch (e) {
    console.warn('[Backup] restore failed', e);
    return false;
  }
}
