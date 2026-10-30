import React, { memo, useRef, useEffect, useMemo, useState } from "react";
import { StyleSheet, View, Animated, Easing, ImageSourcePropType } from "react-native";
import Text from "./Text";
import { Ionicons } from "@expo/vector-icons";
import { BIOME_ART } from "../biomeArt";
import type { ArtTheme } from "../biomeArt";
import type { Direction, GameEntity } from "../../core/engine/types";
import type { NearbyHazards } from "../../core/engine/proximity";
import SpriteImage, { AnimatedSprite } from "./SpriteImage";
import BossSprite from "./BossSprite";
import GlyphIcon from "./GlyphIcon";

const TRAP_SPRUNG = require("../../assets/sprites/tiles/Trap_Sprung.png");

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

/** The second frame of each guardian: generated as one sheet per character, so the pair always matches. */
/** The painted clue tokens: their shapes match what the manual and the tutorial describe. */
export const CLUE_ART = {
  roar: require("../../assets/sprites/ui/Clue_Guardian.png"),
  vortex: require("../../assets/sprites/ui/Clue_Vortex.png"),
} as const;

const BREATHE: Record<"enemy" | "stalker" | "sleeper", ImageSourcePropType> = {
  enemy:   require("../../assets/sprites/enemies/Guardian_Enemy_Breathe.png"),
  stalker: require("../../assets/sprites/enemies/Stalker_Enemy_Breathe.png"),
  sleeper: require("../../assets/sprites/enemies/Sleeper_Enemy_Breathe.png"),
};

export const NO_HINTS: NearbyHazards = { enemy: false, pit: false, enemyCount: 0, pitCount: 0 };

const FACING_ICON: Record<Direction, keyof typeof Ionicons.glyphMap> = {
  UP: "chevron-up",
  DOWN: "chevron-down",
  LEFT: "chevron-back",
  RIGHT: "chevron-forward",
};

/** A guardian breathes: two frames swapped on a slow beat, each creature on its own phase so a floor never moves in lockstep. */
const EnemySprite = memo(({ type, size, calm }: { type: "enemy" | "stalker" | "sleeper"; size: number; calm: boolean }) => {
  const [inhale, setInhale] = useState(false);
  useEffect(() => {
    if (calm) {
      setInhale(false);
      return;
    }
    let interval: ReturnType<typeof setInterval> | undefined;
    const start = setTimeout(() => {
      setInhale(true);
      interval = setInterval(() => setInhale(v => !v), 850);
    }, 150 + Math.random() * 900);
    return () => {
      clearTimeout(start);
      if (interval) clearInterval(interval);
    };
  }, [calm]);
  return (
    <>
      {/* A dark pool under the creature and a faint ember of danger: painted stone on painted stone needs the separation. */}
      <View pointerEvents="none" style={[styles.creatureGlow, { width: size * 0.86, height: size * 0.5, borderRadius: size, bottom: size * 0.02 }]} />
      <View pointerEvents="none" style={[styles.creatureShadow, { width: size * 0.7, height: size * 0.2, borderRadius: size, bottom: size * 0.04 }]} />
      <SpriteImage
        style={{ width: size, height: size, position: "absolute" }}
        source={inhale ? BREATHE[type] : ASSETS[type]}
        resizeMode="contain"
      />
    </>
  );
});
EnemySprite.displayName = "EnemySprite";

/** The vortex turns slowly forever (and swells with the shared pulse): a whirlpool, not a sticker. */
const VortexSprite = memo(({ size, calm, pulse }: { size: number; calm: boolean; pulse: Animated.Value }) => {
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (calm) {
      spin.setValue(0);
      return;
    }
    const loop = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 7000, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [calm, spin]);
  return (
    <AnimatedSprite
      style={{
        width: size,
        height: size,
        position: "absolute",
        transform: [
          { rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "-360deg"] }) },
          { scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1.05] }) },
        ],
      }}
      source={ASSETS.pit}
      resizeMode="contain"
    />
  );
});
VortexSprite.displayName = "VortexSprite";

