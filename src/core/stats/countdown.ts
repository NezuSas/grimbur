/** A short countdown for the cover: "3h 20m", "42m" (never "0m": the last minute reads "<1m"). */
export function formatCountdown(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return '<1m';
  const totalMinutes = Math.ceil(ms / 60_000);
  if (totalMinutes < 1) return '<1m';
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}
