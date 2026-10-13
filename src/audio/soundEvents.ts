/**
 * @file soundEvents.ts
 *
 * Canonical list of gameplay audio events for the WumpusAdventures
 * Audio Event Bus. Components and screens should emit these events
 * instead of calling sound APIs directly.
 *
 * Each event represents a gameplay *intent*, not a specific audio file.
 * The SoundManager is responsible for mapping events → assets.
 */

export type SoundEvent =
  | 'MOVE'              // Player moves to an adjacent cell
  | 'COIN_COLLECTED'    // Player walks onto a coin tile
  | 'ATTACK'            // Player fires an arrow (consumed)
  | 'ENEMY_KILLED'      // Arrow eliminates an enemy
  | 'LEVEL_UP'          // All coins collected — level progression starts
  | 'LEVEL_RESUME'      // Level Up modal closes — in-game music resumes
  | 'GAME_OVER'         // Player collides with enemy or pit
  | 'RETRY'             // Player retries after game over
  | 'QUIT'              // Player quits to menu
  | 'COVER_SCREEN_START'    // Cover screen (main menu) entered
  | 'GAME_MUSIC_START'  // In-game background music begins
  | 'GAME_MUSIC_STOP'   // In-game background music stops
  | 'SELECTION_SCREEN_START' // Characters selection screen entered
  | 'SELECTION_SCREEN_STOP'  // Characters selection screen exited
  | 'GUARDIAN_NEAR'      // Player is adjacent to a Guardian enemy (start loop)
  | 'VORTEX_NEAR'        // Player is adjacent to a magical vortex (start loop)
  | 'STOP_GUARDIAN_NEAR'   // Player left Guardian proximity (stop loop)
  | 'STOP_VORTEX_NEAR'   // Player left vortex proximity (stop loop)
  | 'VORTEX_TELEPORT';   // Player was teleported by a vortex
