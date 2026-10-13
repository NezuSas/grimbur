export type GameEvent =
  | "PLAYER_MOVED"
  | "ENEMY_KILLED"
  | "COIN_COLLECTED"
  | "LEVEL_UP"
  | "GAME_OVER"
  | "ATTACK_MISS"
  | "TRAP_TRIGGERED"
  | "POWERUP_COLLECTED";

export function emitGameEvent(event: GameEvent, payload?: any) {
  console.log(`[GameEvent] ${event}`, payload || '');
}
