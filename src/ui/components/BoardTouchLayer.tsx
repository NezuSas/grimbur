import React, { useEffect, useMemo, useRef } from 'react';
import { PanResponder, Platform, StyleSheet, View } from 'react-native';
import type { Direction } from '../../core/engine/types';
import { SWIPE_MIN_DISTANCE, TAP_MAX_DISTANCE, classifyGesture, heroAimFromDrag } from '../../core/input/swipe';
import { haptic } from '../../shared/haptics';
import { useTouchScale, useUiScale } from '../layout/scaledWindow';

const LONG_PRESS_MS = 450;

type Props = {
  tileSize: number;
  rows: number;
  cols: number;
  onTilePress?: (index: number) => void;
  onSwipe?: (direction: Direction) => void;
  /** Holding a finger on a tile (without moving) marks it as suspected danger. */
  onTileLongPress?: (index: number) => void;
  /** The tile the hero stands on. With `onAimFire`, a drag that starts on it aims a shot instead of moving or tapping. */
  heroIndex?: number;
  /** While dragging from the hero: the side being aimed at, or null (nothing aimed yet, or the finger came back to cancel). */
  onAimDrag?: (direction: Direction | null) => void;
  /** The finger was lifted with a side aimed: shoot that way. */
  onAimFire?: (direction: Direction) => void;
  /** A mouse (web): Shift + click on a tile. The plain tap that would follow is dropped. */
  onTileShiftClick?: (index: number) => void;
};

/**
 * Transparent layer over the board. A tap on a tile asks to walk there; a swipe (when enabled) moves
 * one step. Everything acts on finger release, and an unsure gesture does nothing.
 *
 * Drag from the hero (when `onAimFire` is given): press the hero, drag toward a side and the board shows the line of fire;
 * let go to shoot, or drag back onto the hero to cancel. A plain tap on the hero stays a tap.
 */