/** A gem bobs with the shared pulse and glints every few seconds (each one on its own beat). */
const GemSprite = memo(({ tileSize, calm, pulse }: { tileSize: number; calm: boolean; pulse: Animated.Value }) => {
  const sparkle = useRef(new Animated.Value(0)).current;
  const beat = useRef(600 + Math.random() * 2600).current;
  useEffect(() => {
    if (calm) {
      sparkle.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(beat),
        Animated.timing(sparkle, { toValue: 1, duration: 240, useNativeDriver: true }),
        Animated.timing(sparkle, { toValue: 0, duration: 420, useNativeDriver: true }),
        Animated.delay(1600),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [calm, sparkle, beat]);
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        width: tileSize * 0.5,
        height: tileSize * 0.5,
        alignSelf: "center",
        top: tileSize * 0.25,
        zIndex: 2,
        transform: [{ translateY: pulse.interpolate({ inputRange: [0, 1], outputRange: [0, -tileSize * 0.045] }) }],
      }}
    >
      <SpriteImage source={ASSETS.coin} style={{ width: "100%", height: "100%" }} resizeMode="contain" />
      <Animated.View
        style={{
          position: "absolute",
          top: "6%",
          right: "10%",
          width: tileSize * 0.11,
          height: tileSize * 0.11,
          borderRadius: tileSize * 0.055,
          backgroundColor: "#FFFFFF",
          opacity: sparkle,
          transform: [{ scale: sparkle.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1.4] }) }],
        }}
      />
    </Animated.View>
  );
});
GemSprite.displayName = "GemSprite";

