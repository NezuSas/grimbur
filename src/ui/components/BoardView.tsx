import React, { memo, useCallback, useRef, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { StyleSheet, View, Animated, Easing } from "react-native";
import type { ImageSourcePropType } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { characterWithSkin } from "../../data/characterSkins";
import type { SkinId } from "../../data/skinArt";
import type { ArtTheme } from "../biomeArt";
import { useGameLayout } from "../layout/useGameLayout";
import { Direction, GameEntity, GUARDIAN_TYPES } from "../../core/engine/types";
import { secretDraftTiles } from "../../core/engine/worldHelpers";
import BoardTouchLayer from "./BoardTouchLayer";
import type { TrailLook } from "../cosmeticArt";
import ArrowFlight, { flightMs, landMs } from "./game/ArrowFlight";
import FallenFoe from "./game/FallenFoe";
import Companion, { type CompanionLook } from "./game/Companion";
import { getNearbyHazards } from "../../core/engine/proximity";
import SpriteImage from "./SpriteImage";
import Text from "./Text";
import GridCell, { ASSETS, CLUE_ART, HeroClues, NO_HINTS } from "./GridCell";
import { ANCIENT_FRAMES } from "./BossSprite";

/** An arrow in flight: shot toward `dir`, crossing `tiles` tiles, and whether it hit something at the end. `key` changes per shot. */
export type ArrowShot = { key: number; dir: Direction; tiles: number; hit: boolean };

/** A pencil mark the player put on a hidden tile while reasoning (puzzles). */
export type TileNote = "safe" | "noGuardian" | "noVortex";

/** A pencil mark on a hidden tile: a green tick (proven safe) or a clue icon struck through (not a guardian, not a vortex). */
const NoteMark = memo(({ tile, note, cols, tileSize }: { tile: number; note: TileNote; cols: number; tileSize: number }) => {
  const s = tileSize * 0.42;
  return (
    <View pointerEvents="none" style={[styles.note, { left: (tile % cols) * tileSize, top: Math.floor(tile / cols) * tileSize, width: tileSize, height: tileSize }]}>
      <View style={[styles.noteBadge, { width: s, height: s, borderRadius: s / 2 }, note === "safe" ? styles.noteSafe : styles.noteNot]}>
        {note === "safe" ? (
          <Ionicons name="checkmark" size={s * 0.8} color="#0b2a10" />
        ) : (
          <>
            <SpriteImage source={note === "noGuardian" ? CLUE_ART.roar : CLUE_ART.vortex} style={{ width: s * 0.8, height: s * 0.8 }} resizeMode="contain" />
            <View style={[styles.noteSlash, { width: s * 1.05, height: Math.max(2, s * 0.1) }]} />
          </>
        )}
      </View>
    </View>
  );
});

/**
 * A ray of light between two neighbouring tiles: both are ringed and a glowing bar joins their centres, pulsing, so the eye goes
 * from the clue to the tile it speaks of.
 */
const Beam = memo(({ beam, cols, tileSize, calm }: { beam: { from: number; to: number; color: string }; cols: number; tileSize: number; calm: boolean }) => {
  const glow = useRef(new Animated.Value(calm ? 1 : 0)).current;
  useEffect(() => {
    if (calm) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 520, useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0.45, duration: 520, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [calm, glow]);
  const at = (i: number) => ({ x: (i % cols) * tileSize + tileSize / 2, y: Math.floor(i / cols) * tileSize + tileSize / 2 });
  const a = at(beam.from);
  const b = at(beam.to);
  const horizontal = a.y === b.y;
  const thick = Math.max(4, tileSize * 0.12);
  const ring = (p: { x: number; y: number }, k: string) => (
    <View
      key={k}
      style={{ position: "absolute", left: p.x - tileSize * 0.46, top: p.y - tileSize * 0.46, width: tileSize * 0.92, height: tileSize * 0.92, borderRadius: tileSize * 0.2, borderWidth: 3, borderColor: beam.color }}
    />
  );
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: glow, zIndex: 4 }]}>
      <View
        style={{
          position: "absolute",
          left: horizontal ? Math.min(a.x, b.x) : a.x - thick / 2,
          top: horizontal ? a.y - thick / 2 : Math.min(a.y, b.y),
          width: horizontal ? Math.abs(a.x - b.x) : thick,
          height: horizontal ? thick : Math.abs(a.y - b.y),
          borderRadius: thick / 2,
          backgroundColor: beam.color,
          shadowColor: beam.color,
          shadowOpacity: 1,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 0 },
        }}
      />
      {ring(a, "a")}
      {ring(b, "b")}
    </Animated.View>
  );
});

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
  /** The game is paused or the screen is not in front: the idle loops (breath, pulse) stop. */
  paused?: boolean;
  /** The hero was just thrown by a vortex: it vanishes and reappears instead of sliding across the board. */
  teleported?: boolean;
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
  /** A dark floor: clue numbers only show beside the hero. */
  dark?: boolean;
  /** The heartbeat, only while the hero stands next to a hazard (and not calm): the clues beat with it. */
  beat?: Animated.Value;
  /** The outfit the hero wears (classic when omitted). */
  skin?: SkinId;
  /** The cave type of this floor (the plain cave when omitted). */
  biome?: ArtTheme;
  /** The equipped arrow trail, if any. */
  trail?: TrailLook | null;
  /** The equipped flag, if any. */
  flag?: ImageSourcePropType | null;
  /** The companion floating by the hero (Collection), or null. */
  pet?: CompanionLook | null;
  /** A grown companion's aura colour. */
  petAura?: string | null;
  /** The floor is over: every hidden creature, vortex and trap shows where it was. */
  unveil?: boolean;
  /** A ray of light between two neighbouring tiles (puzzles: from the clue that proves or warns, to the tile it speaks of). */
  beam?: { from: number; to: number; color: string } | null;
  /** A mouse (web): Shift + click on a tile (a run shoots toward it). */
  onTileShiftClick?: (index: number) => void;
  /** The player's pencil marks on hidden tiles (puzzles): proven safe, not a guardian, not a vortex. */
  notes?: ReadonlyMap<number, TileNote> | null;
  /** Practice help: hidden tiles the clues prove safe or dangerous. */
  deduced?: ReadonlyMap<number, "safe" | "danger"> | null;
  /** Friends who fell on this same floor of the daily: a ghost of their hero where their run ended. */
  friendGhosts?: readonly { tile: number; name: string; art: ImageSourcePropType }[];
  /** The daily: the tiles today's best attempt walked on this floor, drawn as faint footprints where not yet explored. */
  pastSteps?: readonly number[];
  /** The tile of the floor's secret room (its neighbours glint once explored). */
  secretTile?: number | null;
};

