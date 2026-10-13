import React, { useEffect, useMemo, useRef } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';
import type { Direction } from '../../core/engine/types';
import { SWIPE_MIN_DISTANCE, TAP_MAX_DISTANCE, classifyGesture } from '../../core/input/swipe';

const LONG_PRESS_MS = 450;

type Props = {
  tileSize: number;
  rows: number;
  cols: number;
  onTilePress?: (index: number) => void;
  onSwipe?: (direction: Direction) => void;
  /** Holding a finger on a tile (without moving) marks it as suspected danger. */
  onTileLongPress?: (index: number) => void;
};

/**
 * Transparent layer over the board. A tap on a tile asks to walk there; a swipe (when enabled) moves
 * one step. Everything acts on finger release, and an unsure gesture does nothing.
 */
const BoardTouchLayer: React.FC<Props> = ({ tileSize, rows, cols, onTilePress, onSwipe, onTileLongPress }) => {
  const latest = useRef({ tileSize, rows, cols, onTilePress, onSwipe, onTileLongPress });
  latest.current = { tileSize, rows, cols, onTilePress, onSwipe, onTileLongPress };
  const start = useRef({ x: 0, y: 0 });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longFired = useRef(false);
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

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderGrant: e => {
          start.current = { x: e.nativeEvent.locationX, y: e.nativeEvent.locationY };
          longFired.current = false;
          clearTimer();
          if (latest.current.onTileLongPress) {
            timer.current = setTimeout(() => {
              const tile = tileAt(start.current.x, start.current.y);
              if (tile !== null) {
                longFired.current = true;
                latest.current.onTileLongPress?.(tile);
              }
            }, LONG_PRESS_MS);
          }
        },
        onPanResponderMove: (_e, g) => {
          // Moving the finger turns the touch into a swipe or a drag: it is no longer a long press.
          if (Math.max(Math.abs(g.dx), Math.abs(g.dy)) > TAP_MAX_DISTANCE) clearTimer();
        },
        onPanResponderTerminate: clearTimer,
        onPanResponderRelease: (_e, g) => {
          clearTimer();
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

  return (
    <View
      style={[StyleSheet.absoluteFill, { zIndex: 30 }]}
      {...responder.panHandlers}
      accessible={false}
      importantForAccessibility="no"
    />
  );
};

export default BoardTouchLayer;
