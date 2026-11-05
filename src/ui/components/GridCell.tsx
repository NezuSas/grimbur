import React, { memo, useRef, useEffect, useMemo, useState } from "react";
import { StyleSheet, View, Animated, Easing, ImageSourcePropType } from "react-native";
import Text from "./Text";
import { Ionicons } from "@expo/vector-icons";
import GameIcon from "./GameIcon";
import { BIOME_ART, BLOCK_ART } from "../biomeArt";
import { BLOCK_FACE, STAND } from "../layout/boardTilt";

/** Creatures on the tilted board: a little bigger, stretched back up against the tilt and standing on the block's face, so
 *  they rise into the tile behind them as the hero does. */
const CREATURE_GROW = 1.12;
const standUp = (tile: number) => {
  const ky = CREATURE_GROW * STAND;
  const shift = BLOCK_FACE * tile * 0.5 - 0.02 * tile - ky * 0.49 * tile;
  return { transform: [{ translateY: shift }, { scaleX: CREATURE_GROW }, { scaleY: ky }] };
};
import type { ArtTheme } from "../biomeArt";
import type { Direction, GameEntity } from "../../core/engine/types";
import type { NearbyHazards } from "../../core/engine/proximity";
import SpriteImage, { AnimatedSprite } from "./SpriteImage";
import BossSprite from "./BossSprite";
import FogPuff from "./game/FogPuff";
import GlyphIcon from "./GlyphIcon";
import { useT } from "../../i18n/useT";
import type { TranslationKey } from "../../i18n/en";
import type { WeaponId } from "../../core/engine/weapons";
import { AMMO_ART } from "../weaponArt";
import { weaponLine } from "../../i18n/weaponText";

const LAVA_ART = require("../../assets/sprites/tiles/Lava_Pool.png");
import { LAVA_TURNS } from "../../core/engine/generator";
const TRAP_SPRUNG = require("../../assets/sprites/tiles/Trap_Sprung.png");

export const ASSETS: Record<"enemy" | "stalker" | "sleeper" | "mimic" | "thief" | "chest" | "boss" | "pit" | "coin" | "shield" | "ammo", ImageSourcePropType> = {
  enemy:    require("../../assets/sprites/enemies/Guardian_Enemy.webp"),
  stalker:  require("../../assets/sprites/enemies/Stalker_Enemy.webp"),
  sleeper:  require("../../assets/sprites/enemies/Sleeper_Enemy.webp"),
  mimic:    require("../../assets/sprites/enemies/Mimic_Enemy.webp"),
  thief:    require("../../assets/sprites/enemies/Thief_Enemy.webp"),
  chest:    require("../../assets/sprites/items/Icon_Chest.webp"),
  boss:     require("../../assets/sprites/enemies/Grimbur_Boss.webp"),
  pit:      require("../../assets/sprites/tiles/Danger_Vortex.png"),
  shield:   require("../../assets/sprites/items/Icon_Shield.webp"),
  ammo:     require("../../assets/sprites/items/Icon_Arrows.webp"),
  coin:     require("../../assets/sprites/items/Icon_Gem.webp"),
};

/** The second frame of each guardian: generated as one sheet per character, so the pair always matches. */
/** The painted clue tokens: their shapes match what the manual and the tutorial describe. */
const ENEMY_OUTLINE: readonly (readonly [number, number])[] = [[-1, 0], [1, 0], [0, -1], [0, 1]];

export const CLUE_ART = {
  roar: require("../../assets/sprites/ui/Clue_Guardian.webp"),
  vortex: require("../../assets/sprites/ui/Clue_Vortex.webp"),
} as const;

type Creature = "enemy" | "stalker" | "sleeper" | "mimic" | "thief";
const BREATHE: Record<Creature, ImageSourcePropType> = {
  enemy:   require("../../assets/sprites/enemies/Guardian_Enemy_Breathe.webp"),
  stalker: require("../../assets/sprites/enemies/Stalker_Enemy_Breathe.webp"),
  sleeper: require("../../assets/sprites/enemies/Sleeper_Enemy_Breathe.webp"),
  mimic: require("../../assets/sprites/enemies/Mimic_Enemy_Breathe.webp"),
  thief: require("../../assets/sprites/enemies/Thief_Enemy_Breathe.webp"),
};

