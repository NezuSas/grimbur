import React, { memo, useRef, useEffect, useMemo } from "react";
import { Image, StyleSheet, Text, View, Animated, ImageSourcePropType, Easing } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import characters from "../../data/characters";
import { useGameLayout } from "../layout/useGameLayout";
import { Direction, GameEntity } from "../../core/engine/types";
import BoardTouchLayer from "./BoardTouchLayer";
import { getNearbyHazards, NearbyHazards } from "../../core/engine/proximity";

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
  /** Long press on a tile (toggles its flag). */
  onTileLongPress?: (index: number) => void;
};

const ASSETS: Record<"enemy" | "boss" | "pit" | "coin" | "shield" | "ammo" | "block" | "blockFog", ImageSourcePropType> = {
  enemy:    require("../../assets/sprites/enemies/Guardian_Enemy.png"),
  boss:     require("../../assets/sprites/enemies/Wumpus_Boss.png"),
  pit:      require("../../assets/sprites/tiles/Danger_Vortex.png"),
  shield:   require("../../assets/sprites/items/Icon_Shield.png"),
  ammo:     require("../../assets/sprites/items/Icon_Arrows.png"),
  coin:     require("../../assets/sprites/items/Icon_Gem.png"),
  block:    require("../../assets/sprites/tiles/Tile_Revealed.png"),
  blockFog: require("../../assets/sprites/tiles/Tile_Hidden.png"),
};

const NO_HINTS: NearbyHazards = { enemy: false, pit: false, enemyCount: 0, pitCount: 0 };

const DIR_CHAR: Record<"up" | "right" | "down" | "left", string> = {
  up: "▲", right: "▶", down: "▼", left: "◀",
};

// ─── Optimized Grid Cell Component ──────────────────────────────────────────
const GridCell = memo(({ 
  index, tileSize, cols, isVisited, isPlayerHere, entity, enemyCount, pitCount, highlighted, flagged
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
}) => {
  const roar = enemyCount > 0;
  const vortex = pitCount > 0;
  const pulseAnim = useRef(new Animated.Value(0)).current;
  // The hint badge breathes between 85% and 100%: it must stay visible at every moment.
  const hintScale = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] });

  // A tile "pops" when it is uncovered (not when the floor first draws): quick, native-driven, and a no-op on mount.
  const revealScale = useRef(new Animated.Value(1)).current;
  const wasVisited = useRef(isVisited);
  useEffect(() => {
    if (isVisited && !wasVisited.current) {
      revealScale.setValue(0.82);
      Animated.spring(revealScale, { toValue: 1, friction: 5, tension: 160, useNativeDriver: true }).start();
    }
    wasVisited.current = isVisited;
  }, [isVisited]);

  // Background priority: visited block > fog
  let backgroundAsset = (isVisited || isPlayerHere) ? ASSETS.block : ASSETS.blockFog;

  const row = Math.floor(index / cols);
  const col = index % cols;

  // Don't show hint if an entity is directly on this cell (it would overlap)
  const showHints = isVisited && !entity && (roar || vortex);

  // Local Pulse Animation for this cell
  useEffect(() => {
    if (showHints) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    } else {
      pulseAnim.setValue(0);
    }
  }, [showHints]);

  return (
    <View
      style={[
        styles.cell,
        { width: tileSize, height: tileSize, position: "absolute", left: col * tileSize, top: row * tileSize },
      ]}
    >
      {/* Base tile */}
      <Animated.Image
        style={{ width: tileSize, height: tileSize, transform: [{ scale: revealScale }] }}
        source={backgroundAsset}
        resizeMode="contain"
      />

      {/* Danger pulse tint */}
      {showHints && !isPlayerHere && (
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: vortex ? "rgba(156,39,176,0.15)" : "rgba(255,220,0,0.08)",
              opacity: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.1, 0.25] }),
            },
          ]}
        />
      )}

      {/* Pit / Enemy revealed when visited */}
      {entity?.type === 'stalker' && (isVisited || isPlayerHere) && (
        <View
          style={[styles.stalkerAura, { width: tileSize, height: tileSize }, (entity.charge ?? 0) >= 1 && styles.stalkerCharged]}
          pointerEvents="none"
        />
      )}

      {entity && (entity.type === 'pit' || entity.type === 'enemy' || entity.type === 'stalker') && (isVisited || isPlayerHere) && (
        <Image
          style={{ width: tileSize * 0.9, height: tileSize * 0.9, position: 'absolute' }}
          source={entity.type === 'pit' ? ASSETS.pit : ASSETS.enemy}
          resizeMode="contain"
        />
      )}

      {/* The Wumpus: shown on explored tiles, with its remaining hearts */}
      {entity?.type === 'boss' && (isVisited || isPlayerHere) && (
        <>
          <View
            style={[
              styles.bossAura,
              { width: tileSize, height: tileSize },
              (entity.charge ?? 0) >= 1 && styles.bossCharged,
            ]}
            pointerEvents="none"
          />
          <Image
            style={{ width: tileSize * 1.15, height: tileSize * 1.15, position: 'absolute' }}
            source={ASSETS.boss}
            resizeMode="contain"
          />
          <View style={styles.bossHp} pointerEvents="none">
            <Text style={[styles.bossHpText, { fontSize: Math.max(9, tileSize * 0.26) }]}>{'♥'.repeat(Math.max(entity.hp ?? 0, 0))}</Text>
          </View>
        </>
      )}

      {/* Hints: Roar/Heat (ENHANCED SIZE) */}
      {showHints && (
        <View style={styles.hintContainer} pointerEvents="none">
          {roar && (
            <Animated.View style={[styles.hintBadge, styles.hintRoar, { transform: [{ scale: hintScale }] }]}>
              <Ionicons name="volume-high" size={tileSize * 0.42} color="#bf360c" />
              {enemyCount > 1 && <Text style={[styles.hintCount, { fontSize: Math.max(9, tileSize * 0.28), color: "#bf360c" }]}>{enemyCount}</Text>}
            </Animated.View>
          )}
          {vortex && (
            <Animated.View style={[styles.hintBadge, styles.hintVortex, { transform: [{ scale: hintScale }] }]}>
              <Ionicons name="infinite" size={tileSize * 0.42} color="#fff" />
              {pitCount > 1 && <Text style={[styles.hintCount, { fontSize: Math.max(9, tileSize * 0.28), color: "#fff" }]}>{pitCount}</Text>}
            </Animated.View>
          )}
        </View>
      )}

      {/* Render Entity (Gem) overlaid on background */}
      {entity?.type === 'coin' && (
        <Image 
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
          <Image source={ASSETS.shield} style={{ width: tileSize * 0.7, height: tileSize * 0.7 }} resizeMode="contain" />
        </View>
      )}
      {entity?.type === 'ammo' && (
        <View style={styles.pickup} pointerEvents="none">
          <Image source={ASSETS.ammo} style={{ width: tileSize * 0.7, height: tileSize * 0.7 }} resizeMode="contain" />
        </View>
      )}

      {flagged && (
        <View style={styles.pickup} pointerEvents="none">
          <Ionicons name="flag" size={tileSize * 0.5} color="#FF5252" />
        </View>
      )}

      {highlighted && <View style={styles.highlight} pointerEvents="none" />}

      {/* Player highlight glow */}
      {isPlayerHere && (
        <View style={[styles.playerHighlight, { width: tileSize, height: tileSize }]} />
      )}
    </View>
  );
});

