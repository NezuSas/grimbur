export type GameEvent =
  | "PLAYER_MOVED"
  | "ENEMY_KILLED"
  | "COIN_COLLECTED"
  | "LEVEL_UP"
  | "GAME_OVER"
  | "ATTACK_MISS";

export function emitGameEvent(event: GameEvent, payload?: any) {
  console.log(`[GameEvent] ${event}`, payload || '');
}
