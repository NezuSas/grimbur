import React, { memo, useEffect, useMemo, useRef, useState } from "react";
import { PanResponder, StyleSheet, View } from "react-native";
import type { Direction } from "../../core/engine/types";
import { REPEAT_FIRST_MS, REPEAT_MS, floatingDirection } from "../../core/input/floatingPad";
import { haptic } from "../../shared/haptics";
import { useGameLayout } from "../layout/useGameLayout";
import { useT } from "../../i18n/useT";
import { AttackButton } from "./DirectionPad";
import JoystickBase from "./JoystickBase";
import { useSettingsStore } from "../../state/settings/store";

const NO_THUMB = { x: 0, y: 0 };

type Props = {
  onMove: (direction: Direction) => void;
  /** Whether a held stick may take one more step (it only keeps walking over explored, empty ground). */
  canRepeat: (direction: Direction) => boolean;
  /** The attack button that lives in the corner of the zone when the layout has no column of its own for it. */
  onAttack: (direction?: Direction) => void;
  onAim?: (aim: Direction | "facing" | null) => void;
  arrows: number;
};

const SIDES: { dir: Direction }[] = [{ dir: "UP" }, { dir: "DOWN" }, { dir: "LEFT" }, { dir: "RIGHT" }];

/**
 * A joystick with a fixed base that is always in view; only the stick moves. The whole control zone is the touch area: the
 * stick follows how far the thumb travels from where it landed, so there is no need to aim at the stick. One step per side
 * entered, repeated while it is held (only across explored, empty tiles: see canRepeatStep). A diagonal does nothing.
 */
const FloatingPad: React.FC<Props> = memo(({ onMove, canRepeat, onAttack, onAim, arrows }) => {
  const { t } = useT();
  const { padDiameter: D, controlPanelWidth, splitAttack, attackSize } = useGameLayout();
  const zoneW = controlPanelWidth;
  const zoneH = D;
  // Leaves room for the attack button in the corner when the layout has no column of its own for it.
  const baseR = D * (splitAttack ? 0.47 : 0.42);
  const skin = useSettingsStore(s => s.joystickSkin);

  const [thumb, setThumb] = useState(NO_THUMB);
  const [active, setActive] = useState<Direction | null>(null);

  const latest = useRef({ onMove, canRepeat, baseR });
  latest.current = { onMove, canRepeat, baseR };
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
  const release = () => {
    stopRepeat();
    dirRef.current = null;
    setActive(null);
    setThumb(NO_THUMB);
  };

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          dirRef.current = null;
          setThumb(NO_THUMB);
          setActive(null);
        },
        onPanResponderMove: (_e, g) => {
          const R = latest.current.baseR;
          // The stick follows the thumb's travel (not where it landed) and stays inside the base.
          const len = Math.hypot(g.dx, g.dy);
          const k = len > R ? R / len : 1;
          setThumb({ x: g.dx * k, y: g.dy * k });
          const next = floatingDirection(g.dx, g.dy, R, dirRef.current);
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
        onPanResponderRelease: release,
        onPanResponderTerminate: release,
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
      {/* The joystick: its base never moves and is always fully drawn */}
      <View pointerEvents="none" style={{ position: "absolute", left: zoneW / 2 - baseR, top: zoneH / 2 - baseR }}>
        <JoystickBase skin={skin} radius={baseR} thumb={thumb} active={active} />
      </View>

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
