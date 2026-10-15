import React, { memo, useCallback, useRef, useEffect, useMemo, useState } from "react";
import { StyleSheet, View, Animated, ImageSourcePropType, Easing } from "react-native";
import Text from "./Text";
import { Ionicons } from "@expo/vector-icons";
import { characterWithSkin } from "../../data/characterSkins";
import type { SkinId } from "../../data/skinArt";
import { BIOME_ART } from "../biomeArt";
import type { BiomeId } from "../../core/engine/biomes";
import { useGameLayout } from "../layout/useGameLayout";
import { Direction, GameEntity } from "../../core/engine/types";
import BoardTouchLayer from "./BoardTouchLayer";
import { stepTarget } from "../../core/engine/travel";
import { getNearbyHazards, NearbyHazards } from "../../core/engine/proximity";
import SpriteImage, { AnimatedSprite } from "./SpriteImage";

/** An arrow in flight: shot toward `dir`, crossing `tiles` tiles, and whether it hit something at the end. `key` changes per shot. */
export type ArrowShot = { key: number; dir: Direction; tiles: number; hit: boolean };

type Props = {
  level: number;
  rows: number;
  cols: number;
  entityMap: Record<number, GameEntity>;
  visited: number[];
  playerIndex: number;
  characterIndex: number;
  facingDir: "up" | "down" | "left" | "right" | "UP" | "DOWN" | "LEFT" | "RIGHT";
  isAttacking?: boolean;
  /** Guardians still on the floor; the board shakes when this drops (a kill). */
  guardianCount?: number;
  /** Tiles to outline (used by the tutorial). */
  highlight?: readonly number[];
  /** Called with the tile index when the player taps the board (used for tap-to-travel). */
  onTilePress?: (index: number) => void;
  /** When set, a swipe on the board moves one step; shorter touches still count as taps. */
  onSwipe?: (direction: Direction) => void;
  /** Tiles the player marked as suspected danger. */
  flags?: ReadonlySet<number>;
  /** Tiles an arrow would cross right now (shown while the attack button is held). */
  aimTiles?: ReadonlySet<number>;
  /** The direction being aimed while the attack button is held: the hero turns that way and draws the bow. */
  aimDir?: Direction | null;
  /** The last arrow shot: it flies across the board from the hero. */
  shot?: ArrowShot | null;
  /** Drag from the hero to shoot: the side being aimed (null when none / cancelled), and the shot when the finger is lifted. */
  onAimDrag?: (direction: Direction | null) => void;
  onAimFire?: (direction: Direction) => void;
  /** Long press on a tile (toggles its flag). */
  onTileLongPress?: (index: number) => void;
  /** Called once every tile image of the current floor has been drawn. */
  onReady?: () => void;
  /** True from the moment the hero dies: the board shakes hard once. */
  dying?: boolean;
  /** The tile that killed the hero (ringed in red). */
  killerTile?: number | null;
  /** Bumped when something heavy lands (a hit on the Wumpus): the board shakes once. */
  shakeKey?: number;
  /** A refused step onto a flag: the flag on this tile blinks and shakes. `n` changes for every refusal. */
  flagPing?: { index: number; n: number } | null;
  /** Reduced motion: no shakes, no pulsing. */
  calm?: boolean;
  /** The outfit the hero wears (classic when omitted). */
  skin?: SkinId;
  /** The cave type of this floor (the plain cave when omitted). */
  biome?: BiomeId;
};

const ASSETS: Record<"enemy" | "stalker" | "sleeper" | "boss" | "pit" | "coin" | "shield" | "ammo", ImageSourcePropType> = {
  enemy:    require("../../assets/sprites/enemies/Guardian_Enemy.png"),
  stalker:  require("../../assets/sprites/enemies/Stalker_Enemy.png"),
  sleeper:  require("../../assets/sprites/enemies/Sleeper_Enemy.png"),
  boss:     require("../../assets/sprites/enemies/Wumpus_Boss.png"),
  pit:      require("../../assets/sprites/tiles/Danger_Vortex.png"),
  shield:   require("../../assets/sprites/items/Icon_Shield.png"),
  ammo:     require("../../assets/sprites/items/Icon_Arrows.png"),
  coin:     require("../../assets/sprites/items/Icon_Gem.png"),
};

const NO_HINTS: NearbyHazards = { enemy: false, pit: false, enemyCount: 0, pitCount: 0 };

const FACING_ICON: Record<Direction, keyof typeof Ionicons.glyphMap> = {
  UP: "chevron-up",
  DOWN: "chevron-down",
  LEFT: "chevron-back",
  RIGHT: "chevron-forward",
};