const BoardTouchLayer: React.FC<Props> = ({ tileSize, rows, cols, onTilePress, onSwipe, onTileLongPress, heroIndex, onAimDrag, onAimFire, onTileShiftClick }) => {
  // On a scaled screen (a big window) drags are measured on the real screen and, on the web, touch points too: both are
  // brought back to the board's own units, so a tile and a swipe are the same size to the finger as they look.
  const ui = useUiScale();
  const touch = useTouchScale();
  const latest = useRef({ tileSize, rows, cols, onTilePress, onSwipe, onTileLongPress, heroIndex, onAimDrag, onAimFire, onTileShiftClick, ui, touch });
  latest.current = { tileSize, rows, cols, onTilePress, onSwipe, onTileLongPress, heroIndex, onAimDrag, onAimFire, onTileShiftClick, ui, touch };
  // A Shift + click (web) already did its job: the tap the responder reports next is dropped.
  const dropTap = useRef(false);
  const layer = useRef<React.ComponentRef<typeof View>>(null);
  const start = useRef({ x: 0, y: 0 });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longFired = useRef(false);
  /** This touch began on the hero with drag-to-shoot on: it is an aim gesture, whatever happens next. */
  const aiming = useRef(false);
  const aimed = useRef<Direction | null>(null);
  const clearTimer = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  useEffect(() => clearTimer, []);

  const tileAt = (x: number, y: number): number | null => {
    const cur = latest.current;
    const col = Math.floor(x / cur.tileSize);
    const row = Math.floor(y / cur.tileSize);
    return row >= 0 && row < cur.rows && col >= 0 && col < cur.cols ? row * cur.cols + col : null;
  };

  const endAim = () => {
    if (aimed.current !== null) latest.current.onAimDrag?.(null);
    aimed.current = null;
    aiming.current = false;
  };

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderGrant: e => {
          start.current = { x: e.nativeEvent.locationX / latest.current.touch, y: e.nativeEvent.locationY / latest.current.touch };
          longFired.current = false;
          aimed.current = null;
          clearTimer();
          const cur = latest.current;
          aiming.current = !!cur.onAimFire && cur.heroIndex !== undefined && tileAt(start.current.x, start.current.y) === cur.heroIndex;
          // Pressing the hero is the start of an aim, never a long press (the hero tile has nothing to flag).
          if (cur.onTileLongPress && !aiming.current) {
            timer.current = setTimeout(() => {
              const tile = tileAt(start.current.x, start.current.y);
              if (tile !== null) {
                longFired.current = true;
                latest.current.onTileLongPress?.(tile);
              }
            }, LONG_PRESS_MS);
          }
        },
        onPanResponderMove: (_e, raw) => {
          const g = { dx: raw.dx / latest.current.ui, dy: raw.dy / latest.current.ui };
          // Moving the finger turns the touch into a swipe or a drag: it is no longer a long press.
          if (Math.max(Math.abs(g.dx), Math.abs(g.dy)) > TAP_MAX_DISTANCE) clearTimer();
          if (aiming.current) {
            const next = heroAimFromDrag(g.dx, g.dy, latest.current.tileSize);
            if (next !== aimed.current) {
              aimed.current = next;
              latest.current.onAimDrag?.(next);
              if (next) haptic.impact(); // a small tick every time the aim lands on a side
            }
          }
        },
        onPanResponderTerminate: () => {
          clearTimer();
          endAim();
        },
        onPanResponderRelease: (_e, raw) => {
          const g = { dx: raw.dx / latest.current.ui, dy: raw.dy / latest.current.ui };
          clearTimer();
          if (dropTap.current) {
            dropTap.current = false;
            endAim();
            return;
          }
          if (aiming.current) {
            const direction = aimed.current;
            endAim();
            if (direction) {
              latest.current.onAimFire?.(direction);
              return;
            }
            // Not aimed: a tap on the hero is still a tap; a drag that came back (or stopped short) does nothing.
            if (Math.max(Math.abs(g.dx), Math.abs(g.dy)) <= TAP_MAX_DISTANCE) {
              const tile = tileAt(start.current.x, start.current.y);
              if (tile !== null) latest.current.onTilePress?.(tile);
            }
            return;
          }
          if (longFired.current) return; // the long press already did its job
          const cur = latest.current;
          const gesture = classifyGesture(g.dx, g.dy, Math.max(SWIPE_MIN_DISTANCE, cur.tileSize * 0.6));
          if (gesture.kind === 'swipe') {
            cur.onSwipe?.(gesture.direction);
          } else if (gesture.kind === 'tap' && cur.onTilePress) {
            const tile = tileAt(start.current.x, start.current.y);
            if (tile !== null) cur.onTilePress(tile);
          }
        },
      }),
    [],
  );

  // A mouse on the web: right-click flags the tile (as a long press does), Shift + click is handed to the screen (a run shoots
  // that way). The tile is read from where the pointer is on the layer as drawn, whatever the screen's scale.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const el = layer.current as unknown as HTMLElement | null;
    if (!el || !el.addEventListener) return;
    const tileOf = (e: MouseEvent): number | null => {
      const box = el.getBoundingClientRect();
      if (!box.width || !box.height) return null;
      const x = ((e.clientX - box.left) * el.offsetWidth) / box.width;
      const y = ((e.clientY - box.top) * el.offsetHeight) / box.height;
      return tileAt(x, y);
    };
    const onContext = (e: MouseEvent) => {
      e.preventDefault();
      const tile = tileOf(e);
      if (tile !== null) latest.current.onTileLongPress?.(tile);
    };
    const onDown = (e: MouseEvent) => {
      if (!e.shiftKey || e.button !== 0 || !latest.current.onTileShiftClick) return;
      const tile = tileOf(e);
      if (tile === null) return;
      dropTap.current = true;
      latest.current.onTileShiftClick(tile);
    };
    el.addEventListener('contextmenu', onContext);
    el.addEventListener('mousedown', onDown);
    return () => {
      el.removeEventListener('contextmenu', onContext);
      el.removeEventListener('mousedown', onDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View
      ref={layer}
      style={[StyleSheet.absoluteFill, { zIndex: 30 }]}
      {...responder.panHandlers}
      accessible={false}
      importantForAccessibility="no"
    />
  );
};

export default BoardTouchLayer;