// ─── Optimized Grid Cell Component ──────────────────────────────────────────
const GridCell = memo(({ 
  index, tileSize, cols, isVisited: visitedProp, isPlayerHere, entity, enemyCount, pitCount, highlighted, flagged, aimed, aimStep, aimLast, onTileLoaded, revealDelay, pulse, beat, killer, flagPing, biome, calm, sprung = false, flagArt, unveiled = false
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
  /** The tile's base image has been drawn. */
  onTileLoaded: () => void;
  /** When many tiles are uncovered at once (a relic), each one waits this long so they open as a ripple. */
  revealDelay: number;
  /** One breathing value shared by every cell of the board (0..1): clue badges and wind-up auras follow it. */
  pulse: Animated.Value;
  /** The heartbeat, only while the hero stands next to a hazard: the clue badges beat with it instead of breathing. */
  beat?: Animated.Value;
  /** This tile killed the hero. */
  killer: boolean;
  /** Changes every time a step onto this flagged tile is refused (0 = never). */
  flagPing: number;
  /** The cave type of the floor: it decides which pair of tiles is drawn. */
  biome: ArtTheme;
  /** Reduced motion: the vortex does not spin and the gems do not glint. */
  calm: boolean;
  /** A trap went off here: the sprung jaws stay on the ground as a mark. */
  sprung?: boolean;
  /** The flag worn in the Collection (the painted default when none). */
  flagArt?: ImageSourcePropType | null;
  /** The floor is over (cleared or lost): the fog gives up what it hid, and each flag shows whether it was right. */
  unveiled?: boolean;
}) => {
  // A tile shows as explored only after its ripple delay, so a relic uncovering a whole area opens it outward.
  // On a new floor the tiles already lit wait for their delay too, so the floor opens in a cascade from the start.
  const [isVisited, setShown] = useState(visitedProp && revealDelay <= 0);
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
  // While the hero stands next to a hazard the badges beat with the heart instead, a little past full size.
  const hintScale = useMemo(
    () => (beat ? beat.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.15] }) : pulse.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] })),
    [pulse, beat],
  );
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

  // A tile flips over when it is uncovered: it turns in from edge-on and the spring carries it a little past flat
  // before it settles (native-driven; a no-op for tiles already shown on mount, and nothing at all when calm).
  const flip = useRef(new Animated.Value(1)).current;
  const flipTransform = useMemo(
    () => [
      { perspective: 600 },
      { rotateY: flip.interpolate({ inputRange: [0, 1], outputRange: ["90deg", "0deg"] }) },
      { scale: flip.interpolate({ inputRange: [0, 1], outputRange: [0.86, 1] }) },
    ],
    [flip],
  );
  const wasVisited = useRef(isVisited);
  // The delay lasts one render (the board's next one clears it): the flash layer stays once a ripple reached this tile.
  const rippled = useRef(false);
  if (revealDelay > 0) rippled.current = true;
  useEffect(() => {
    if (isVisited && !wasVisited.current && !calm) {
      flip.setValue(0);
      Animated.spring(flip, { toValue: 1, friction: 4.5, tension: 120, useNativeDriver: true }).start();
      if (rippled.current) {
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

  // The end of a floor lifts the fog off its creatures: they fade in where they stood, the flags say if they were right.
  const unveil = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (unveiled) Animated.timing(unveil, { toValue: 1, duration: calm ? 0 : 450, delay: calm ? 0 : 120 + ((index * 37) % 260), useNativeDriver: true }).start();
    else unveil.setValue(0);
  }, [unveiled, unveil, calm, index]);
  const lit = isVisited || isPlayerHere;
  const seen = lit || unveiled;
  const hazard = !!entity && (entity.type === 'enemy' || entity.type === 'pit' || entity.type === 'stalker' || entity.type === 'sleeper' || entity.type === 'trap' || entity.type === 'boss');

  // Background priority: visited block > fog
  const backgroundAsset = (isVisited || isPlayerHere) ? BIOME_ART[biome].tileRevealed : BIOME_ART[biome].tileHidden;

  const row = Math.floor(index / cols);
  const col = index % cols;

  // Don't show hint if an entity is directly on this cell (it would overlap)
  const showHints = isVisited && !entity && (roar || vortex);

  const charged = (entity?.type === 'boss' || entity?.type === 'stalker') && (entity.charge ?? 0) >= 1;
  // On small tiles (a big floor on a small phone) an icon plus a tiny number is unreadable: the badge becomes the number itself,
  // in the badge's colour and shape, never below 11 dp.
  const compact = tileSize < 34;
  const badge = compact ? Math.max(15, tileSize * (roar && vortex ? 0.46 : 0.6)) : Math.max(10, tileSize * (roar && vortex ? 0.4 : 0.5));
  const countSize = Math.max(11, tileSize * 0.24);

  return (
    <Animated.View
      style={[
        styles.cell,
        { width: tileSize, height: tileSize, position: "absolute", left: col * tileSize, top: row * tileSize, transform: flipTransform },
      ]}
    >
      {/* Base tile */}
      <AnimatedSprite
        style={{ width: tileSize, height: tileSize }}
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

      {rippled.current && (
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

      {/* Pit / Enemy revealed when visited (or when the floor is over: then they fade in out of the fog) */}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.cell, !lit && { opacity: killer ? 1 : unveil }]}>
      {entity?.type === 'stalker' && seen && (
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

      {entity?.type === 'pit' && (seen || killer) && (
        <VortexSprite size={tileSize * 0.9} calm={calm} pulse={pulse} />
      )}
      {entity && (entity.type === 'enemy' || entity.type === 'stalker' || entity.type === 'sleeper') && (seen || killer) && (
        <EnemySprite type={entity.type} size={tileSize * 0.98} calm={calm} />
      )}
      {entity?.type === 'sleeper' && seen && (
        <Text style={[styles.sleepMark, { fontSize: Math.max(9, tileSize * 0.3) }]} pointerEvents="none">zZ</Text>
      )}

      {/* The Grimbur: shown on explored tiles, with its remaining hearts */}
      {entity?.type === 'boss' && seen && (
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
          <BossSprite
            style={{ width: tileSize * 1.15, height: tileSize * 1.15, position: 'absolute' }}
            hp={entity.hp ?? 0}
            charged={charged}
          />
          <View style={styles.bossHp} pointerEvents="none">
            <Text style={[styles.bossHpText, { fontSize: Math.max(9, tileSize * 0.26) }]}>{'♥'.repeat(Math.max(entity.hp ?? 0, 0))}</Text>
          </View>
        </>
      )}

      {entity?.type === 'trap' && unveiled && !lit && (
        <GlyphIcon name="trap" size={tileSize * 0.6} />
      )}
      </Animated.View>

      {/* Wind-up warning: an icon too, so the danger never depends on colour alone. Drawn in the fog as well: a hunter only winds
          up beside the hero, and a strike from an unexplored tile must never come without warning. */}
      {charged && (
        <View style={[styles.chargeMark, { width: Math.max(12, tileSize * 0.34), height: Math.max(12, tileSize * 0.34) }]} pointerEvents="none">
          <Text style={[styles.chargeMarkText, { fontSize: Math.max(10, tileSize * 0.28) }]}>!</Text>
        </View>
      )}

      {/* Clues: a round amber token for guardians, a violet diamond for vortexes. Always numbered; side by side. */}
      {showHints && (
        <View style={styles.hintContainer} pointerEvents="none">
          {roar && (
            <Animated.View style={{ width: badge, height: badge, transform: [{ scale: hintScale }] }}>
              <SpriteImage source={CLUE_ART.roar} style={{ width: badge, height: badge }} resizeMode="contain" />
              <View style={[styles.hintCount, { minWidth: countSize + 3, height: countSize + 3, borderRadius: (countSize + 3) / 2 }]}>
                <Text style={[styles.hintCountText, { fontSize: countSize }]}>{enemyCount}</Text>
              </View>
            </Animated.View>
          )}
          {vortex && (
            <Animated.View style={{ width: badge, height: badge, transform: [{ scale: hintScale }] }}>
              <SpriteImage source={CLUE_ART.vortex} style={{ width: badge, height: badge }} resizeMode="contain" />
              <View style={[styles.hintCount, styles.hintCountVortex, { minWidth: countSize + 3, height: countSize + 3, borderRadius: (countSize + 3) / 2 }]}>
                <Text style={[styles.hintCountText, { fontSize: countSize }]}>{pitCount}</Text>
              </View>
            </Animated.View>
          )}
        </View>
      )}

      {/* Render Entity (Gem) overlaid on background */}
      {entity?.type === 'coin' && <GemSprite tileSize={tileSize} calm={calm} pulse={pulse} />}

      {/* A trap that went off stays on the ground, sprung: the floor remembers where it bit. */}
      {sprung && !entity && (
        <View style={styles.pickup} pointerEvents="none">
          <SpriteImage source={TRAP_SPRUNG} style={{ width: tileSize * 0.62, height: tileSize * 0.62, opacity: 0.85 }} resizeMode="contain" />
        </View>
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
          {unveiled ? <View style={[styles.flagVerdict, hazard ? styles.flagRight : styles.flagWrong, { width: tileSize * 0.86, height: tileSize * 0.86, borderRadius: tileSize * 0.2 }]} /> : null}
          {flagArt ? <SpriteImage source={flagArt} style={{ width: tileSize * 0.62, height: tileSize * 0.62 }} resizeMode="contain" /> : <GlyphIcon name="flag" size={tileSize * 0.58} />}
        </Animated.View>
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
    </Animated.View>
  );
});


const styles = StyleSheet.create({
  cell: { alignItems: "center", justifyContent: "center" },
  creatureShadow: { position: "absolute", alignSelf: "center", backgroundColor: "rgba(0,0,0,0.55)" },
  creatureGlow: { position: "absolute", alignSelf: "center", backgroundColor: "rgba(255,72,40,0.16)" },
  bossAura: { position: "absolute", backgroundColor: "rgba(255, 23, 68, 0.28)", borderRadius: 8 },
  tileTone: { position: 'absolute', borderRadius: 6 },
  // The painted tiles already tell explored from unexplored; these only push the two a little further apart.
  toneLit: { backgroundColor: 'rgba(255,236,200,0.07)' },
  toneDark: { backgroundColor: 'rgba(4,0,18,0.28)' },
  sleepMark: { position: 'absolute', top: 1, right: 3, color: '#B3E5FC', fontWeight: '900' },
  stalkerAura: { position: "absolute", backgroundColor: "rgba(171, 71, 188, 0.3)", borderRadius: 8 },
  stalkerCharged: { backgroundColor: "rgba(171, 71, 188, 0.65)", borderWidth: 2, borderColor: "#FFEB3B" },
  bossCharged: { backgroundColor: "rgba(255, 23, 68, 0.62)", borderWidth: 2, borderColor: "#FFEB3B" },
  aim: { position: "absolute", left: 3, top: 3, right: 3, bottom: 3, borderRadius: 8, borderWidth: 1.5, borderColor: "rgba(255,82,82,0.6)", backgroundColor: "rgba(255,82,82,0.14)", alignItems: "center", justifyContent: "center", zIndex: 7 },
  aimLast: { borderWidth: 2, borderColor: "rgba(255,82,82,0.95)", backgroundColor: "rgba(255,82,82,0.24)" },
  aimRing: { position: "absolute", borderWidth: 2, borderColor: "rgba(255,255,255,0.85)" },
  highlight: { position: "absolute", left: 2, top: 2, right: 2, bottom: 2, borderWidth: 3, borderColor: "#FFD54F", borderRadius: 6, zIndex: 6 },
  bossHp: { position: "absolute", bottom: 0, alignSelf: "center", zIndex: 4 },
  bossHpText: { color: "#FF1744", fontWeight: "900", textShadowColor: "#000", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  pickup: { position: "absolute", zIndex: 2, alignItems: "center", justifyContent: "center" },
  flagVerdict: { position: "absolute", borderWidth: 3 },
  flagRight: { borderColor: "#9EE37D", backgroundColor: "rgba(158,227,125,0.18)" },
  flagWrong: { borderColor: "#FF6E6E", backgroundColor: "rgba(255,82,82,0.16)" },
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
