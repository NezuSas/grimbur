/**
 * A small in-memory log of everything the audio system does, so a problem that only shows up on a real phone can be
 * sent for analysis: Settings > "Share audio log". Entries are also printed with the `[AudioDiag]` tag, which shows up
 * in the Metro terminal and in `adb logcat`.
 */
const MAX_ENTRIES = 600;
const entries: string[] = [];
const startedAt = Date.now();

export function audioLog(tag: string, message: string): void {
  const line = `+${String(Date.now() - startedAt).padStart(6, ' ')}ms ${tag.padEnd(8)} ${message}`;
  entries.push(line);
  if (entries.length > MAX_ENTRIES) entries.shift();
  console.log(`[AudioDiag] ${line}`);
}

export function getAudioLog(): string {
  return entries.join('\n');
}

export function clearAudioLog(): void {
  entries.length = 0;
}