// ─── Optimized Grid Cell Component ──────────────────────────────────────────
const GridCell = memo(({ 
  index, tileSize, cols, isVisited: visitedProp, isPlayerHere, entity, enemyCount, pitCount, highlighted, flagged, aimed, aimStep, aimLast, facing, onTileLoaded, revealDelay, pulse, killer, flagPing, biome
}: {
  index: number;
  tileSize: number;
  cols: number;
  isVisited: boolean;
  isPlayerHere: boolean;
  entity?: GameEntity;
  /** Guardians (and the Wumpus) touching this tile; only set on explored tiles. */
  enemyCount: number;
  /** Vortexes touching this tile; only set on explored tiles. */
  pitCount: number;
  highlighted: boolean;
  /** The player marked this unexplored tile as dangerous. */
  flagged: boolean;
  /** The direction of the arrow that would fly over this tile (null when none would). */
  aimed: Direction | null;
  /** How many tiles from the hero this tile is along the aim line (1 = the next one). */
  aimStep: number;
  /** This is the last tile the arrow can reach. */
  aimLast: boolean;
  /** Direction the hero faces when this is the tile in front of it (where a plain shot would go). */
  facing: Direction | null;
  /** The tile's base image has been drawn. */
  onTileLoaded: () => void;
  /** When many tiles are uncovered at once (a relic), each one waits this long so they open as a ripple. */
  revealDelay: number;
  /** One breathing value shared by every cell of the board (0..1): clue badges and wind-up auras follow it. */
  pulse: Animated.Value;
  /** This tile killed the hero. */
  killer: boolean;
  /** Changes every time a step onto this flagged tile is refused (0 = never). */
  flagPing: number;
  /** The cave type of the floor: it decides which pair of tiles is drawn. */
  biome: BiomeId;
}) => {
  // A tile shows as explored only after its ripple delay, so a relic uncovering a whole area opens it outward.
  const [isVisited, setShown] = useState(visitedProp);
  useEffect(() => {
    if (!visitedProp) {
      setShown(false);
      return;
    }
    if (revealDelay <= 0) {
      setShown(true);
      return;
    }
    const timer = setTimeout(() => setShown(true), revealDelay);
    return () => clearTimeout(timer);
  }, [visitedProp]);
  const glow = useRef(new Animated.Value(0)).current;
  const roar = enemyCount > 0;
  const vortex = pitCount > 0;
  // The hint badge breathes between 85% and 100%: it must stay visible at every moment.
  const hintScale = useMemo(() => pulse.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }), [pulse]);
  const auraScale = useMemo(() => pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.14] }), [pulse]);
  const tintOpacity = useMemo(() => pulse.interpolate({ inputRange: [0, 1], outputRange: [0.1, 0.25] }), [pulse]);

  // A refused step onto this flag: it shakes and the tile blinks red.
  const flagShake = useRef(new Animated.Value(0)).current;
  const flagBlink = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!flagPing) return;
    Animated.parallel([
      Animated.sequence([
        Animated.timing(flagShake, { toValue: 5, duration: 45, useNativeDriver: true }),
        Animated.timing(flagShake, { toValue: -5, duration: 70, useNativeDriver: true }),
        Animated.timing(flagShake, { toValue: 3, duration: 55, useNativeDriver: true }),
        Animated.timing(flagShake, { toValue: 0, duration: 45, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.timing(flagBlink, { toValue: 1, duration: 80, useNativeDriver: true }),
        Animated.timing(flagBlink, { toValue: 0, duration: 120, useNativeDriver: true }),
        Animated.timing(flagBlink, { toValue: 1, duration: 80, useNativeDriver: true }),
        Animated.timing(flagBlink, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]),
    ]).start();
  }, [flagPing]);

  // A tile "pops" when it is uncovered (not when the floor first draws): quick, native-driven, and a no-op on mount.
  const revealScale = useRef(new Animated.Value(1)).current;
  const wasVisited = useRef(isVisited);
  useEffect(() => {
    if (isVisited && !wasVisited.current) {
      revealScale.setValue(0.82);
      Animated.spring(revealScale, { toValue: 1, friction: 5, tension: 160, useNativeDriver: true }).start();
      if (revealDelay > 0) {
        // A golden flash runs through the tile as the ripple reaches it.
        glow.setValue(0);
        Animated.sequence([
          Animated.timing(glow, { toValue: 1, duration: 160, useNativeDriver: true }),
          Animated.timing(glow, { toValue: 0, duration: 420, useNativeDriver: true }),
        ]).start();
      }
    }
    wasVisited.current = isVisited;
  }, [isVisited]);

  // Background priority: visited block > fog
  const backgroundAsset = (isVisited || isPlayerHere) ? BIOME_ART[biome].tileRevealed : BIOME_ART[biome].tileHidden;

  const row = Math.floor(index / cols);
  const col = index % cols;

  // Don't show hint if an entity is directly on this cell (it would overlap)
  const showHints = isVisited && !entity && (roar || vortex);

  const charged = (entity?.type === 'boss' || entity?.type === 'stalker') && (entity.charge ?? 0) >= 1;
  const badge = Math.max(10, tileSize * (roar && vortex ? 0.4 : 0.5));
  const countSize = Math.max(8, tileSize * 0.24);

  return (
    <View
      style={[
        styles.cell,
        { width: tileSize, height: tileSize, position: "absolute", left: col * tileSize, top: row * tileSize },
      ]}
    >
      {/* Base tile */}
      <AnimatedSprite
        style={{ width: tileSize, height: tileSize, transform: [{ scale: revealScale }] }}
        source={backgroundAsset}
        resizeMode="contain"
        onLoadEnd={onTileLoaded}
      />

      {/* Explored ground is warm and lit, unexplored ground is dark: the two must read apart at a glance. */}
      <View
        pointerEvents="none"
        style={[
          styles.tileTone,
          { left: tileSize * 0.09, top: tileSize * 0.09, right: tileSize * 0.09, bottom: tileSize * 0.09 },
          isVisited || isPlayerHere ? styles.toneLit : styles.toneDark,
        ]}
      />

      {revealDelay > 0 && (
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(255,213,79,0.55)", borderRadius: 8, opacity: glow }]}
        />
      )}

      {/* Danger pulse tint */}
      {showHints && !isPlayerHere && (
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: vortex ? "rgba(156,39,176,0.15)" : "rgba(255,220,0,0.08)",
              opacity: tintOpacity,
            },
          ]}
        />
      )}

      {/* Pit / Enemy revealed when visited */}
      {entity?.type === 'stalker' && (isVisited || isPlayerHere) && (
        <Animated.View
          style={[
            styles.stalkerAura,
            { width: tileSize, height: tileSize },
            charged && styles.stalkerCharged,
            charged && { transform: [{ scale: auraScale }] },
          ]}
          pointerEvents="none"
        />
      )}

      {entity && (entity.type === 'pit' || entity.type === 'enemy' || entity.type === 'stalker' || entity.type === 'sleeper') && (isVisited || isPlayerHere || killer) && (
        <SpriteImage
          style={{ width: tileSize * 0.9, height: tileSize * 0.9, position: 'absolute' }}
          source={entity.type === 'pit' ? ASSETS.pit : entity.type === 'stalker' ? ASSETS.stalker : entity.type === 'sleeper' ? ASSETS.sleeper : ASSETS.enemy}
          resizeMode="contain"
        />
      )}
      {entity?.type === 'sleeper' && (isVisited || isPlayerHere) && (
        <Text style={[styles.sleepMark, { fontSize: Math.max(9, tileSize * 0.3) }]} pointerEvents="none">zZ</Text>
      )}

      {/* The Wumpus: shown on explored tiles, with its remaining hearts */}
      {entity?.type === 'boss' && (isVisited || isPlayerHere) && (
        <>
          <Animated.View
            style={[
              styles.bossAura,
              { width: tileSize, height: tileSize },
              charged && styles.bossCharged,
              charged && { transform: [{ scale: auraScale }] },
            ]}
            pointerEvents="none"
          />
          <SpriteImage
            style={{ width: tileSize * 1.15, height: tileSize * 1.15, position: 'absolute' }}
            source={ASSETS.boss}
            resizeMode="contain"
          />
          <View style={styles.bossHp} pointerEvents="none">
            <Text style={[styles.bossHpText, { fontSize: Math.max(9, tileSize * 0.26) }]}>{'♥'.repeat(Math.max(entity.hp ?? 0, 0))}</Text>
          </View>
        </>
      )}

      {/* Wind-up warning: an icon too, so the danger never depends on colour alone */}
      {charged && (isVisited || isPlayerHere) && (
        <View style={[styles.chargeMark, { width: Math.max(12, tileSize * 0.34), height: Math.max(12, tileSize * 0.34) }]} pointerEvents="none">
          <Text style={[styles.chargeMarkText, { fontSize: Math.max(10, tileSize * 0.28) }]}>!</Text>
        </View>
      )}

      {/* Clues: a round warm badge for guardians, a dark diamond with a swirl for vortexes. Always numbered; side by side. */}
      {showHints && (
        <View style={styles.hintContainer} pointerEvents="none">
          {roar && (
            <Animated.View style={{ width: badge, height: badge, transform: [{ scale: hintScale }] }}>
              <View style={[styles.hintRoar, { width: badge, height: badge, borderRadius: badge / 2 }]}>
                <Ionicons name="volume-high" size={badge * 0.62} color="#7f2400" />
              </View>
              <View style={[styles.hintCount, { minWidth: countSize + 3, height: countSize + 3, borderRadius: (countSize + 3) / 2 }]}>
                <Text style={[styles.hintCountText, { fontSize: countSize }]}>{enemyCount}</Text>
              </View>
            </Animated.View>
          )}
          {vortex && (
            <Animated.View style={{ width: badge, height: badge, transform: [{ scale: hintScale }] }}>
              <View style={[styles.hintVortexShape, { width: badge * 0.78, height: badge * 0.78, left: badge * 0.11, top: badge * 0.11 }]} />
              <View style={[StyleSheet.absoluteFill, styles.hintVortexIcon]}>
                <Ionicons name="infinite" size={badge * 0.62} color="#fff" />
              </View>
              <View style={[styles.hintCount, styles.hintCountVortex, { minWidth: countSize + 3, height: countSize + 3, borderRadius: (countSize + 3) / 2 }]}>
                <Text style={[styles.hintCountText, { fontSize: countSize }]}>{pitCount}</Text>
              </View>
            </Animated.View>
          )}
        </View>
      )}

      {/* Render Entity (Gem) overlaid on background */}
      {entity?.type === 'coin' && (
        <SpriteImage 
          source={ASSETS.coin} 
          style={{ 
            position: 'absolute', 
            width: tileSize * 0.5, 
            height: tileSize * 0.5,
            zIndex: 2,
            alignSelf: 'center',
            top: tileSize * 0.25
          }} 
          resizeMode="contain"
        />
      )}

      {/* Power-ups (always visible, like gems). Traps stay hidden on purpose. */}
      {entity?.type === 'shield' && (
        <View style={styles.pickup} pointerEvents="none">
          <SpriteImage source={ASSETS.shield} style={{ width: tileSize * 0.7, height: tileSize * 0.7 }} resizeMode="contain" />
        </View>
      )}
      {entity?.type === 'ammo' && (
        <View style={styles.pickup} pointerEvents="none">
          <SpriteImage source={ASSETS.ammo} style={{ width: tileSize * 0.7, height: tileSize * 0.7 }} resizeMode="contain" />
        </View>
      )}

      {flagged && (
        <Animated.View style={[styles.pickup, { transform: [{ translateX: flagShake }] }]} pointerEvents="none">
          <Animated.View style={[styles.flagBlink, { opacity: flagBlink }]} />
          <Ionicons name="flag" size={tileSize * 0.5} color="#FF5252" />
        </Animated.View>
      )}

      {facing && !aimed && !isPlayerHere && (
        <View style={styles.facingMark} pointerEvents="none">
          <Ionicons name={FACING_ICON[facing]} size={tileSize * 0.34} color="rgba(255,255,255,0.7)" />
        </View>
      )}

      {aimed && (
        <View style={[styles.aim, aimLast && styles.aimLast]} pointerEvents="none">
          {/* A chevron along the line of fire, fading with distance; a ring marks where the arrow stops */}
          <Ionicons name={FACING_ICON[aimed]} size={tileSize * 0.46} color="#FF8A80" style={{ opacity: Math.max(0.5, 1 - (aimStep - 1) * 0.13) }} />
          {aimLast && <View style={[styles.aimRing, { width: tileSize * 0.62, height: tileSize * 0.62, borderRadius: tileSize * 0.31 }]} />}
        </View>
      )}

      {highlighted && <View style={styles.highlight} pointerEvents="none" />}

      {killer && <View style={styles.killer} pointerEvents="none" />}

      {/* Player highlight glow */}
      {isPlayerHere && (
        <View style={[styles.playerHighlight, { width: tileSize, height: tileSize }]} />
      )}
    </View>
  );
});