export const NO_HINTS: NearbyHazards = { enemy: false, pit: false, enemyCount: 0, pitCount: 0 };

const FACING_ICON: Record<Direction, keyof typeof Ionicons.glyphMap> = {
  UP: "chevron-up",
  DOWN: "chevron-down",
  LEFT: "chevron-back",
  RIGHT: "chevron-forward",
};

/** A guardian breathes: two frames swapped on a slow beat, each creature on its own phase so a floor never moves in lockstep. */
const EnemySprite = memo(({ type, size, calm }: { type: Creature; size: number; calm: boolean }) => {
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
      {/* A thin dark outline (the silhouette a hair to every side): a brown golem on the gold vault or the moss still reads. */}
      {ENEMY_OUTLINE.map(([dx, dy], k) => (
        <SpriteImage
          key={k}
          style={{ width: size, height: size, position: "absolute", transform: [{ translateX: dx * Math.max(1, size * 0.018) }, { translateY: dy * Math.max(1, size * 0.018) }], tintColor: "#120804", opacity: 0.85 }}
          source={inhale ? BREATHE[type] : ASSETS[type]}
          resizeMode="contain"
        />
      ))}
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
  index, tileSize, cols, isVisited: visitedProp, isPlayerHere, entity, enemyCount, pitCount, highlighted, flagged, aimed, aimStep, aimLast, onTileLoaded, revealDelay, pulse, beat, killer, flagPing, biome, calm, sprung = false, flagArt, unveiled = false, lurking = false, hideClue = false, deduced = null, draft = false, block = false, aimZone = null, weapon = "bow"
}: {
  index: number;
  tileSize: number;
  cols: number;
  isVisited: boolean;
  /** A dark floor hides this tile's clue numbers (it is too far from the hero). */
  hideClue?: boolean;
  isPlayerHere: boolean;
  entity?: GameEntity;
  /** Guardians (and the Grimbur) touching this tile; only set on explored tiles. */
  enemyCount: number;
  /** Vortexes touching this tile; only set on explored tiles. */
  pitCount: number;
  highlighted: boolean;
  /** The player marked this unexplored tile as dangerous. */
  flagged: boolean;
  /** Practice help: what the clues prove about this hidden tile (null: nothing yet). */
  deduced?: 'safe' | 'danger' | null;
  /** A secret room lies beside this explored tile: a glint in its corner (see generator.ts). */
  draft?: boolean;
  /** The direction of the arrow that would fly over this tile (null when none would). */
  aimed: Direction | null;
  /** How many tiles from the hero this tile is along the aim line (1 = the next one). */
  aimStep: number;
  /** This is the last tile the arrow can reach. */
  aimLast: boolean;
  /** This tile lies in the burst of the orb / the blast of the bomb at the end of the aim line (null when not). */
  aimZone?: 'orb' | 'bomb' | null;
  /** The hero's weapon: the ammo pickup shows its ammo. */
  weapon?: WeaponId;
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
  /** The tilted board: the tile is drawn as a stone block (see BLOCK_ART). */
  block?: boolean;
  /** Reduced motion: the vortex does not spin and the gems do not glint. */
  calm: boolean;
  /** A trap went off here: the sprung jaws stay on the ground as a mark ("disarmed": taken apart, no hit; true reads as "bit"). */
  sprung?: boolean | "bit" | "disarmed";
  /** The flag worn in the Collection (the painted default when none). */
  flagArt?: ImageSourcePropType | null;
  /** The floor is over (cleared or lost): the fog gives up what it hid, and each flag shows whether it was right. */
  unveiled?: boolean;
  /** A stalker in the fog close to the hero: its shadow shows through, so the hunt is felt before it strikes. */
  lurking?: boolean;
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
  const [puff, setPuff] = useState(0);
  // The delay lasts one render (the board's next one clears it): the flash layer stays once a ripple reached this tile.
  const rippled = useRef(false);
  if (revealDelay > 0) rippled.current = true;
  useEffect(() => {
    if (isVisited && !wasVisited.current && !calm) {
      // A tile explored by a step tears its fog off (a ripple of many tiles flashes gold instead).
      if (!rippled.current) setPuff(p => p + 1);
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
  const { t } = useT();
  const lit = isVisited || isPlayerHere;
  const seen = lit || unveiled;
  const hazard = !!entity && (entity.type === 'enemy' || entity.type === 'pit' || entity.type === 'stalker' || entity.type === 'sleeper' || entity.type === 'mimic' || entity.type === 'trap' || entity.type === 'boss');

  // Background priority: visited block > fog
  // On an unveiled floor only the tiles that hid something open up: each creature stands on explored ground, the rest stays fogged.
  // The explored ground under an unveiled creature fades in with it (same timing), never before it.
  const opened = isVisited || isPlayerHere;
  const unveiling = unveiled && hazard && !opened;
  // The tilted board paints its tiles as stone blocks where the cave has them.
  const tiles = (block && BLOCK_ART[biome]) || BIOME_ART[biome];
  const backgroundAsset = opened ? tiles.tileRevealed : tiles.tileHidden;

  const row = Math.floor(index / cols);
  const col = index % cols;

  // Don't show hint if an entity is directly on this cell (it would overlap)
  // On a dark floor the numbers only show beside the hero (`hideClue`): the rest must be remembered.
  const showHints = isVisited && !entity && (roar || vortex) && !hideClue;

  const charged = (entity?.type === 'boss' || entity?.type === 'stalker') && (entity.charge ?? 0) >= 1;
  // On small tiles (a big floor on a small phone) an icon plus a tiny number is unreadable: the badge becomes the number itself,
  // in the badge's colour and shape, never below 11 dp.
  const compact = tileSize < 34;
  const badge = compact ? Math.max(15, tileSize * (roar && vortex ? 0.46 : 0.6)) : Math.max(10, tileSize * (roar && vortex ? 0.4 : 0.5));
  const countSize = Math.max(11, tileSize * 0.24);

  // The Grimbur (and its lieutenant, and the Colossus) with its hearts: drawn wherever it stands, in the fog too.
  const bossArt = entity?.type === 'boss' ? (
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
        mini={!!entity.mini}
        ancient={!!entity.ancient}
        warden={!!entity.warden}
      />
      <View style={styles.bossHp} pointerEvents="none">
        <Text style={[styles.bossHpText, { fontSize: Math.max(9, tileSize * 0.26) }]}>{'♥'.repeat(Math.max(entity.hp ?? 0, 0))}</Text>
      </View>
    </>
  ) : null;

  // What a screen reader says about the tile: only what the player can see (never what the fog still hides).
  const a11y = (() => {
    const where = t("a11y.tile.where", { row: row + 1, col: col + 1 });
    if (isPlayerHere) return `${where}: ${t("a11y.tile.hero")}`;
    if (entity?.lava) return `${where}: ${t("a11y.tile.lava")}`;
    if (!lit && entity?.type === 'boss') return `${where}: ${t("a11y.thing.boss")}`;
    if (!lit) return `${where}: ${t(flagged ? "a11y.tile.flagged" : "a11y.tile.hidden")}`;
    const parts: string[] = [];
    if (entity && seen) parts.push(entity.type === 'ammo' ? weaponLine(t, "a11y.thing.ammo", weapon) : t(`a11y.thing.${entity.type}` as TranslationKey));
    if (showHints && enemyCount > 0) parts.push(t(enemyCount === 1 ? "a11y.tile.guardians.one" : "a11y.tile.guardians", { n: enemyCount }));
    if (showHints && pitCount > 0) parts.push(t(pitCount === 1 ? "a11y.tile.vortexes.one" : "a11y.tile.vortexes", { n: pitCount }));
    if (draft && !hideClue) parts.push(t("a11y.tile.secret"));
    if (parts.length === 0) parts.push(t("a11y.tile.clear"));
    return `${where}: ${parts.join(", ")}`;
  })();

  return (
    <Animated.View
      accessible
      accessibilityLabel={a11y}
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
          { left: tileSize * 0.09, top: tileSize * 0.09, right: tileSize * 0.09, bottom: tileSize * (block ? 1.09 - BLOCK_FACE : 0.09) },
          opened ? styles.toneLit : styles.toneDark,
        ]}
      />

      {/* On a block tile everything stands on the top face (the front edge below it is the block's side). */}
      <View pointerEvents="none" style={[styles.cell, block ? { position: "absolute", left: 0, top: 0, width: tileSize, height: tileSize * BLOCK_FACE } : StyleSheet.absoluteFill]}>

      {unveiling && (
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: unveil }]}>
          <SpriteImage source={tiles.tileRevealed} style={{ width: tileSize, height: tileSize }} resizeMode="contain" />
          <View style={[styles.tileTone, styles.toneLit, { left: tileSize * 0.09, top: tileSize * 0.09, right: tileSize * 0.09, bottom: tileSize * 0.09 }]} />
        </Animated.View>
      )}

      {rippled.current && (
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(201, 165, 90,0.55)", borderRadius: 8, opacity: glow }]}
        />
      )}

      {/* Danger pulse tint */}
      {showHints && !isPlayerHere && (
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: vortex ? "rgba(156,39,176,0.15)" : "rgba(214, 184, 74,0.08)",
              opacity: tintOpacity,
            },
          ]}
        />
      )}

      {puff > 0 ? <FogPuff key={puff} size={tileSize} color={roar ? "#C99A5C" : vortex ? "#A397BF" : "#D7CCC8"} /> : null}

      {/* Pit / Enemy revealed when visited (or when the floor is over: then they fade in out of the fog) */}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.cell, !lit && !lurking && { opacity: killer ? 1 : unveil }, block && standUp(tileSize)]}>
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

      {entity?.type === 'pit' && !entity.lava && (seen || killer) && (
        <VortexSprite size={tileSize * 0.9} calm={calm} pulse={pulse} />
      )}
      {entity && (entity.type === 'enemy' || entity.type === 'stalker' || entity.type === 'sleeper' || entity.type === 'mimic') && (seen || killer) && (
        <EnemySprite type={entity.type} size={tileSize * 0.98} calm={calm} />
      )}
      {entity?.type === 'sleeper' && seen && (
        <Text style={[styles.sleepMark, { fontSize: Math.max(9, tileSize * 0.3) }]} pointerEvents="none">zZ</Text>
      )}

      {/* The Grimbur on explored tiles, with its remaining hearts (in the fog it is drawn dimmed, below) */}
      {seen && bossArt}

      {lurking && !seen && (
        <SpriteImage source={ASSETS.stalker} style={{ width: tileSize * 0.9, height: tileSize * 0.9, tintColor: "#0B0705", opacity: 0.6 }} resizeMode="contain" />
      )}
      {entity?.type === 'trap' && unveiled && !lit && (
        <GlyphIcon name="trap" size={tileSize * 0.6} />
      )}
      </Animated.View>

      {/* The Grimbur (or its lieutenant, or the Colossus) is in plain sight even in the fog: it hunts the hero and moves, so it is
          never something to deduce. Dimmed there, so the explored ground still reads apart. */}
      {!seen && bossArt ? (
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.cell, styles.bossInFog, block && standUp(tileSize)]}>{bossArt}</View>
      ) : null}

      {/* A pool of lava left by the Magma Colossus: seen through the fog (it is no secret), dimmer as it cools. */}
      {entity?.lava ? (
        <SpriteImage source={LAVA_ART} style={{ position: "absolute", width: tileSize * 0.92, height: tileSize * 0.92, opacity: 0.45 + 0.55 * Math.min(1, (entity.ttl ?? 1) / LAVA_TURNS) }} resizeMode="contain" />
      ) : null}

      {/* Wind-up warning: an icon too, so the danger never depends on colour alone. Drawn in the fog as well: a hunter only winds
          up beside the hero, and a strike from an unexplored tile must never come without warning. */}
      {charged && (
        <View style={[styles.chargeMark, { width: Math.max(12, tileSize * 0.34), height: Math.max(12, tileSize * 0.34) }]} pointerEvents="none">
          <Text style={[styles.chargeMarkText, { fontSize: Math.max(10, tileSize * 0.28) }]}>!</Text>
        </View>
      )}

      {/* Clues: a round amber token for guardians, a violet diamond for vortexes. Always numbered; side by side. */}
      {showHints && !isPlayerHere && (
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

      {/* The draft of a secret room: a glint in the corner, kept out of the clue tokens' way. */}
      {draft && !hideClue ? (
        <View pointerEvents="none" style={[styles.draft, { width: tileSize * 0.3, height: tileSize * 0.3, borderRadius: tileSize * 0.15 }]}>
          <GameIcon name="sparkles" size={tileSize * 0.2} color="#DCC48E" />
        </View>
      ) : null}

      {/* Render Entity (Gem) overlaid on background */}
      {entity?.type === 'coin' && <GemSprite tileSize={tileSize} calm={calm} pulse={pulse} />}
      {/* The mimic is drawn as a gem until something gives it away: only the clue numbers tell them apart. */}
      {entity?.type === 'mimic' && !(seen || killer) && <GemSprite tileSize={tileSize} calm={calm} pulse={pulse} />}

      {/* The thief is always in sight, with the gems it carries. */}
      {entity?.type === 'thief' && (
        <>
          <EnemySprite type="thief" size={tileSize * 0.92} calm={calm} />
          {(entity.loot ?? 0) > 0 ? (
            <View style={[styles.loot, { minWidth: Math.max(16, tileSize * 0.34), height: Math.max(16, tileSize * 0.34), borderRadius: tileSize }]} pointerEvents="none">
              <Text style={[styles.lootText, { fontSize: Math.max(10, tileSize * 0.22) }]}>{entity.loot}</Text>
            </View>
          ) : null}
        </>
      )}
      {entity?.type === 'chest' && (
        <View style={styles.pickup} pointerEvents="none">
          <SpriteImage source={ASSETS.chest} style={{ width: tileSize * 0.78, height: tileSize * 0.78 }} resizeMode="contain" />
        </View>
      )}

      {/* A trap that went off stays on the ground, sprung: the floor remembers where it bit. One that was disarmed (Trap Sense,
          Vael) lies faded with a check on it, so it never reads as a hit. */}
      {sprung && !entity && (
        <View style={styles.pickup} pointerEvents="none">
          <SpriteImage source={TRAP_SPRUNG} style={{ width: tileSize * 0.62, height: tileSize * 0.62, opacity: sprung === "disarmed" ? 0.4 : 0.85 }} resizeMode="contain" />
          {sprung === "disarmed" ? (
            <View style={[styles.trapDisarmed, { width: tileSize * 0.3, height: tileSize * 0.3, borderRadius: tileSize * 0.15 }]}>
              <GameIcon name="checkmark" size={tileSize * 0.2} color="#E8F0D8" />
            </View>
          ) : null}
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
          <SpriteImage source={AMMO_ART[weapon]} style={{ width: tileSize * 0.7, height: tileSize * 0.7 }} resizeMode="contain" />
        </View>
      )}

      {flagged && (
        <Animated.View style={[styles.pickup, { transform: [{ translateX: flagShake }] }]} pointerEvents="none">
          <Animated.View style={[styles.flagBlink, { opacity: flagBlink }]} />
          {unveiled ? <View style={[styles.flagVerdict, hazard ? styles.flagRight : styles.flagWrong, { width: tileSize * 0.86, height: tileSize * 0.86, borderRadius: tileSize * 0.2 }]} /> : null}
          {flagArt ? <SpriteImage source={flagArt} style={{ width: tileSize * 0.62, height: tileSize * 0.62 }} resizeMode="contain" /> : <GlyphIcon name="flag" size={tileSize * 0.58} />}
          {/* Right or wrong is told by a shape as well as the colour, for colour-blind eyes. */}
          {unveiled ? (
            <View style={[styles.verdictBadge, hazard ? styles.deducedBadgeSafe : styles.deducedBadgeDanger, { width: tileSize * 0.32, height: tileSize * 0.32, borderRadius: tileSize * 0.16 }]}>
              <GameIcon name={hazard ? 'checkmark' : 'close'} size={tileSize * 0.24} color="#fff" />
            </View>
          ) : null}
        </Animated.View>
      )}

      {aimed && (
        <View style={[styles.aim, aimLast && styles.aimLast]} pointerEvents="none">
          {/* A chevron along the line of fire, fading with distance; a ring marks where the arrow stops */}
          <GameIcon name={FACING_ICON[aimed]} size={tileSize * 0.46} color="#D58A7E" style={{ opacity: Math.max(0.5, 1 - (aimStep - 1) * 0.13) }} />
          {aimLast && <View style={[styles.aimRing, { width: tileSize * 0.62, height: tileSize * 0.62, borderRadius: tileSize * 0.31 }]} />}
        </View>
      )}

      {aimZone && (
        // Where the orb would burst / the bomb would blast: a faint wash and a dashed ring (only around the line's end).
        <View style={[styles.aimZone, aimZone === 'bomb' ? styles.aimZoneBomb : styles.aimZoneOrb, { borderRadius: tileSize * 0.2 }]} pointerEvents="none" />
      )}

      {deduced && !flagged && (
        <View style={[styles.deduced, deduced === 'safe' ? styles.deducedSafe : styles.deducedDanger, { borderRadius: tileSize * 0.16 }]} pointerEvents="none">
          <View style={[styles.deducedBadge, { width: tileSize * 0.34, height: tileSize * 0.34, borderRadius: tileSize * 0.17 }, deduced === 'safe' ? styles.deducedBadgeSafe : styles.deducedBadgeDanger]}>
            <GameIcon name={deduced === 'safe' ? 'checkmark' : 'alert'} size={tileSize * 0.24} color="#fff" />
          </View>
        </View>
      )}

      {highlighted && <View style={styles.highlight} pointerEvents="none" />}

      {killer && <View style={styles.killer} pointerEvents="none" />}

      </View>
    </Animated.View>
  );
});


