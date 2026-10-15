import React, { memo, useEffect, useMemo, useRef, useState } from "react";
import { PanResponder, StyleSheet, View } from "react-native";
import type { Direction } from "../../core/engine/types";
import { REPEAT_FIRST_MS, REPEAT_MS, clampPadCenter, floatingDirection } from "../../core/input/floatingPad";
import { haptic } from "../../shared/haptics";
import { useGameLayout } from "../layout/useGameLayout";
import { useT } from "../../i18n/useT";
import { AttackButton } from "./DirectionPad";
import JoystickBase from "./JoystickBase";
import { useSettingsStore } from "../../state/settings/store";

const NO_THUMB = { x: 0, y: 0 };

type Props = {
  onMove: (direction: Direction) => void;
  /** Whether a held pad may take one more step (it only keeps walking over explored, empty ground). */
  canRepeat: (direction: Direction) => boolean;
  /** The attack button that lives in the pad's corner when the layout has no column of its own for it. */
  onAttack: (direction?: Direction) => void;
  onAim?: (aim: Direction | "facing" | null) => void;
  arrows: number;
};

const SIDES: { dir: Direction }[] = [{ dir: "UP" }, { dir: "DOWN" }, { dir: "LEFT" }, { dir: "RIGHT" }];

/**
 * A pad that appears under the thumb. Put a finger anywhere in the control zone and slide toward a side: one step per side
 * entered, repeated while it is held (only across explored, empty tiles: see canRepeatStep). A diagonal does nothing.
 */
const FloatingPad: React.FC<Props> = memo(({ onMove, canRepeat, onAttack, onAim, arrows }) => {
  const { t } = useT();
  const { padDiameter: D, controlPanelWidth, splitAttack, attackSize } = useGameLayout();
  const zoneW = controlPanelWidth;
  const zoneH = D;
  const baseR = D * 0.42;
  const skin = useSettingsStore(s => s.joystickSkin);

  const [origin, setOrigin] = useState<{ x: number; y: number } | null>(null);
  const [thumb, setThumb] = useState({ x: 0, y: 0 });
  const [active, setActive] = useState<Direction | null>(null);

  const latest = useRef({ onMove, canRepeat, zoneW, zoneH, baseR });
  latest.current = { onMove, canRepeat, zoneW, zoneH, baseR };
  const center = useRef({ x: 0, y: 0 });
  const startTouch = useRef({ x: 0, y: 0 });
  const dirRef = useRef<Direction | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stopRepeat = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  useEffect(() => stopRepeat, []);

  const step = (dir: Direction) => {
    haptic.impact();
    latest.current.onMove(dir);
  };
  const scheduleRepeat = (dir: Direction, delay: number) => {
    stopRepeat();
    timer.current = setTimeout(() => {
      if (dirRef.current !== dir) return;
      if (!latest.current.canRepeat(dir)) return; // the next tile is unknown, marked or has something on it: stop and let the player choose
      step(dir);
      scheduleRepeat(dir, REPEAT_MS);
    }, delay);
  };

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderGrant: e => {
          const cur = latest.current;
          startTouch.current = { x: e.nativeEvent.locationX, y: e.nativeEvent.locationY };
          center.current = clampPadCenter(startTouch.current.x, startTouch.current.y, cur.zoneW, cur.zoneH, cur.baseR);
          dirRef.current = null;
          setOrigin(center.current);
          setThumb({ x: startTouch.current.x - center.current.x, y: startTouch.current.y - center.current.y });
          setActive(null);
        },
        onPanResponderMove: (_e, g) => {
          const cur = latest.current;
          const ox = startTouch.current.x - center.current.x + g.dx;
          const oy = startTouch.current.y - center.current.y + g.dy;
          // The nub follows the finger but stays inside the pad.
          const len = Math.hypot(ox, oy);
          const k = len > cur.baseR ? cur.baseR / len : 1;
          setThumb({ x: ox * k, y: oy * k });
          const next = floatingDirection(ox, oy, cur.baseR, dirRef.current);
          if (next !== dirRef.current) {
            dirRef.current = next;
            setActive(next);
            stopRepeat();
            if (next) {
              step(next);
              scheduleRepeat(next, REPEAT_FIRST_MS);
            }
          }
        },
        onPanResponderRelease: () => {
          stopRepeat();
          dirRef.current = null;
          setActive(null);
          setOrigin(null);
        },
        onPanResponderTerminate: () => {
          stopRepeat();
          dirRef.current = null;
          setActive(null);
          setOrigin(null);
        },
      }),
    [],
  );

  const names: Record<Direction, string> = {
    UP: t("a11y.moveUp"),
    DOWN: t("a11y.moveDown"),
    LEFT: t("a11y.moveLeft"),
    RIGHT: t("a11y.moveRight"),
  };

  return (
    <View
      {...responder.panHandlers}
      style={[styles.zone, { width: zoneW, height: zoneH }]}
      accessible
      accessibilityLabel={t("a11y.dpad")}
      accessibilityActions={SIDES.map(s => ({ name: s.dir, label: names[s.dir] }))}
      onAccessibilityAction={e => {
        const dir = e.nativeEvent.actionName as Direction;
        if (names[dir]) onMove(dir);
      }}
    >
      {/* Waiting: the stick at rest, faint, says where to put the thumb */}
      {!origin && (
        <View pointerEvents="none" style={{ position: "absolute", opacity: 0.5, left: zoneW / 2 - baseR, top: zoneH / 2 - baseR }}>
          <JoystickBase skin={skin} radius={baseR} thumb={NO_THUMB} active={null} />
        </View>
      )}

      {/* Touching: the joystick opens under the thumb and follows it */}
      {origin && (
        <View pointerEvents="none" style={{ position: "absolute", left: origin.x - baseR, top: origin.y - baseR }}>
          <JoystickBase skin={skin} radius={baseR} thumb={thumb} active={active} />
        </View>
      )}

      {/* Layouts without a column for the attack button keep it in the corner of the zone */}
      {!splitAttack && (
        <View style={styles.corner} pointerEvents="box-none">
          <AttackButton size={Math.min(attackSize, D * 0.34)} arrows={arrows} label={`${t("a11y.attack")}. ${t("a11y.arrowsLeft", { count: arrows })}`} onAttack={onAttack} onAim={onAim} />
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  zone: { justifyContent: "center", alignItems: "center" },
  corner: { position: "absolute", right: 0, bottom: 0 },
});

export default FloatingPad;
