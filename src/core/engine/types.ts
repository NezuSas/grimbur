import { Character } from '../../data/characters';

export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export type EntityType = 'coin' | 'pit' | 'enemy' | 'trap' | 'shield' | 'ammo';

/** Entities that kill the player on contact. */
export const LETHAL_TYPES: readonly EntityType[] = ['pit', 'enemy'];

/** What the player ran into on the last move (UI feedback only). */
export type PickupKind = 'shield' | 'ammo' | 'trap';

export interface GameEntity {
  index: number;
  type: EntityType;
}

export interface GameState {
  playerIndex: number;
  rows: number;
  cols: number;
  /** Grid entities (coins, enemies, pits, etc.) */
  entities: GameEntity[];
  /** O(1) Lookup: Entity per index */
  entityMap: Record<number, GameEntity>;
  visited: number[];
  score: number;
  attack: number;
  coins: number;
  facingDir: Direction;
  level: number;
  isGameOver: boolean;
  isLevelUp: boolean;
  selectedCharacter: Character | null;
  shield: boolean;
  /** Consecutive enemy kills without a movement or a miss. */
  enemyCombo: number;
  gameStatus: 'idle' | 'playing' | 'win' | 'lose' | 'loading';
  seed: number;
  totalCoins: number;
  deathCause: EntityType | null;
  /** Set to true for one frame when the player was teleported by a vortex. */
  wasTeleported: boolean;
  /** Set for one move when the player stepped on a trap or collected a power-up. */
  lastPickup: PickupKind | null;
}

export type GameAction =
  | { type: 'MOVE'; direction: Direction }
  | { type: 'ATTACK' }
  | {
      type: 'RESET';
      character: Character;
      rows: number;
      cols: number;
      entities: GameEntity[];
      coins: number;
      attack: number;
      seed?: number;
    }
  | {
      type: 'LEVEL_UP';
      payload: {
        rows: number;
        cols: number;
        entities: GameEntity[];
        coins: number;
        attack: number;
        seed?: number;
      };
    };

export interface GameEngineInterface {
  state: GameState;
  isAttacking: boolean;
  move: (direction: Direction) => void;
  attack: () => void;
  reset: (character: Character) => void;
  levelUp: () => void;
}