const styles = StyleSheet.create({
  deduced: { position: 'absolute', top: 3, left: 3, right: 3, bottom: 3, borderWidth: 2, alignItems: 'flex-end', justifyContent: 'flex-start', padding: 2 },
  deducedSafe: { borderColor: 'rgba(125, 190, 152,0.7)', backgroundColor: 'rgba(125, 190, 152,0.10)' },
  deducedDanger: { borderColor: 'rgba(181, 82, 74,0.75)', backgroundColor: 'rgba(181, 82, 74,0.12)' },
  deducedBadge: { alignItems: 'center', justifyContent: 'center' },
  draft: { position: 'absolute', left: 2, top: 2, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(40,28,8,0.8)', borderWidth: 1, borderColor: 'rgba(255,224,130,0.7)', zIndex: 5 },
  verdictBadge: { position: 'absolute', right: 1, bottom: 1, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#fff' },
  deducedBadgeSafe: { backgroundColor: '#2E9E5B' },
  deducedBadgeDanger: { backgroundColor: '#A83A35' },
  loot: { position: 'absolute', top: 1, right: 1, paddingHorizontal: 3, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0E5E78', borderWidth: 1.5, borderColor: '#8CC4D6' },
  lootText: { color: '#F3EADB', fontWeight: '900' },
  cell: { alignItems: "center", justifyContent: "center" },
  creatureShadow: { position: "absolute", alignSelf: "center", backgroundColor: "rgba(0,0,0,0.55)" },
  creatureGlow: { position: "absolute", alignSelf: "center", backgroundColor: "rgba(194, 80, 58,0.16)" },
  bossAura: { position: "absolute", backgroundColor: "rgba(194, 58, 68, 0.28)", borderRadius: 8 },
  bossInFog: { opacity: 0.6 },
  trapDisarmed: { position: "absolute", right: "14%", bottom: "14%", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(92, 122, 70, 0.85)" },
  tileTone: { position: 'absolute', borderRadius: 6 },
  // The painted tiles already tell explored from unexplored; these only push the two a little further apart.
  toneLit: { backgroundColor: 'rgba(255,236,200,0.07)' },
  toneDark: { backgroundColor: 'rgba(4,0,18,0.28)' },
  sleepMark: { position: 'absolute', top: 1, right: 3, color: '#B9D1DC', fontWeight: '900' },
  stalkerAura: { position: "absolute", backgroundColor: "rgba(142, 94, 158, 0.3)", borderRadius: 8 },
  stalkerCharged: { backgroundColor: "rgba(142, 94, 158, 0.65)", borderWidth: 2, borderColor: "#DCC25C" },
  bossCharged: { backgroundColor: "rgba(194, 58, 68, 0.62)", borderWidth: 2, borderColor: "#DCC25C" },
  aim: { position: "absolute", left: 3, top: 3, right: 3, bottom: 3, borderRadius: 8, borderWidth: 1.5, borderColor: "rgba(181, 82, 74,0.6)", backgroundColor: "rgba(181, 82, 74,0.14)", alignItems: "center", justifyContent: "center", zIndex: 7 },
  aimLast: { borderWidth: 2, borderColor: "rgba(181, 82, 74,0.95)", backgroundColor: "rgba(181, 82, 74,0.24)" },
  aimZone: { position: "absolute", left: 5, top: 5, right: 5, bottom: 5, borderWidth: 1.5, borderStyle: "dashed", zIndex: 7 },
  aimZoneOrb: { borderColor: "rgba(248, 200, 240, 0.75)", backgroundColor: "rgba(232, 121, 201, 0.14)" },
  aimZoneBomb: { borderColor: "rgba(255, 179, 71, 0.8)", backgroundColor: "rgba(255, 90, 54, 0.14)" },
  aimRing: { position: "absolute", borderWidth: 2, borderColor: "rgba(255,255,255,0.85)" },
  highlight: { position: "absolute", left: 2, top: 2, right: 2, bottom: 2, borderWidth: 3, borderColor: "#C9A55A", borderRadius: 6, zIndex: 6 },
  bossHp: { position: "absolute", bottom: 0, alignSelf: "center", zIndex: 4 },
  bossHpText: { color: "#C23A44", fontWeight: "900", textShadowColor: "#000", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  pickup: { position: "absolute", zIndex: 2, alignItems: "center", justifyContent: "center" },
  flagVerdict: { position: "absolute", borderWidth: 3 },
  flagRight: { borderColor: "#A3BF7C", backgroundColor: "rgba(163, 191, 124,0.18)" },
  flagWrong: { borderColor: "#CF6F68", backgroundColor: "rgba(181, 82, 74,0.16)" },
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
  hintCountVortex: { borderColor: "#D3C2D8" },
  hintCountText: { color: "#F3EADB", fontWeight: "900", includeFontPadding: false },
  chargeMark: { position: "absolute", top: 1, right: 1, zIndex: 8, borderRadius: 99, backgroundColor: "#DCC25C", borderWidth: 1.5, borderColor: "#8E2A26", alignItems: "center", justifyContent: "center" },
  chargeMarkText: { color: "#8E2A26", fontWeight: "900", includeFontPadding: false },
  flagBlink: { position: "absolute", left: -6, top: -6, right: -6, bottom: -6, backgroundColor: "rgba(194, 58, 68,0.55)", borderRadius: 8 },
  killer: { position: "absolute", left: 1, top: 1, right: 1, bottom: 1, borderRadius: 8, borderWidth: 4, borderColor: "#C23A44", backgroundColor: "rgba(194, 58, 68,0.18)", zIndex: 9 },
});

export default GridCell;

/**
 * The clues of the tile the hero stands on, drawn above the hero (the hero's body would hide them): two small tokens at the
 * tile's top corner, each with its count, so the numbers the next step depends on are never covered.
 */
/**
 * The clues of the hero's own tile, drawn above its top-right corner. On the board's top row or right column that corner
 * is outside the board, whose rounded frame clips it: there the tokens tuck inside the tile instead.
 */
export const HeroClues = ({ enemyCount, pitCount, tileSize, atTop = false, atRight = false }: { enemyCount: number; pitCount: number; tileSize: number; atTop?: boolean; atRight?: boolean }) => {
  if (enemyCount <= 0 && pitCount <= 0) return null;
  const size = Math.max(16, tileSize * 0.36);
  const countSize = Math.max(10, tileSize * 0.2);
  const token = (art: number, n: number, vortex: boolean) => (
    <View style={{ width: size, height: size }}>
      <View style={[heroClueStyles.disc, { width: size, height: size, borderRadius: size / 2 }]} />
      <SpriteImage source={art} style={{ width: size, height: size }} resizeMode="contain" />
      <View style={[styles.hintCount, vortex && styles.hintCountVortex, { minWidth: countSize + 3, height: countSize + 3, borderRadius: (countSize + 3) / 2 }]}>
        <Text style={[styles.hintCountText, { fontSize: countSize }]}>{n}</Text>
      </View>
    </View>
  );
  return (
    <View pointerEvents="none" style={[heroClueStyles.row, { top: atTop ? 3 : -size * 0.28, right: atRight ? 3 : -size * 0.22, gap: 2 }]}>
      {enemyCount > 0 ? token(CLUE_ART.roar, enemyCount, false) : null}
      {pitCount > 0 ? token(CLUE_ART.vortex, pitCount, true) : null}
    </View>
  );
};

const heroClueStyles = StyleSheet.create({
  row: { position: "absolute", flexDirection: "row", zIndex: 30 },
  disc: { position: "absolute", backgroundColor: "rgba(20,12,8,0.78)", borderWidth: 1, borderColor: "rgba(255,217,160,0.55)" },
});
