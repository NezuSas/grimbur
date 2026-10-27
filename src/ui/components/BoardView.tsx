import React, { memo, useCallback, useRef, useEffect, useMemo, useState } from "react";
import { StyleSheet, View, Animated, Easing } from "react-native";
import { characterWithSkin } from "../../data/characterSkins";
import type { SkinId } from "../../data/skinArt";
import type { BiomeId } from "../../core/engine/biomes";
import { useGameLayout } from "../layout/useGameLayout";
import { Direction, GameEntity } from "../../core/engine/types";
import BoardTouchLayer from "./BoardTouchLayer";
import { stepTarget } from "../../core/engine/travel";
import { getNearbyHazards } from "../../core/engine/proximity";
import SpriteImage from "./SpriteImage";
import GridCell, { ASSETS, NO_HINTS } from "./GridCell";

/** An arrow in flight: shot toward `dir`, crossing `tiles` tiles, and whether it hit something at the end. `key` changes per shot. */
export type ArrowShot = { key: number; dir: Direction; tiles: number; hit: boolean };
/** How long an arrow flies: farther tiles take longer. */
const flightMs = (shot: ArrowShot) => 110 + 55 * shot.tiles;

/** Three specks of dust that drift up from the tile the hero just left, then vanish. */
const DustPuff = memo(({ x, y, tileSize, onDone }: { x: number; y: number; tileSize: number; onDone: () => void }) => {
  const progress = useRef(new Animated.Value(0)).current;
  const specks = useRef(
    [0, 1, 2].map(i => ({
      ox: 0.28 + 0.18 * i + (Math.random() - 0.5) * 0.08,
      dx: (Math.random() - 0.5) * 0.4,
      dy: -0.12 - Math.random() * 0.18,
      size: tileSize * (0.07 + Math.random() * 0.05),
    })),
  ).current;
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  useEffect(() => {
    Animated.timing(progress, { toValue: 1, duration: 430, easing: Easing.out(Easing.quad), useNativeDriver: true }).start(({ finished }) => {
      if (finished) onDoneRef.current();
    });
  }, [progress]);
  return (
    <View pointerEvents="none" style={{ position: "absolute", left: x, top: y, width: tileSize, height: tileSize, zIndex: 3 }}>
      {specks.map((s, i) => (
        <Animated.View
          key={i}
          style={{
            position: "absolute",
            left: tileSize * s.ox,
            bottom: tileSize * 0.16,
            width: s.size,
            height: s.size,
            borderRadius: s.size / 2,
            backgroundColor: "rgba(216,196,168,0.55)",
            opacity: progress.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.85, 0] }),
            transform: [
              { translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [0, s.dx * tileSize] }) },
              { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [0, s.dy * tileSize] }) },
              { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.5] }) },
            ],
          }}
        />
      ))}
    </View>
  );
});
DustPuff.displayName = "DustPuff";

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
  /** Bumped when something heavy lands (a hit on the Grimbur): the board shakes once. */
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

