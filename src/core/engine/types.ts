import { Character } from '../../data/characters';
import { GameMode } from './seed';
import { HeroPerks } from './heroes';
import { RelicId } from './relics';
import type { MetaEffects } from '../stats/forge';

export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export type EntityType = 'coin' | 'pit' | 'enemy' | 'trap' | 'shield' | 'ammo' | 'boss' | 'stalker';

/** Entities that kill the player on contact. */
export const LETHAL_TYPES: readonly EntityType[] = ['pit', 'enemy', 'boss', 'stalker'];

/** Monsters that walk toward the player (they wind up before striking). */
export const HUNTER_TYPES: readonly EntityType[] = ['boss', 'stalker'];

/** What the player ran into on the last move (UI feedback only). */
export type PickupKind = 'shield' | 'ammo' | 'trap';

export interface GameEntity {
  index: number;
  type: EntityType;
  /** Remaining hit points (the boss only). */
  hp?: number;
  /** The Wumpus' wind-up: it can only strike on the action after it arrives next to the player. */
  charge?: number;
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
  /** Seed of the current level's board. */
  seed: number;
  /** Seed of the whole run; each level derives its own seed from it. */
  runSeed: number;
  mode: GameMode;
  /** Depth of the run (0 = normal); see core/engine/ascension.ts. */
  ascension: number;
  /** Extra relics offered per draft (Forge upgrade). */
  draftBonus: number;
  totalCoins: number;
  deathCause: EntityType | null;
  /** Set to true for one frame when the player was teleported by a vortex. */
  wasTeleported: boolean;
  /** Perks of the chosen hero. */
  perks: HeroPerks;
  /** Relics collected during this run (duplicates = stacks). */
  relics: RelicId[];
  /** Relics on offer after clearing a floor; the game waits until one is picked. */
  pendingDraft: RelicId[] | null;
  /** Player moves made on the current floor (drives the boss). */
  turn: number;
  /** True once the Wumpus is dead and the expedition is won. */
  isVictory: boolean;
  /** Set for one move when the player stepped on a trap or collected a power-up. */
  lastPickup: PickupKind | null;
}

export type GameAction =
  | { type: 'MOVE'; direction: Direction }
  | { type: 'ATTACK' }
  | { type: 'PICK_RELIC'; id: RelicId }
  | {
      type: 'RESET';
      character: Character;
      rows: number;
      cols: number;
      entities: GameEntity[];
      coins: number;
      attack: number;
      seed?: number;
      mode?: GameMode;
      runSeed?: number;
      perks?: HeroPerks;
      ascension?: number;
      draftBonus?: number;
      /** Start the run with a shield (Forge upgrade). */
      startShield?: boolean;
      /** Relics the run begins with (Forge: Phoenix Feather). */
      startRelics?: RelicId[];
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
  reset: (character: Character, options?: { mode?: GameMode; runSeed?: number; heroIndex?: number; ascension?: number; meta?: MetaEffects }) => void;
  levelUp: () => void;
  pickRelic: (id: RelicId) => void;
}
