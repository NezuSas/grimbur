import React, { memo, useRef, useEffect, useMemo } from "react";
import { Image, StyleSheet, Text, View, Animated, ImageSourcePropType, Easing } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import characters from "../../data/characters";
import { useGameLayout } from "../layout/useGameLayout";
import { GameEntity } from "../../core/engine/types";
import { getNearbyHazards, NearbyHazards } from "../../core/engine/proximity";

type Props = {
  level: number;
  rows: number;
  cols: number;
  entities: GameEntity[];
  entityMap: Record<number, GameEntity>;
  visited: number[];
  playerIndex: number;
  characterIndex: number;
  facingDir: "up" | "down" | "left" | "right" | "UP" | "DOWN" | "LEFT" | "RIGHT";
  isGameOver?: boolean;
  isAttacking?: boolean;
  /** Enemy count at last kill — passed from GameScreen to decouple shake from coin events */
  lastKilledEnemyCount?: number;
};

const ASSETS: Record<"enemy" | "pit" | "coin" | "block" | "blockFog", ImageSourcePropType> = {
  enemy:    require("../../assets/sprites/enemies/Guardian_Enemy.png"),
  pit:      require("../../assets/sprites/tiles/Danger_Vortex.png"),
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
  index, tileSize, rows, cols, isVisited, isPlayerHere, entity, hints 
}: {
  index: number;
  tileSize: number;
  rows: number;
  cols: number;
  isVisited: boolean;
  isPlayerHere: boolean;
  entity?: GameEntity;
  hints: NearbyHazards;
}) => {
  const roar = hints.enemy;
  const vortex = hints.pit;
  const pulseAnim = useRef(new Animated.Value(0)).current;

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
      <Image style={{ width: tileSize, height: tileSize }} source={backgroundAsset} resizeMode="contain" />

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
      {entity && (entity.type === 'pit' || entity.type === 'enemy') && (isVisited || isPlayerHere) && (
        <Image
          style={{ width: tileSize * 0.9, height: tileSize * 0.9, position: 'absolute' }}
          source={entity.type === 'enemy' ? ASSETS.enemy : ASSETS.pit}
          resizeMode="contain"
        />
      )}

      {/* Hints: Roar/Heat (ENHANCED SIZE) */}
      {showHints && (
        <View style={styles.hintContainer} pointerEvents="none">
          {roar && (
            <Animated.View style={[styles.hintBadge, styles.hintRoar, { transform: [{ scale: pulseAnim }] }]}>
              <Ionicons name="volume-high" size={tileSize * 0.42} color="#bf360c" />
              {hints.enemyCount > 1 && <Text style={[styles.hintCount, { fontSize: tileSize * 0.26, color: "#bf360c" }]}>{hints.enemyCount}</Text>}
            </Animated.View>
          )}
          {vortex && (
            <Animated.View style={[styles.hintBadge, styles.hintVortex, { transform: [{ scale: pulseAnim }] }]}>
              <Ionicons name="infinite" size={tileSize * 0.42} color="#fff" />
              {hints.pitCount > 1 && <Text style={[styles.hintCount, { fontSize: tileSize * 0.26, color: "#fff" }]}>{hints.pitCount}</Text>}
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
          <Ionicons name="shield-checkmark" size={tileSize * 0.6} color="#4FC3F7" />
        </View>
      )}
      {entity?.type === 'ammo' && (
        <View style={styles.pickup} pointerEvents="none">
          <Ionicons name="arrow-forward-circle" size={tileSize * 0.6} color="#FF9800" />
        </View>
      )}

      {/* Player highlight glow */}
      {isPlayerHere && (
        <View style={[styles.playerHighlight, { width: tileSize, height: tileSize }]} />
      )}
    </View>
  );
});

const BoardView: React.FC<Props> = memo(
  ({ level, rows, cols, entityMap = {}, visited, playerIndex, characterIndex, facingDir, lastKilledEnemyCount, isAttacking }) => {
    const { tileSize, boardWidth, boardHeight } = useGameLayout(cols, rows);

    const rowIndex = Math.floor(playerIndex / cols);
    const colIndex = playerIndex % cols;

    // ── Animations ────────────────────────────────────────────────────────
    const playerPos  = useRef(new Animated.ValueXY({ x: colIndex * tileSize, y: rowIndex * tileSize })).current;
    const shakeAnim  = useRef(new Animated.Value(0)).current;
    const shakeGuard = useRef<number | undefined>(lastKilledEnemyCount);

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

    // Board Shake on kill
    useEffect(() => {
      if (lastKilledEnemyCount === undefined) return;
      const prev = shakeGuard.current;
      shakeGuard.current = lastKilledEnemyCount;
      if (prev === undefined || lastKilledEnemyCount >= prev) return;

      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 3,  duration: 40, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -3, duration: 40, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 2,  duration: 30, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0,  duration: 30, useNativeDriver: true }),
      ]).start();
    }, [lastKilledEnemyCount]);

    // ── Memoized state sets ───────────────────────────────────────────────
    const visitedSet = useMemo(() => new Set(visited), [visited]);
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
              const hints = visitedSet.has(i) ? getNearbyHazards(i, rows, cols, entityMap) : NO_HINTS;
              
              return (
                <GridCell
                  key={`cell-L${level}-I${i}`} // Force full remount on Level Up to avoid stale grid alignments
                  index={i}
                  tileSize={tileSize}
                  rows={rows}
                  cols={cols}
                  isVisited={visitedSet.has(i)}
                  isPlayerHere={i === playerIndex}
                  entity={entityMap?.[i]}
                  hints={hints}
                />
              );
            })}
          </View>

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
