import { Character } from '../../data/characters';
import { GameMode } from './seed';
import { HeroPerks } from './heroes';
import { RelicId } from './relics';
import type { MetaEffects } from '../stats/forge';
import type { OmenId } from './omens';
import type { ShopItem } from './shop';

export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export type EntityType = 'coin' | 'pit' | 'enemy' | 'trap' | 'shield' | 'ammo' | 'boss' | 'stalker' | 'sleeper';

/** Entities that kill the player on contact. */
export const LETHAL_TYPES: readonly EntityType[] = ['pit', 'enemy', 'boss', 'stalker', 'sleeper'];

/** Guardians an arrow, a volley or a bomb can destroy (the Wumpus is handled apart). */
export const GUARDIAN_TYPES: readonly EntityType[] = ['enemy', 'stalker', 'sleeper'];

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
  /** Stalkers the Wumpus has called so far (the boss only). */
  calls?: number;
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
  /** What the last vortex cost (an arrow or a shop gem), for one move; null when it cost nothing or none was entered. */
  vortexCost?: 'arrow' | 'gem' | null;
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
  /** Gems collected this run and not yet spent in the shop between floors. */
  gems: number;
  /** One-use items in the bag. */
  items: { detector: number; bomb: number };
  /** Actions left until the hero's ability is ready again (0 = ready). */
  abilityCd: number;
  /** The omen of the current floor (chosen at the fork, or seeded in the daily). */
  omen: OmenId | null;
  /** Tiles the detector proved hostile on this floor (the screen shows them as flags). */
  marked: number[];
  /** Arrows bought in the shop for the next floor. */
  pendingArrows: number;
  /** The altar was used: after the next draft a second one opens. */
  altarPending: boolean;
  /** The altar can be used once between floors. */
  altarUsed: boolean;
  /** The board just before the last step, so one step per floor can be taken back. */
  undo: UndoSnapshot | null;
  undoUsed: boolean;
  /** The board just before the action that killed the hero: what a revive goes back to (null while alive). */
  lastBreath?: UndoSnapshot | null;
  /** Times the hero was revived with embers in this run. */
  revives?: number;
  /** Arrow packs bought with embers in this run. */
  refills?: number;
  /** Times the lair has sent arrows to a hero that ran dry (see ensureWinnable); resets on every new floor. */
  lairRescues?: number;
}

/** What taking a step back restores. */
export type UndoSnapshot = Omit<GameState, 'undo'>;

export type GameAction =
  | { type: 'MOVE'; direction: Direction }
  /** Shoots; with a `direction` the hero first turns that way (no step), otherwise it fires where it faces. */
  | { type: 'ATTACK'; direction?: Direction }
  | { type: 'PICK_RELIC'; id: RelicId }
  /** Spends gems in the shop (only between floors). */
  | { type: 'BUY'; item: ShopItem }
  /** Sacrifices the shield at the altar for an extra relic draft (only between floors). */
  | { type: 'ALTAR' }
  | { type: 'USE_ITEM'; item: 'detector' | 'bomb' }
  | { type: 'USE_ABILITY' }
  /** Takes back the last step (once per floor). */
  | { type: 'UNDO' }
  /** Brings the hero back to just before the fatal action (see core/engine/revive.ts). */
  | { type: 'REVIVE' }
  /** Adds the arrows of an ember-bought pack (the embers are spent by the screen first). */
  | { type: 'REFILL' }
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
        omen?: OmenId | null;
      };
    };

export interface GameEngineInterface {
  state: GameState;
  isAttacking: boolean;
  move: (direction: Direction) => void;
  attack: (direction?: Direction) => void;
  reset: (character: Character, options?: { mode?: GameMode; runSeed?: number; heroIndex?: number; ascension?: number; meta?: MetaEffects }) => void;
  levelUp: (omen?: OmenId | null) => void;
  buy: (item: ShopItem) => void;
  useAltar: () => void;
  useItem: (item: 'detector' | 'bomb') => void;
  useAbility: () => void;
  undo: () => void;
  revive: () => void;
  refill: () => void;
  pickRelic: (id: RelicId) => void;
}