const HERO_PLATE = require("../../assets/sprites/ui/Hero_Plate.png");
const OUTLINE_OFFSETS: readonly (readonly [number, number])[] = [[-1, 0], [1, 0], [0, -1], [0, 1], [-0.7, -0.7], [0.7, -0.7], [-0.7, 0.7], [0.7, 0.7]];

/**
 * The hero with a thin dark outline (its silhouette drawn eight times, a hair to every side, under the art): a hero in gold on
 * the gold vault, in green on the moss, in ice blue on the frost, still reads at a glance. Both poses stay mounted and swap by
 * opacity, each with its outline.
 */
const OutlinedSprite = ({ source, visible, line }: { source: ImageSourcePropType; visible: boolean; line: number }) => (
  <View pointerEvents="none" style={[styles.heroLayer, { opacity: visible ? 1 : 0 }]}>
    {OUTLINE_OFFSETS.map(([dx, dy], k) => (
      <SpriteImage key={k} source={source} style={[styles.heroLayer, { left: dx * line, top: dy * line, tintColor: "#140a05", opacity: 0.9 }]} />
    ))}
    <SpriteImage source={source} style={styles.heroLayer} />
  </View>
);

const BoardView: React.FC<Props> = memo(
  ({ level, rows, cols, entityMap = {}, visited, playerIndex, characterIndex, facingDir, guardianCount, isAttacking, highlight, onTilePress, onSwipe, flags, aimTiles, aimDir = null, shot = null, teleported = false, paused = false, onAimDrag, onAimFire, onTileLongPress, onReady, dying, killerTile, shakeKey, flagPing, calm, beat, skin, biome = "cave", trail = null, flag = null, pet = null, petAura = null, unveil = false, dark = false, deduced = null, friendGhosts, pastSteps, secretTile = null, beam = null, notes = null, onTileShiftClick }) => {
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

    // When the arrow in flight is seen to land (ms since epoch): a kill or a hit on the Grimbur waits for it.
    const arrowLands = useRef(0);
    useEffect(() => {
      if (shot && !calm) arrowLands.current = Date.now() + landMs(shot);
    }, [shot, calm]);
    const untilArrowLands = () => Math.max(0, arrowLands.current - Date.now());

    // A foe the arrow kills leaves the game state at once, but the player must see it die when the arrow gets there: it stays on
    // the board as a ghost until the arrow lands, then falls (see FallenFoe). Laid out before paint so it never blinks. Calm: as before.
    const [ghosts, setGhosts] = useState<Record<number, GameEntity>>({});
    const [fallen, setFallen] = useState<{ id: number; entity: GameEntity }[]>([]);
    // Traps that went off on this floor (the trap leaves the state when it bites): they stay drawn as sprung jaws.
    const [sprung, setSprung] = useState<ReadonlySet<number>>(() => new Set());
    const prevEntities = useRef(entityMap);
    const ghostShot = useRef(0);
    const ghostTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
    useEffect(() => () => ghostTimers.current.forEach(clearTimeout), []);
    useLayoutEffect(() => {
      const before = prevEntities.current;
      prevEntities.current = entityMap;
      if (before[playerIndex]?.type === "trap" && !entityMap[playerIndex]) setSprung(s => new Set(s).add(playerIndex));
      if (calm || !shot || !shot.hit || ghostShot.current === shot.key || before === entityMap) return;
      ghostShot.current = shot.key;
      const gone = Object.values(before).filter(e => (GUARDIAN_TYPES.includes(e.type) || e.type === "boss") && !entityMap[e.index]);
      if (gone.length === 0) return;
      setGhosts(g => ({ ...g, ...Object.fromEntries(gone.map(e => [e.index, e])) }));
      ghostTimers.current.push(
        setTimeout(() => {
          setGhosts(g => {
            const next = { ...g };
            for (const e of gone) delete next[e.index];
            return next;
          });
          setFallen(f => [...f, ...gone.map(entity => ({ id: shot.key * 100 + entity.index, entity }))]);
        }, landMs(shot)),
      );
    }, [entityMap]); // eslint-disable-line react-hooks/exhaustive-deps
    // A new floor or a restart drops whatever was still falling.
    useEffect(() => {
      setGhosts({});
      setFallen([]);
      setSprung(new Set());
    }, [level]);
    const shown = useMemo(() => (Object.keys(ghosts).length > 0 ? { ...entityMap, ...ghosts } : entityMap), [entityMap, ghosts]);
    // The hero's own tile: its clues are drawn above the hero (HeroClues), where the body cannot cover them.
    const heroNear = getNearbyHazards(playerIndex, rows, cols, shown);

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
      if (!needsPulse || calm || paused) {
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
    }, [needsPulse, calm, paused, pulse]);

    // Squash and stretch of a step: the hero stretches along the way it goes, then squashes on landing.
    const stretchX = useRef(new Animated.Value(1)).current;
    const stretchY = useRef(new Animated.Value(1)).current;

    // The hero breathes while standing still: a slow, tiny vertical swell (off when the player asked for calm).
    const heroBreath = useRef(new Animated.Value(1)).current;
    // Breath and step together, kept on the hero's feet: the body narrows a touch as it swells (volume holds), and
    // the scale around the middle is shifted back down so only the chest rises and the feet stay planted.
    const heroBody = tileSize * 0.8;
    const outline = Math.max(1.2, tileSize * 0.02);
    const bodyX = useMemo(() => Animated.multiply(stretchX, heroBreath.interpolate({ inputRange: [1, 1.04], outputRange: [1, 0.985] })), [stretchX, heroBreath]);
    const bodyY = useMemo(() => Animated.multiply(stretchY, heroBreath), [stretchY, heroBreath]);
    const feet = useMemo(() => bodyY.interpolate({ inputRange: [0, 2], outputRange: [heroBody / 2, -heroBody / 2] }), [bodyY, heroBody]);
    useEffect(() => {
      if (calm || paused) {
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
    }, [calm, paused, heroBreath]);

    // Little dust puffs where the hero just stepped off: cheap, native-driven, gone in half a second.
    const [dusts, setDusts] = useState<{ id: number; x: number; y: number }[]>([]);
    const dustId = useRef(0);
    const removeDust = useCallback((id: number) => setDusts(prev => prev.filter(d => d.id !== id)), []);

    // A new floor or a restart puts the hero on its start tile: it appears there instead of sliding in from the old spot.
    const lastFloor = useRef({ level, seen: visited.length });
    const prevCell = useRef({ row: rowIndex, col: colIndex });
    const warp = useRef(new Animated.Value(1)).current;
    useEffect(() => {
      const prev = lastFloor.current;
      lastFloor.current = { level, seen: visited.length };
      const from = prevCell.current;
      prevCell.current = { row: rowIndex, col: colIndex };
      if (level !== prev.level || visited.length < prev.seen) {
        playerPos.setValue({ x: colIndex * tileSize, y: rowIndex * tileSize });
        setDusts([]);
        setSprung(new Set()); // a restart (or an undo) puts the traps back
        return;
      }
      // A vortex throw is no walk: the hero shrinks away where it stood and pops up on the new tile (calm: it just moves).
      if (teleported && (from.row !== rowIndex || from.col !== colIndex)) {
        const land = () => playerPos.setValue({ x: colIndex * tileSize, y: rowIndex * tileSize });
        if (calm) {
          land();
          return;
        }
        Animated.timing(warp, { toValue: 0, duration: 110, easing: Easing.in(Easing.quad), useNativeDriver: true }).start(() => {
          land();
          Animated.spring(warp, { toValue: 1, friction: 5, tension: 140, useNativeDriver: true }).start();
        });
        return;
      }
      if (!calm && (from.row !== rowIndex || from.col !== colIndex)) {
        const id = ++dustId.current;
        setDusts(current => [...current.slice(-5), { id, x: from.col * tileSize, y: from.row * tileSize }]);
      }
      Animated.timing(playerPos, {
        toValue: { x: colIndex * tileSize, y: rowIndex * tileSize },
        duration: 150,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
      // Stretch along the step while sliding (about 105 ms), squash on landing, then a springy settle. Not when calm.
      if (!calm && (from.row !== rowIndex || from.col !== colIndex)) {
        const sideways = from.row === rowIndex;
        const to = (value: Animated.Value, toValue: number, duration: number) => Animated.timing(value, { toValue, duration, useNativeDriver: true });
        const settle = (value: Animated.Value) => Animated.spring(value, { toValue: 1, friction: 4, tension: 220, useNativeDriver: true });
        Animated.sequence([
          Animated.parallel([to(stretchX, sideways ? 1.14 : 0.9, 60), to(stretchY, sideways ? 0.9 : 1.14, 60)]),
          Animated.delay(45),
          Animated.parallel([to(stretchX, 1.12, 45), to(stretchY, 0.88, 45)]),
          Animated.parallel([settle(stretchX), settle(stretchY)]),
        ]).start();
      }
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
    // The draft of a secret room: the tiles beside the hidden cache glint (the cache itself is never drawn).
    const draftSet = useMemo(() => new Set(secretDraftTiles(secretTile, rows, cols)), [secretTile, rows, cols]);

    const killerEntityType = killerTile != null ? entityMap[killerTile]?.type : undefined;
    const heroArt = characterWithSkin(characterIndex, skin);
    const idleSource = heroArt.playerImage;
    const attackSource = heroArt.attackImage;
    // While the attack button is held the hero already turns toward the aim and draws the bow.
    const aiming = !!aimDir;
    const currentFacing = (aimDir || facingDir || 'RIGHT').toLowerCase() as "up" | "down" | "left" | "right";
    // Looking up or down keeps the side the hero last faced (it used to snap back to the right).
    const lastSide = useRef<"left" | "right">("right");
    if (currentFacing === "left" || currentFacing === "right") lastSide.current = currentFacing;
    const drawn = isAttacking || aiming;

    // The arrow: flies from the hero to the tile it stops on, trailing the hero's colour, and strikes there (see ArrowFlight).
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
              const near = visitedSet.has(i) ? getNearbyHazards(i, rows, cols, shown) : NO_HINTS;
              
              return (
                <GridCell
                  key={`cell-L${level}-I${i}`} // Force full remount on Level Up to avoid stale grid alignments
                  index={i}
                  tileSize={tileSize}
                  cols={cols}
                  isVisited={visitedSet.has(i)}
                  isPlayerHere={i === playerIndex}
                  entity={shown[i]}
                  draft={draftSet.has(i) && visitedSet.has(i)}
                  enemyCount={near.enemyCount}
                  pitCount={near.pitCount}
                  highlighted={highlightSet.has(i)}
                  flagged={!!flags && flags.has(i) && !visitedSet.has(i)}
                  deduced={deduced && !visitedSet.has(i) && !unveil ? deduced.get(i) ?? null : null}
                  aimed={aimTiles && aimTiles.has(i) ? aimDir : null}
                  aimStep={aimTiles && aimTiles.has(i) ? Math.max(Math.abs(Math.floor(i / cols) - rowIndex), Math.abs((i % cols) - colIndex)) : 0}
                  aimLast={!!aimTiles && aimTiles.has(i) && Math.max(Math.abs(Math.floor(i / cols) - rowIndex), Math.abs((i % cols) - colIndex)) === aimTiles.size}
                  onTileLoaded={onTileLoaded}
                  pulse={pulse}
                  beat={calm ? undefined : beat}
                  killer={killerTile === i}
                  flagPing={flagPing && flagPing.index === i ? flagPing.n : 0}
                  biome={biome}
                  flagArt={flag}
                  unveiled={unveil}
                  lurking={shown[i]?.type === "stalker" && Math.abs(Math.floor(i / cols) - rowIndex) + Math.abs((i % cols) - colIndex) <= 2}
                  hideClue={dark && Math.abs(Math.floor(i / cols) - rowIndex) + Math.abs((i % cols) - colIndex) > 1}
                  calm={!!calm}
                  sprung={sprung.has(i)}
                  revealDelay={burst ? Math.min(600, 60 * Math.max(Math.abs(Math.floor(i / cols) - rowIndex), Math.abs((i % cols) - colIndex))) + 30 : 0}
                />
              );
            })}
          </View>

          {dusts.map(d => (
            <DustPuff key={d.id} x={d.x} y={d.y} tileSize={tileSize} onDone={() => removeDust(d.id)} />
          ))}

          {notes
            ? [...notes].map(([tile, note]) =>
                visitedSet.has(tile) || (flags && flags.has(tile)) || unveil ? null : <NoteMark key={`note-${tile}`} tile={tile} note={note} cols={cols} tileSize={tileSize} />,
              )
            : null}
          {beam ? <Beam key={`${beam.from}-${beam.to}`} beam={beam} cols={cols} tileSize={tileSize} calm={!!calm} /> : null}

          {pastSteps?.map(tile =>
            visitedSet.has(tile) || tile >= rows * cols ? null : (
              <View
                key={`step-${tile}`}
                pointerEvents="none"
                style={[styles.step, { left: (tile % cols) * tileSize, top: Math.floor(tile / cols) * tileSize, width: tileSize, height: tileSize }]}
              >
                <Ionicons name="footsteps" size={tileSize * 0.34} color="rgba(255,236,200,0.55)" />
              </View>
            ),
          )}

          {friendGhosts?.map((g, k) => (
            <View
              key={`ghost-${k}`}
              pointerEvents="none"
              accessible
              accessibilityLabel={g.name}
              style={[styles.ghost, { left: (g.tile % cols) * tileSize, top: Math.floor(g.tile / cols) * tileSize, width: tileSize, height: tileSize }]}
            >
              <View style={[styles.ghostRing, { width: tileSize * 0.78, height: tileSize * 0.78, borderRadius: tileSize * 0.39 }]}>
                <SpriteImage source={g.art} style={{ width: tileSize * 0.7, height: tileSize * 0.7, borderRadius: tileSize * 0.35, opacity: 0.75 }} resizeMode="cover" />
              </View>
              <Text style={[styles.ghostName, { maxWidth: tileSize * 1.6 }]} numberOfLines={1} maxFontSizeMultiplier={1}>
                {g.name}
              </Text>
            </View>
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
              onTileShiftClick={onTileShiftClick}
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
                  { scale: heroShrink },
                  { scale: warp }
                ],
              },
            ]}
            pointerEvents="none"
          >
            {/* A dark pool and a shadow at the feet: whatever the board's colours, the hero stands out from the tile. */}
            <SpriteImage pointerEvents="none" source={HERO_PLATE} style={{ position: "absolute", width: tileSize * 1.04, height: tileSize * 1.04, left: -tileSize * 0.02, top: -tileSize * 0.02 }} />
            {/* The companion rides along at the hero's shoulder (behind it, on the side it faces away from). */}
            {pet && !dying ? (
              <Animated.View pointerEvents="none" style={{ position: "absolute", top: 0, [lastSide.current === "left" ? "right" : "left"]: 0, zIndex: 3 }}>
                <Companion look={pet} size={tileSize * 0.52} calm={!!calm || paused} mirror={lastSide.current === "left"} aura={petAura} />
              </Animated.View>
            ) : null}
            {/* Both poses stay mounted and are swapped by opacity: swapping the image source would flash */}
            {/* The art is drawn facing right: mirror it for left; up/down lean away from / toward the viewer. */}
            {/* The outer layer breathes and squashes on the feet (see bodyX / bodyY / feet). */}
            <Animated.View style={{ width: heroBody, height: heroBody, transform: [{ translateY: feet }, { scaleX: bodyX }, { scaleY: bodyY }] }}>
            <Animated.View
              style={{
                width: heroBody,
                height: heroBody,
                transform: [
                  { scaleX: lastSide.current === "left" ? -1 : 1 },
                  { translateY: currentFacing === "up" ? -tileSize * 0.06 : currentFacing === "down" ? tileSize * 0.05 : 0 },
                  { scale: currentFacing === "up" ? 0.94 : currentFacing === "down" ? 1.05 : 1 },
                ],
              }}
            >
              {idleSource && <OutlinedSprite source={idleSource} visible={!drawn} line={outline} />}
              {attackSource && <OutlinedSprite source={attackSource} visible={drawn} line={outline} />}
            </Animated.View>
            </Animated.View>
          </Animated.View>

          {/* The clues of the hero's tile, above the hero: its body would cover them where they matter most. */}
          {!dying && !unveil && visitedSet.has(playerIndex) ? (
            <View pointerEvents="none" style={{ position: "absolute", left: colIndex * tileSize, top: rowIndex * tileSize, width: tileSize, height: tileSize, zIndex: 22 }}>
              <HeroClues {...heroNear} tileSize={tileSize} />
            </View>
          ) : null}

          {fallen.map(f => (
            <FallenFoe
              key={f.id}
              type={f.entity.type}
              x={(f.entity.index % cols) * tileSize}
              y={Math.floor(f.entity.index / cols) * tileSize}
              tileSize={tileSize}
              onDone={() => setFallen(list => list.filter(x => x.id !== f.id))}
            />
          ))}

          {flying && <ArrowFlight shot={flying} flight={flight} tileSize={tileSize} row={rowIndex} col={colIndex} color={heroArt.arrowColor} trail={trail} />}

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
            const source = isPit ? ASSETS.pit : killerEntityType === "stalker" ? ASSETS.stalker : killerEntityType === "sleeper" ? ASSETS.sleeper : killerEntityType === "boss" ? (entityMap[killerTile]?.ancient ? ANCIENT_FRAMES.idle : ASSETS.boss) : ASSETS.enemy;
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
  note: { position: "absolute", alignItems: "center", justifyContent: "center", zIndex: 3 },
  noteBadge: { alignItems: "center", justifyContent: "center", borderWidth: 1.5 },
  noteSafe: { backgroundColor: "rgba(158,227,125,0.92)", borderColor: "#e8ffd8" },
  noteNot: { backgroundColor: "rgba(20,14,10,0.82)", borderColor: "rgba(255,255,255,0.55)" },
  noteSlash: { position: "absolute", backgroundColor: "#FF5252", transform: [{ rotate: "-45deg" }], borderRadius: 2 },
  step: { position: "absolute", alignItems: "center", justifyContent: "flex-end", paddingBottom: 3, zIndex: 4 },
  ghost: { position: "absolute", alignItems: "center", justifyContent: "center", zIndex: 6 },
  ghostRing: { alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "rgba(200,230,255,0.85)", backgroundColor: "rgba(120,160,220,0.35)" },
  ghostName: { position: "absolute", bottom: -6, color: "#E3F2FD", fontSize: 9, fontWeight: "900", backgroundColor: "rgba(10,20,40,0.8)", paddingHorizontal: 4, borderRadius: 4, overflow: "hidden" },
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
});

export default BoardView;
