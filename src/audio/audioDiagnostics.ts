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

/** Time from "play" to the player reporting that it is playing, per sound (the log's way to measure delay). */
const latency: Record<string, number[]> = {};
const MAX_SAMPLES = 60;

export function recordLatency(name: string, ms: number): void {
  const samples = (latency[name] ??= []);
  samples.push(ms);
  if (samples.length > MAX_SAMPLES) samples.shift();
  audioLog('latency', `${name} ${ms}ms from play() to playing`);
}

/** One line per sound: how many plays were measured, the average and the worst. */
export function latencySummary(): string {
  const lines = Object.entries(latency).map(([name, samples]) => {
    const avg = Math.round(samples.reduce((n, v) => n + v, 0) / samples.length);
    return `  ${name.padEnd(10)} plays=${String(samples.length).padStart(3)}  avg=${avg}ms  max=${Math.max(...samples)}ms`;
  });
  return lines.length ? `LATENCY (play() until the player says it is playing; an upper bound of the real delay)\n${lines.join('\n')}\n` : '';
}

export function getAudioLog(): string {
  const summary = latencySummary();
  return summary ? `${summary}\n${entries.join('\n')}` : entries.join('\n');
}

export function clearAudioLog(): void {
  entries.length = 0;
  for (const key of Object.keys(latency)) delete latency[key];
}