const BoardView: React.FC<Props> = memo(
  ({ level, rows, cols, entityMap = {}, visited, playerIndex, characterIndex, facingDir, guardianCount, isAttacking, highlight, onTilePress, onSwipe, flags, aimTiles, aimDir = null, shot = null, onAimDrag, onAimFire, onTileLongPress, onReady, dying, killerTile, shakeKey, flagPing, calm, skin, biome = "cave" }) => {
    const { tileSize, boardWidth, boardHeight } = useGameLayout(cols, rows);

    const rowIndex = Math.floor(playerIndex / cols);
    const colIndex = playerIndex % cols;

    // ── Animations ────────────────────────────────────────────────────────
    const playerPos  = useRef(new Animated.ValueXY({ x: colIndex * tileSize, y: rowIndex * tileSize })).current;
    const shakeAnim  = useRef(new Animated.Value(0)).current;
    const shakeY     = useRef(new Animated.Value(0)).current;
    const punch      = useRef(new Animated.Value(1)).current;
    const shakeGuard = useRef<number | undefined>(guardianCount);

    // A hit lands in three beats: wait for the arrow to arrive, freeze for a blink on a slight punch (the hit-stop), then
    // the board shakes both ways and lets go. Callers skip it when calm.
    const impact = useCallback((amp: number, holdMs: number, waitMs: number) => {
      const to = (value: Animated.Value, toValue: number, duration: number) => Animated.timing(value, { toValue, duration, useNativeDriver: true });
      Animated.sequence([
        Animated.delay(waitMs),
        to(punch, 1.02, 0),
        Animated.delay(holdMs),
        Animated.parallel([
          Animated.sequence([to(shakeAnim, amp, 40), to(shakeAnim, -amp, 50), to(shakeAnim, amp * 0.6, 45), to(shakeAnim, -amp * 0.35, 45), to(shakeAnim, 0, 40)]),
          Animated.sequence([to(shakeY, -amp * 0.6, 40), to(shakeY, amp * 0.5, 50), to(shakeY, -amp * 0.3, 45), to(shakeY, 0, 85)]),
          to(punch, 1, 220),
        ]),
      ]).start();
    }, [punch, shakeAnim, shakeY]);

    // When the arrow in flight lands (ms since epoch): a kill or a hit on the Grimbur waits for it.
    const arrowLands = useRef(0);
    useEffect(() => {
      if (shot && !calm) arrowLands.current = Date.now() + flightMs(shot);
    }, [shot, calm]);
    const untilArrowLands = () => Math.max(0, arrowLands.current - Date.now());

    // One breathing value for every clue badge, wind-up aura, bobbing gem and swelling vortex
    // (a loop per cell used to cost one timer each).
    const pulse = useRef(new Animated.Value(0)).current;
    const needsPulse = useMemo(() => {
      for (const key in entityMap) {
        const e = entityMap[key];
        if (e.type === 'coin' || e.type === 'pit') return true; // gems bob, vortexes swell
        if ((e.type === 'boss' || e.type === 'stalker') && (e.charge ?? 0) >= 1) return true;
      }
      for (const i of visited) {
        if (entityMap[i] !== undefined) continue;
        const near = getNearbyHazards(i, rows, cols, entityMap);
        if (near.enemy || near.pit) return true;
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

    // The hero breathes while standing still: a slow, tiny vertical swell (off when the player asked for calm).
    const heroBreath = useRef(new Animated.Value(1)).current;
    useEffect(() => {
      if (calm) {
        heroBreath.setValue(1);
        return;
      }
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(heroBreath, { toValue: 1.04, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(heroBreath, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
      );
      loop.start();
      return () => loop.stop();
    }, [calm, heroBreath]);

    // Little dust puffs where the hero just stepped off: cheap, native-driven, gone in half a second.
    const [dusts, setDusts] = useState<{ id: number; x: number; y: number }[]>([]);
    const dustId = useRef(0);
    const removeDust = useCallback((id: number) => setDusts(prev => prev.filter(d => d.id !== id)), []);

    // A new floor or a restart puts the hero on its start tile: it appears there instead of sliding in from the old spot.
    const lastFloor = useRef({ level, seen: visited.length });
    const prevCell = useRef({ row: rowIndex, col: colIndex });
    useEffect(() => {
      const prev = lastFloor.current;
      lastFloor.current = { level, seen: visited.length };
      const from = prevCell.current;
      prevCell.current = { row: rowIndex, col: colIndex };
      if (level !== prev.level || visited.length < prev.seen) {
        playerPos.setValue({ x: colIndex * tileSize, y: rowIndex * tileSize });
        setDusts([]);
        return;
      }
      if (!calm && (from.row !== rowIndex || from.col !== colIndex)) {
        const id = ++dustId.current;
        setDusts(current => [...current.slice(-5), { id, x: from.col * tileSize, y: from.row * tileSize }]);
      }
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
      impact(3, 60, untilArrowLands());
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

    // Death: the longest freeze and one hard shake, at once (the blow is not an arrow).
    useEffect(() => {
      if (!dying || calm) return;
      impact(9, 100, 0);
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

    // The hero fades (or, swallowed by a vortex, shrinks). These values are bound to the hero from the very first render and
    // only change value: swapping the style from a number to an animated value at the moment of death, while the step
    // animation is still running, made the hero stutter.
    const heroFade = useRef(new Animated.Value(1)).current;
    const heroShrink = useRef(new Animated.Value(1)).current;
    useEffect(() => {
      if (!dying || killerTile == null) {
        heroFade.setValue(1);
        heroShrink.setValue(1);
        return;
      }
      const swallowed = entityMap[killerTile]?.type === "pit";
      const toOpacity = swallowed ? 0.12 : 0.5;
      const toScale = swallowed ? 0.2 : 1;
      if (calm) {
        heroFade.setValue(toOpacity);
        heroShrink.setValue(toScale);
        return;
      }
      Animated.parallel([
        Animated.timing(heroFade, { toValue: toOpacity, duration: 260, useNativeDriver: true }),
        Animated.timing(heroShrink, { toValue: toScale, duration: 420, useNativeDriver: true }),
      ]).start();
    }, [dying, killerTile, calm]);

    // A heavy hit (the Grimbur took an arrow): a short, firm shake.
    const lastShakeKey = useRef(shakeKey);
    useEffect(() => {
      if (shakeKey === lastShakeKey.current) return;
      lastShakeKey.current = shakeKey;
      if (calm) return;
      impact(6, 80, untilArrowLands());
    }, [shakeKey]);

    // ── Memoized state sets ───────────────────────────────────────────────
    const visitedSet = useMemo(() => new Set(visited), [visited]);
    // Uncovering two or more tiles in one go (the lantern relic, the scout) makes a ripple that spreads ring by ring
    // from the hero, on the tile just reached; a new floor opens the same way from its start tile. Calm: no ripple.
    const lastVisited = useRef({ level: -1, count: 0 });
    const entering = lastVisited.current.level !== level;
    const burst = !calm && (entering || visited.length - lastVisited.current.count >= 2);
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
      Animated.timing(flight, { toValue: 1, duration: flightMs(shot), easing: Easing.out(Easing.quad), useNativeDriver: true }).start(({ finished }) => {
        if (finished) setFlying(null);
      });
    }, [shot?.key]);

    return (
      <View style={styles.cameraContainer}>
        <Animated.View
          style={[
            styles.boardFrame,
            { width: boardWidth, height: boardHeight, transform: [{ translateX: shakeAnim }, { translateY: shakeY }, { scale: punch }], overflow: dying && killerTile != null ? "visible" : "hidden" },
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
                  calm={!!calm}
                  revealDelay={burst ? Math.min(600, 60 * Math.max(Math.abs(Math.floor(i / cols) - rowIndex), Math.abs((i % cols) - colIndex))) + 30 : 0}
                />
              );
            })}
          </View>

          {dusts.map(d => (
            <DustPuff key={d.id} x={d.x} y={d.y} tileSize={tileSize} onDone={() => removeDust(d.id)} />
          ))}

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
                opacity: heroFade,
                transform: [
                  { translateX: playerPos.x }, 
                  { translateY: playerPos.y },
                  { scale: playerScale },
                  { scale: heroShrink }
                ],
              },
            ]}
            pointerEvents="none"
          >
            {/* Both poses stay mounted and are swapped by opacity: swapping the image source would flash */}
            {/* The art is drawn facing right: mirror it for left; up/down lean away from / toward the viewer. */}
            <Animated.View
              style={{
                width: tileSize * 0.8,
                height: tileSize * 0.8,
                transform: [
                  { scaleX: lastSide.current === "left" ? -1 : 1 },
                  { translateY: currentFacing === "up" ? -tileSize * 0.06 : currentFacing === "down" ? tileSize * 0.05 : 0 },
                  { scale: currentFacing === "up" ? 0.94 : currentFacing === "down" ? 1.05 : 1 },
                  { scaleY: heroBreath },
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
            </Animated.View>
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

          {/* A spotlight on the killer: the rest of the board dims so nothing competes with it */}
          {dying && killerTile != null && killerEntityType && (
            <Animated.View
              pointerEvents="none"
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: boardWidth,
                height: boardHeight,
                backgroundColor: "rgba(10,3,14,0.6)",
                zIndex: 24,
                opacity: strike.interpolate({ inputRange: [0, 0.4], outputRange: [0, 1], extrapolate: "clamp" }),
              }}
            />
          )}

          {dying && killerTile != null && killerEntityType && (() => {
            const kr = Math.floor(killerTile / cols);
            const kc = killerTile % cols;
            // The killer leans toward the hero (it is on the hero's own tile when the hero stepped onto it).
            const toward = { x: Math.sign(colIndex - kc), y: Math.sign(rowIndex - kr) };
            const isPit = killerEntityType === "pit";
            const source = isPit ? ASSETS.pit : killerEntityType === "stalker" ? ASSETS.stalker : killerEntityType === "sleeper" ? ASSETS.sleeper : killerEntityType === "boss" ? ASSETS.boss : ASSETS.enemy;
            const big = tileSize * (killerEntityType === "boss" ? 2.4 : 1.95);
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
  playerCell: { alignItems: "center", justifyContent: "center", zIndex: 20 },
  heroLayer: { position: "absolute", left: 0, top: 0, width: "100%", height: "100%", resizeMode: "contain" },
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
  hintText: {
    color: "#fff",
    fontWeight: "900",
  },
});

export default BoardView;
