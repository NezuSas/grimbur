export function logGameEvent(event: string, payload?: any) {
  console.log(`[Telemetry] ${event}`, payload || '');
}
