import React, { useMemo, useRef } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';
import type { Direction } from '../../core/engine/types';
import { SWIPE_MIN_DISTANCE, classifyGesture } from '../../core/input/swipe';

type Props = {
  tileSize: number;
  rows: number;
  cols: number;
  onTilePress?: (index: number) => void;
  onSwipe?: (direction: Direction) => void;
};

/**
 * Transparent layer over the board. A tap on a tile asks to walk there; a swipe (when enabled) moves
 * one step. Everything acts on finger release, and an unsure gesture does nothing.
 */
const BoardTouchLayer: React.FC<Props> = ({ tileSize, rows, cols, onTilePress, onSwipe }) => {
  const latest = useRef({ tileSize, rows, cols, onTilePress, onSwipe });
  latest.current = { tileSize, rows, cols, onTilePress, onSwipe };
  const start = useRef({ x: 0, y: 0 });

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderGrant: e => {
          start.current = { x: e.nativeEvent.locationX, y: e.nativeEvent.locationY };
        },
        onPanResponderRelease: (_e, g) => {
          const cur = latest.current;
          const gesture = classifyGesture(g.dx, g.dy, Math.max(SWIPE_MIN_DISTANCE, cur.tileSize * 0.6));
          if (gesture.kind === 'swipe') {
            cur.onSwipe?.(gesture.direction);
          } else if (gesture.kind === 'tap' && cur.onTilePress) {
            const col = Math.floor(start.current.x / cur.tileSize);
            const row = Math.floor(start.current.y / cur.tileSize);
            if (row >= 0 && row < cur.rows && col >= 0 && col < cur.cols) cur.onTilePress(row * cur.cols + col);
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