const BoardView: React.FC<Props> = memo(
  ({ level, rows, cols, entityMap = {}, visited, playerIndex, characterIndex, facingDir, guardianCount, isAttacking, highlight, onTilePress, onSwipe, flags, aimTiles, aimDir = null, shot = null, onAimDrag, onAimFire, onTileLongPress, onReady, dying, killerTile, shakeKey, flagPing, calm, skin, biome = "cave" }) => {
    const { tileSize, boardWidth, boardHeight } = useGameLayout(cols, rows);

    const rowIndex = Math.floor(playerIndex / cols);
    const colIndex = playerIndex % cols;

    // ── Animations ────────────────────────────────────────────────────────
    const playerPos  = useRef(new Animated.ValueXY({ x: colIndex * tileSize, y: rowIndex * tileSize })).current;
    const shakeAnim  = useRef(new Animated.Value(0)).current;
    const shakeGuard = useRef<number | undefined>(guardianCount);

    // One breathing value for every clue badge and wind-up aura (a loop per cell used to cost one timer each).
    const pulse = useRef(new Animated.Value(0)).current;
    const needsPulse = useMemo(() => {
      for (const i of visited) {
        if (entityMap[i] !== undefined) continue;
        const near = getNearbyHazards(i, rows, cols, entityMap);
        if (near.enemy || near.pit) return true;
      }
      for (const key in entityMap) {
        const e = entityMap[key];
        if ((e.type === 'boss' || e.type === 'stalker') && (e.charge ?? 0) >= 1) return true;
      }
      return false;
    }, [visited, entityMap, rows, cols]);
    useEffect(() => {
      if (!needsPulse || calm) {
        pulse.setValue(0);
        return;
      }
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 0, duration: 800, useNativeDriver: true }),
        ]),
      );
      loop.start();
      return () => loop.stop();
    }, [needsPulse, calm, pulse]);

    // Player move animation
    const playerScale = useRef(new Animated.Value(1)).current;

    useEffect(() => {
      Animated.parallel([
        Animated.timing(playerPos, {
          toValue: { x: colIndex * tileSize, y: rowIndex * tileSize },
          duration: 150,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        // Micro-scale: 1 -> 1.03 -> 1
        Animated.sequence([
          Animated.timing(playerScale, {
            toValue: 1.03,
            duration: 75,
            useNativeDriver: true,
          }),
          Animated.timing(playerScale, {
            toValue: 1,
            duration: 75,
            useNativeDriver: true,
          }),
        ])
      ]).start();
    }, [rowIndex, colIndex, tileSize]);

    // A new floor or a restart changes the guardian count without a kill: re-arm the guard silently.
    useEffect(() => {
      shakeGuard.current = guardianCount;
    }, [level, rows, cols]);

    // Board Shake on kill
    useEffect(() => {
      if (guardianCount === undefined) return;
      const prev = shakeGuard.current;
      shakeGuard.current = guardianCount;
      if (prev === undefined || guardianCount >= prev || calm) return;

      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 3,  duration: 40, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -3, duration: 40, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 2,  duration: 30, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0,  duration: 30, useNativeDriver: true }),
      ]).start();
    }, [guardianCount]);

    // Tells the screen when every tile of this floor has been drawn (the start-up cover waits for it).
    const tilesToLoad = rows * cols;
    const loadedTiles = useRef({ level, count: 0, done: false });
    const onReadyRef = useRef(onReady);
    onReadyRef.current = onReady;
    const onTileLoaded = useCallback(() => {
      const progress = loadedTiles.current;
      if (progress.level !== level) {
        progress.level = level;
        progress.count = 0;
        progress.done = false;
      }
      progress.count += 1;
      if (!progress.done && progress.count >= tilesToLoad) {
        progress.done = true;
        onReadyRef.current?.();
      }
    }, [level, tilesToLoad]);

    // Death: one hard shake.
    useEffect(() => {
      if (!dying || calm) return;
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 9, duration: 45, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -9, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 6, duration: 55, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -4, duration: 55, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start();
    }, [dying]);

    // The killer reveals itself: it leaps over the hero, grows with a punch, claw marks cut across the tile and the hero fades.
    // (A vortex instead spins and swallows the hero.) With reduced motion the final picture simply appears.
    const strike = useRef(new Animated.Value(0)).current;
    useEffect(() => {
      if (!dying || killerTile == null) {
        strike.setValue(0);
        return;
      }
      if (calm) {
        strike.setValue(1);
        return;
      }
      strike.setValue(0);
      Animated.timing(strike, { toValue: 1, duration: 560, easing: Easing.out(Easing.back(1.7)), useNativeDriver: true }).start();
    }, [dying, killerTile, calm]);

    // A heavy hit (the Wumpus took an arrow): a short, firm shake.
    const lastShakeKey = useRef(shakeKey);
    useEffect(() => {
      if (shakeKey === lastShakeKey.current) return;
      lastShakeKey.current = shakeKey;
      if (calm) return;
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 6, duration: 40, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -6, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 3, duration: 40, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 40, useNativeDriver: true }),
      ]).start();
    }, [shakeKey]);

    // ── Memoized state sets ───────────────────────────────────────────────
    const visitedSet = useMemo(() => new Set(visited), [visited]);
    // Uncovering four or more tiles in one go (the lantern relic) makes a ripple that spreads from the hero.
    const lastVisited = useRef({ level, count: visited.length });
    const burst = lastVisited.current.level === level && visited.length - lastVisited.current.count >= 4;
    useEffect(() => {
      lastVisited.current = { level, count: visited.length };
    }, [level, visited.length]);
    const highlightSet = useMemo(() => new Set(highlight ?? []), [highlight]);
    const gridIndices = useMemo(() => Array.from({ length: rows * cols }, (_, i) => i), [rows, cols]);

    const killerEntityType = killerTile != null ? entityMap[killerTile]?.type : undefined;
    const heroArt = characterWithSkin(characterIndex, skin);
    const idleSource = heroArt.playerImage;
    const attackSource = heroArt.attackImage;
    const facingTile = stepTarget(playerIndex, (facingDir || 'RIGHT').toUpperCase() as Direction, rows, cols);
    // While the attack button is held the hero already turns toward the aim and draws the bow.
    const aiming = !!aimDir;
    const currentFacing = (aimDir || facingDir || 'RIGHT').toLowerCase() as "up" | "down" | "left" | "right";
    // Looking up or down keeps the side the hero last faced (it used to snap back to the right).
    const lastSide = useRef<"left" | "right">("right");
    if (currentFacing === "left" || currentFacing === "right") lastSide.current = currentFacing;
    const drawn = isAttacking || aiming;

    // The arrow: flies from the hero to the tile it stops on, then a ring bursts there when it hit something.
    const flight = useRef(new Animated.Value(1)).current;
    const [flying, setFlying] = useState<ArrowShot | null>(null);
    useEffect(() => {
      if (!shot || calm) return;
      setFlying(shot);
      flight.setValue(0);
      Animated.timing(flight, { toValue: 1, duration: 110 + 55 * shot.tiles, easing: Easing.out(Easing.quad), useNativeDriver: true }).start(({ finished }) => {
        if (finished) setFlying(null);
      });
    }, [shot?.key]);

    return (
      <View style={styles.cameraContainer}>
        <Animated.View
          style={[
            styles.boardFrame,
            { width: boardWidth, height: boardHeight, transform: [{ translateX: shakeAnim }] },
          ]}
        >
          {/* Grid Cells optimization */}
          <View style={[StyleSheet.absoluteFill, { width: boardWidth, height: boardHeight }]}>
            {gridIndices.map(i => {
              // Recalculate hints for this specific cell in the current level layout
              const near = visitedSet.has(i) ? getNearbyHazards(i, rows, cols, entityMap) : NO_HINTS;
              
              return (
                <GridCell
                  key={`cell-L${level}-I${i}`} // Force full remount on Level Up to avoid stale grid alignments
                  index={i}
                  tileSize={tileSize}
                  cols={cols}
                  isVisited={visitedSet.has(i)}
                  isPlayerHere={i === playerIndex}
                  entity={entityMap?.[i]}
                  enemyCount={near.enemyCount}
                  pitCount={near.pitCount}
                  highlighted={highlightSet.has(i)}
                  flagged={!!flags && flags.has(i) && !visitedSet.has(i)}
                  aimed={aimTiles && aimTiles.has(i) ? aimDir : null}
                  aimStep={aimTiles && aimTiles.has(i) ? Math.max(Math.abs(Math.floor(i / cols) - rowIndex), Math.abs((i % cols) - colIndex)) : 0}
                  aimLast={!!aimTiles && aimTiles.has(i) && Math.max(Math.abs(Math.floor(i / cols) - rowIndex), Math.abs((i % cols) - colIndex)) === aimTiles.size}
                  facing={i === facingTile ? (facingDir.toUpperCase() as Direction) : null}
                  onTileLoaded={onTileLoaded}
                  pulse={pulse}
                  killer={killerTile === i}
                  flagPing={flagPing && flagPing.index === i ? flagPing.n : 0}
                  biome={biome}
                  revealDelay={burst ? Math.min(900, 70 * (Math.abs(Math.floor(i / cols) - rowIndex) + Math.abs((i % cols) - colIndex))) + 30 : 0}
                />
              );
            })}
          </View>

          {(onTilePress || onSwipe || onTileLongPress || onAimFire) && (
            <BoardTouchLayer
              tileSize={tileSize}
              rows={rows}
              cols={cols}
              onTilePress={onTilePress}
              onSwipe={onSwipe}
              onTileLongPress={onTileLongPress}
              heroIndex={playerIndex}
              onAimDrag={onAimDrag}
              onAimFire={onAimFire}
            />
          )}

          {/* Player sprite */}
          <Animated.View
            style={[
              styles.playerCell,
              {
                width: tileSize,
                height: tileSize,
                position: "absolute",
                opacity: dying && killerTile != null ? strike.interpolate({ inputRange: [0, 1], outputRange: [1, killerEntityType === "pit" ? 0.12 : 0.5] }) : 1,
                transform: [
                  { translateX: playerPos.x }, 
                  { translateY: playerPos.y },
                  { scale: dying && killerTile != null && killerEntityType === "pit" ? strike.interpolate({ inputRange: [0, 1], outputRange: [1, 0.2] }) : playerScale }
                ],
              },
            ]}
            pointerEvents="none"
          >
            {/* Both poses stay mounted and are swapped by opacity: swapping the image source would flash */}
            {/* The art is drawn facing right: mirror it for left; up/down lean away from / toward the viewer. */}
            <View
              style={{
                width: tileSize * 0.8,
                height: tileSize * 0.8,
                transform: [
                  { scaleX: lastSide.current === "left" ? -1 : 1 },
                  { translateY: currentFacing === "up" ? -tileSize * 0.06 : currentFacing === "down" ? tileSize * 0.05 : 0 },
                  { scale: currentFacing === "up" ? 0.94 : currentFacing === "down" ? 1.05 : 1 },
                ],
              }}
            >
              {idleSource && (
                <SpriteImage
                  style={[styles.heroLayer, { opacity: drawn ? 0 : 1 }]}
                  source={idleSource}
                />
              )}
              {attackSource && (
                <SpriteImage
                  style={[styles.heroLayer, { opacity: drawn ? 1 : 0 }]}
                  source={attackSource}
                />
              )}
            </View>
          </Animated.View>

          {flying && (() => {
            const vec = flying.dir === "UP" ? { x: 0, y: -1 } : flying.dir === "DOWN" ? { x: 0, y: 1 } : flying.dir === "LEFT" ? { x: -1, y: 0 } : { x: 1, y: 0 };
            const angle = flying.dir === "UP" ? "-90deg" : flying.dir === "DOWN" ? "90deg" : flying.dir === "LEFT" ? "180deg" : "0deg";
            const reach = flying.tiles * tileSize;
            const head = tileSize * 0.1;
            return (
              <>
                <Animated.View
                  pointerEvents="none"
                  style={{
                    position: "absolute",
                    left: colIndex * tileSize,
                    top: rowIndex * tileSize,
                    width: tileSize,
                    height: tileSize,
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 9,
                    opacity: flight.interpolate({ inputRange: [0, 0.8, 0.95], outputRange: [1, 1, flying.hit ? 0 : 0.2] }),
                    transform: [
                      { translateX: flight.interpolate({ inputRange: [0, 0.8], outputRange: [vec.x * tileSize * 0.35, vec.x * reach], extrapolate: "clamp" }) },
                      { translateY: flight.interpolate({ inputRange: [0, 0.8], outputRange: [vec.y * tileSize * 0.35, vec.y * reach], extrapolate: "clamp" }) },
                      { rotate: angle },
                    ],
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <View style={{ width: tileSize * 0.4, height: Math.max(2, tileSize * 0.07), borderRadius: 2, backgroundColor: "#F5E6B8" }} />
                    <View style={{ width: 0, height: 0, borderTopWidth: head, borderBottomWidth: head, borderLeftWidth: head * 1.8, borderTopColor: "transparent", borderBottomColor: "transparent", borderLeftColor: "#FFD54F" }} />
                  </View>
                </Animated.View>
                {flying.hit && (
                  <Animated.View
                    pointerEvents="none"
                    style={{
                      position: "absolute",
                      left: (colIndex + vec.x * flying.tiles) * tileSize,
                      top: (rowIndex + vec.y * flying.tiles) * tileSize,
                      width: tileSize,
                      height: tileSize,
                      alignItems: "center",
                      justifyContent: "center",
                      zIndex: 9,
                      opacity: flight.interpolate({ inputRange: [0, 0.78, 0.86, 1], outputRange: [0, 0, 0.95, 0] }),
                      transform: [{ scale: flight.interpolate({ inputRange: [0, 0.78, 1], outputRange: [0.3, 0.3, 1.5] }) }],
                    }}
                  >
                    <View style={{ width: tileSize * 0.7, height: tileSize * 0.7, borderRadius: tileSize * 0.35, borderWidth: 3, borderColor: "#FFD54F" }} />
                  </Animated.View>
                )}
              </>
            );
          })()}

          {dying && killerTile != null && killerEntityType && (() => {
            const kr = Math.floor(killerTile / cols);
            const kc = killerTile % cols;
            // The killer leans toward the hero (it is on the hero's own tile when the hero stepped onto it).
            const toward = { x: Math.sign(colIndex - kc), y: Math.sign(rowIndex - kr) };
            const isPit = killerEntityType === "pit";
            const source = isPit ? ASSETS.pit : killerEntityType === "stalker" ? ASSETS.stalker : killerEntityType === "sleeper" ? ASSETS.sleeper : killerEntityType === "boss" ? ASSETS.boss : ASSETS.enemy;
            const big = tileSize * (killerEntityType === "boss" ? 1.5 : 1.25);
            const slash = (angle: string, offset: number, key: string) => (
              <Animated.View
                key={key}
                style={{
                  position: "absolute",
                  width: tileSize * 1.35,
                  height: Math.max(3, tileSize * 0.075),
                  borderRadius: tileSize,
                  backgroundColor: "#FFFFFF",
                  borderWidth: 1,
                  borderColor: "#FF1744",
                  opacity: strike.interpolate({ inputRange: [0, 0.12, 0.6, 1], outputRange: [0, 1, 1, 0.35] }),
                  transform: [{ translateY: offset }, { rotate: angle }, { scaleX: strike.interpolate({ inputRange: [0, 0.3], outputRange: [0.1, 1], extrapolate: "clamp" }) }],
                }}
              />
            );
            return (
              <>
                {!isPit && (
                  <View pointerEvents="none" style={{ position: "absolute", left: colIndex * tileSize, top: rowIndex * tileSize, width: tileSize, height: tileSize, alignItems: "center", justifyContent: "center", zIndex: 26 }}>
                    {slash("-38deg", -tileSize * 0.16, "a")}
                    {slash("-32deg", 0, "b")}
                    {slash("-44deg", tileSize * 0.16, "c")}
                  </View>
                )}
                <View pointerEvents="none" style={{ position: "absolute", left: kc * tileSize, top: kr * tileSize, width: tileSize, height: tileSize, alignItems: "center", justifyContent: "center", zIndex: 25 }}>
                  <Animated.View
                    style={{
                      position: "absolute",
                      width: tileSize * 2.4,
                      height: tileSize * 2.4,
                      borderRadius: tileSize * 1.2,
                      backgroundColor: isPit ? "rgba(156,39,176,0.35)" : "rgba(255,23,68,0.32)",
                      opacity: strike.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 0.95, 0.6] }),
                      transform: [{ scale: strike.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }],
                    }}
                  />
                  <Animated.View
                    style={{
                      width: big,
                      height: big,
                      opacity: strike.interpolate({ inputRange: [0, 0.1, 1], outputRange: [0, 1, 1] }),
                      transform: [
                        { translateX: strike.interpolate({ inputRange: [0, 1], outputRange: [0, toward.x * tileSize * 0.22] }) },
                        { translateY: strike.interpolate({ inputRange: [0, 1], outputRange: [0, toward.y * tileSize * 0.22] }) },
                        { rotate: isPit ? strike.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "420deg"] }) : "0deg" },
                        { scale: strike.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1] }) },
                      ],
                    }}
                  >
                    <SpriteImage style={{ width: big, height: big }} source={source} resizeMode="contain" />
                  </Animated.View>
                </View>
              </>
            );
          })()}
        </Animated.View>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  cameraContainer: { justifyContent: "center", alignItems: "center" },
  boardFrame: {
    backgroundColor: "#111",
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#444",
    position: "relative",
  },
  cell: { alignItems: "center", justifyContent: "center" },
  bossAura: { position: "absolute", backgroundColor: "rgba(255, 23, 68, 0.28)", borderRadius: 8 },
  tileTone: { position: 'absolute', borderRadius: 6 },
  toneLit: { backgroundColor: 'rgba(255,196,110,0.26)', borderWidth: 1.5, borderColor: 'rgba(255,214,150,0.5)' },
  toneDark: { backgroundColor: 'rgba(4,0,18,0.5)' },
  sleepMark: { position: 'absolute', top: 1, right: 3, color: '#B3E5FC', fontWeight: '900' },
  stalkerAura: { position: "absolute", backgroundColor: "rgba(171, 71, 188, 0.3)", borderRadius: 8 },
  stalkerCharged: { backgroundColor: "rgba(171, 71, 188, 0.65)", borderWidth: 2, borderColor: "#FFEB3B" },
  bossCharged: { backgroundColor: "rgba(255, 23, 68, 0.62)", borderWidth: 2, borderColor: "#FFEB3B" },
  facingMark: { position: "absolute", left: 4, top: 4, right: 4, bottom: 4, borderRadius: 8, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.28)", backgroundColor: "rgba(255,255,255,0.06)", alignItems: "center", justifyContent: "center", zIndex: 3 },
  aim: { position: "absolute", left: 3, top: 3, right: 3, bottom: 3, borderRadius: 8, borderWidth: 1.5, borderColor: "rgba(255,82,82,0.6)", backgroundColor: "rgba(255,82,82,0.14)", alignItems: "center", justifyContent: "center", zIndex: 7 },
  aimLast: { borderWidth: 2, borderColor: "rgba(255,82,82,0.95)", backgroundColor: "rgba(255,82,82,0.24)" },
  aimRing: { position: "absolute", borderWidth: 2, borderColor: "rgba(255,255,255,0.85)" },
  highlight: { position: "absolute", left: 2, top: 2, right: 2, bottom: 2, borderWidth: 3, borderColor: "#FFD700", borderRadius: 6, zIndex: 6 },
  bossHp: { position: "absolute", bottom: 0, alignSelf: "center", zIndex: 4 },
  bossHpText: { color: "#FF1744", fontWeight: "900", textShadowColor: "#000", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  pickup: { position: "absolute", zIndex: 2, alignItems: "center", justifyContent: "center" },
  playerHighlight: {
    position: "absolute",
    backgroundColor: "rgba(255,255,255,0.08)",
    zIndex: 1,
  },
  playerCell: { alignItems: "center", justifyContent: "center", zIndex: 20 },
  heroLayer: { position: "absolute", left: 0, top: 0, width: "100%", height: "100%", resizeMode: "contain" },
  hintContainer: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    zIndex: 5,
  },
  hintBadge: {
    padding: 3,
    borderRadius: 100,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    width: '56%',
    height: '56%',
    // High visibility glow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 4,
  },
  // Guardian clue: a warm round badge. Vortex clue: a dark diamond. Shape and brightness differ, not only the hue.
  hintRoar:   { backgroundColor: "#ffd9a0", borderColor: "#e65100", borderWidth: 2, alignItems: "center", justifyContent: "center" },
  hintVortexShape: { position: "absolute", backgroundColor: "#4a148c", borderColor: "#e1bee7", borderWidth: 2, borderRadius: 3, transform: [{ rotate: "45deg" }] },
  hintVortexIcon: { alignItems: "center", justifyContent: "center" },
  hintCount: {
    position: "absolute",
    right: -3,
    bottom: -3,
    paddingHorizontal: 2,
    backgroundColor: "#1b0f0a",
    borderColor: "#ffd9a0",
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  hintCountVortex: { borderColor: "#e1bee7" },
  hintCountText: { color: "#fff", fontWeight: "900", includeFontPadding: false },
  chargeMark: { position: "absolute", top: 1, right: 1, zIndex: 8, borderRadius: 99, backgroundColor: "#FFEB3B", borderWidth: 1.5, borderColor: "#B71C1C", alignItems: "center", justifyContent: "center" },
  chargeMarkText: { color: "#B71C1C", fontWeight: "900", includeFontPadding: false },
  flagBlink: { position: "absolute", left: -6, top: -6, right: -6, bottom: -6, backgroundColor: "rgba(255,23,68,0.55)", borderRadius: 8 },
  killer: { position: "absolute", left: 1, top: 1, right: 1, bottom: 1, borderRadius: 8, borderWidth: 4, borderColor: "#FF1744", backgroundColor: "rgba(255,23,68,0.18)", zIndex: 9 },
  hintText: {
    color: "#fff",
    fontWeight: "900",
  },
});

export default BoardView;
