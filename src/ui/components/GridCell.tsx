import React, { memo, useRef, useEffect, useMemo, useState } from "react";
import { StyleSheet, View, Animated, ImageSourcePropType } from "react-native";
import Text from "./Text";
import { Ionicons } from "@expo/vector-icons";
import { BIOME_ART } from "../biomeArt";
import type { BiomeId } from "../../core/engine/biomes";
import type { Direction, GameEntity } from "../../core/engine/types";
import type { NearbyHazards } from "../../core/engine/proximity";
import SpriteImage, { AnimatedSprite } from "./SpriteImage";

export const ASSETS: Record<"enemy" | "stalker" | "sleeper" | "boss" | "pit" | "coin" | "shield" | "ammo", ImageSourcePropType> = {
  enemy:    require("../../assets/sprites/enemies/Guardian_Enemy.png"),
  stalker:  require("../../assets/sprites/enemies/Stalker_Enemy.png"),
  sleeper:  require("../../assets/sprites/enemies/Sleeper_Enemy.png"),
  boss:     require("../../assets/sprites/enemies/Grimbur_Boss.png"),
  pit:      require("../../assets/sprites/tiles/Danger_Vortex.png"),
  shield:   require("../../assets/sprites/items/Icon_Shield.png"),
  ammo:     require("../../assets/sprites/items/Icon_Arrows.png"),
  coin:     require("../../assets/sprites/items/Icon_Gem.png"),
};

export const NO_HINTS: NearbyHazards = { enemy: false, pit: false, enemyCount: 0, pitCount: 0 };

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
  /** Guardians (and the Grimbur) touching this tile; only set on explored tiles. */
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

      {/* The Grimbur: shown on explored tiles, with its remaining hearts */}
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


const styles = StyleSheet.create({
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
  highlight: { position: "absolute", left: 2, top: 2, right: 2, bottom: 2, borderWidth: 3, borderColor: "#FFD54F", borderRadius: 6, zIndex: 6 },
  bossHp: { position: "absolute", bottom: 0, alignSelf: "center", zIndex: 4 },
  bossHpText: { color: "#FF1744", fontWeight: "900", textShadowColor: "#000", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  pickup: { position: "absolute", zIndex: 2, alignItems: "center", justifyContent: "center" },
  playerHighlight: {
    position: "absolute",
    backgroundColor: "rgba(255,255,255,0.08)",
    zIndex: 1,
  },
  hintContainer: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    zIndex: 5,
  },
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
});

export default GridCell;