const BoardView: React.FC<Props> = memo(
  ({ level, rows, cols, entityMap = {}, visited, playerIndex, characterIndex, facingDir, guardianCount, isAttacking, highlight, onTilePress, onSwipe, flags, onTileLongPress }) => {
    const { tileSize, boardWidth, boardHeight } = useGameLayout(cols, rows);

    const rowIndex = Math.floor(playerIndex / cols);
    const colIndex = playerIndex % cols;

    // ── Animations ────────────────────────────────────────────────────────
    const playerPos  = useRef(new Animated.ValueXY({ x: colIndex * tileSize, y: rowIndex * tileSize })).current;
    const shakeAnim  = useRef(new Animated.Value(0)).current;
    const shakeGuard = useRef<number | undefined>(guardianCount);

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
      if (prev === undefined || guardianCount >= prev) return;

      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 3,  duration: 40, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -3, duration: 40, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 2,  duration: 30, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0,  duration: 30, useNativeDriver: true }),
      ]).start();
    }, [guardianCount]);

    // ── Memoized state sets ───────────────────────────────────────────────
    const visitedSet = useMemo(() => new Set(visited), [visited]);
    const highlightSet = useMemo(() => new Set(highlight ?? []), [highlight]);
    const gridIndices = useMemo(() => Array.from({ length: rows * cols }, (_, i) => i), [rows, cols]);

    const playerSource = isAttacking 
      ? characters[characterIndex]?.attackImage 
      : characters[characterIndex]?.playerImage;
    const currentFacing = (facingDir || 'RIGHT').toLowerCase() as "up" | "down" | "left" | "right";

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
                />
              );
            })}
          </View>

          {(onTilePress || onSwipe || onTileLongPress) && (
            <BoardTouchLayer
              tileSize={tileSize}
              rows={rows}
              cols={cols}
              onTilePress={onTilePress}
              onSwipe={onSwipe}
              onTileLongPress={onTileLongPress}
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
                transform: [
                  { translateX: playerPos.x }, 
                  { translateY: playerPos.y },
                  { scale: playerScale }
                ],
              },
            ]}
            pointerEvents="none"
          >
            {playerSource && (
              <Image style={{ width: tileSize * 0.8, height: tileSize * 0.8, resizeMode: "contain" }} source={playerSource} />
            )}
            <View style={[styles.arrowWrap, { top: -tileSize * 0.05, width: tileSize }]}>
              <Text style={[styles.arrowText, { fontSize: tileSize * 0.35 }]}>
                {DIR_CHAR[currentFacing]}
              </Text>
            </View>
          </Animated.View>
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
  stalkerAura: { position: "absolute", backgroundColor: "rgba(171, 71, 188, 0.3)", borderRadius: 8 },
  stalkerCharged: { backgroundColor: "rgba(171, 71, 188, 0.65)", borderWidth: 2, borderColor: "#FFEB3B" },
  bossCharged: { backgroundColor: "rgba(255, 23, 68, 0.62)", borderWidth: 2, borderColor: "#FFEB3B" },
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
  arrowWrap: { position: "absolute", alignItems: "center" },
  arrowText: {
    color: "#ffeb3b",
    fontWeight: "bold",
    textShadowColor: "#000",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  hintContainer: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    gap: 1,
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
  hintRoar:   { backgroundColor: "#ffcc80", borderColor: "#ef6c00" },
  hintVortex: { backgroundColor: "#9c27b0", borderColor: "#6a1b9a" },
  hintCount: {
    position: "absolute",
    right: 1,
    bottom: -1,
    fontWeight: "900",
    textShadowColor: "#000",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  hintText: {
    color: "#fff",
    fontWeight: "900",
  },
});

export default BoardView;
