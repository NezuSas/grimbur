import React, { memo, useEffect, useMemo, useRef, useState } from "react";
import { Animated, PanResponder, Pressable, StyleSheet, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Text from "../Text";

export const GOLD = "#FFD54F";
export const CARD_BG = "rgba(34, 26, 18,0.9)";
export const CARD_BORDER = "rgba(255,255,255,0.09)";

type IconName = keyof typeof Ionicons.glyphMap;

/** A panel that groups related rows. */
export const SettingCard = ({ children, title }: { children: React.ReactNode; title?: string }) => (
  <View style={styles.cardWrap}>
    {title ? (
      <Text style={styles.cardTitle} accessibilityRole="header" maxFontSizeMultiplier={1.3}>
        {title.toLocaleUpperCase()}
      </Text>
    ) : null}
    <View style={styles.card}>{children}</View>
  </View>
);

export const RowDivider = () => <View style={styles.divider} />;

type RowProps = {
  label: string;
  hint?: string;
  icon: IconName;
  /** Colour of the icon chip: every setting has its own, so a long list can be scanned by colour. */
  tint?: string;
  /** The control sits on the right of the label. */
  children?: React.ReactNode;
  /** The control goes under the label (long selectors, sliders). */
  stacked?: boolean;
  dimmed?: boolean;
};

/** One setting: a coloured icon, its name and hint, and its control. */
export const SettingRow = ({ label, hint, icon, tint = GOLD, children, stacked, dimmed }: RowProps) => (
  <View style={[styles.row, stacked && styles.rowStacked, dimmed && { opacity: 0.45 }]}>
    <View style={styles.rowHead}>
      <View style={[styles.chip, { backgroundColor: tint + "26", borderColor: tint + "66" }]}>
        <Ionicons name={icon} size={20} color={tint} />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowLabel} maxFontSizeMultiplier={1.3}>
          {label}
        </Text>
        {hint ? (
          <Text style={styles.rowHint} maxFontSizeMultiplier={1.3}>
            {hint}
          </Text>
        ) : null}
      </View>
      {!stacked && children ? <View style={styles.rowControl}>{children}</View> : null}
    </View>
    {stacked && children ? <View style={styles.rowBody}>{children}</View> : null}
  </View>
);

/** An on / off switch in the game's own colours. */
export const ToggleSwitch = memo(({ value, onValueChange, accessibilityLabel }: { value: boolean; onValueChange: (v: boolean) => void; accessibilityLabel: string }) => {
  const pos = useRef(new Animated.Value(value ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(pos, { toValue: value ? 1 : 0, duration: 160, useNativeDriver: true }).start();
  }, [value, pos]);
  return (
    <Pressable
      onPress={() => onValueChange(!value)}
      hitSlop={8}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={accessibilityLabel}
      style={[styles.track, value && styles.trackOn]}
    >
      <Animated.View style={[styles.thumb, value && styles.thumbOn, { transform: [{ translateX: pos.interpolate({ inputRange: [0, 1], outputRange: [0, 22] }) }] }]} />
    </Pressable>
  );
});

type SliderProps = {
  value: number;
  steps: readonly number[];
  onChange: (value: number) => void;
  /** Called when the finger lifts (e.g. to play a sample at the new level). */
  onRelease?: () => void;
  accessibilityLabel: string;
  /** Text shown at the end ("75%"). */
  valueLabel: string;
};

/** A slider that snaps to a few levels: drag or tap anywhere on the track. */
export const LevelSlider = memo(({ value, steps, onChange, onRelease, accessibilityLabel, valueLabel }: SliderProps) => {
  const [width, setWidth] = useState(0);
  const latest = useRef({ steps, onChange, onRelease, width });
  latest.current = { steps, onChange, onRelease, width };
  const index = Math.max(0, steps.indexOf(value));
  const last = steps.length - 1;

  const pick = (x: number) => {
    const { steps: s, width: w, onChange: change } = latest.current;
    if (w <= 0) return;
    const i = Math.min(s.length - 1, Math.max(0, Math.round((x / w) * (s.length - 1))));
    change(s[i]);
  };
  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: e => pick(e.nativeEvent.locationX),
        onPanResponderMove: e => pick(e.nativeEvent.locationX),
        onPanResponderRelease: () => latest.current.onRelease?.(),
        onPanResponderTerminate: () => latest.current.onRelease?.(),
      }),
    [],
  );
  const pct = last > 0 ? index / last : 0;
  const THUMB = 26;

  return (
    <View style={styles.sliderRow}>
      <View
        style={styles.sliderTouch}
        {...responder.panHandlers}
        onLayout={e => setWidth(e.nativeEvent.layout.width)}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={accessibilityLabel}
        accessibilityValue={{ text: valueLabel }}
        accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
        onAccessibilityAction={e => {
          const next = e.nativeEvent.actionName === "increment" ? Math.min(last, index + 1) : Math.max(0, index - 1);
          onChange(steps[next]);
        }}
      >
        <View style={styles.sliderTrack} pointerEvents="none">
          <View style={[styles.sliderFill, { width: `${pct * 100}%` }]} />
        </View>
        {steps.map((s, i) => (
          <View key={s} pointerEvents="none" style={[styles.tick, { left: `${(i / last) * 100}%` }, i <= index && styles.tickOn]} />
        ))}
        <View pointerEvents="none" style={[styles.sliderThumb, { left: width > 0 ? pct * width - THUMB / 2 : 0, width: THUMB, height: THUMB, borderRadius: THUMB / 2 }]} />
      </View>
      <Text style={styles.sliderValue} maxFontSizeMultiplier={1.2}>
        {valueLabel}
      </Text>
    </View>
  );
});

export type SegmentOption<V extends string> = { value: V; label: string };

/** A row of options where exactly one is chosen. */
export function Segmented<V extends string>({ options, value, onChange, accessibilityLabel }: { options: SegmentOption<V>[]; value: V; onChange: (value: V) => void; accessibilityLabel: string }) {
  return (
    <View style={styles.segmented} accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel}>
      {options.map(option => {
        const active = option.value === value;
        return (
          <TouchableOpacity
            key={option.value}
            onPress={() => onChange(option.value)}
            activeOpacity={0.8}
            style={[styles.segment, active && styles.segmentActive]}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            accessibilityLabel={option.label}
          >
            <Text style={[styles.segmentText, active && styles.segmentTextActive]} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.2}>
              {option.label.toLocaleUpperCase()}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

/** A round action button on the right of a row. */
export const RoundAction = ({ icon, onPress, label, tone = "gold", disabled }: { icon: IconName; onPress: () => void; label: string; tone?: "gold" | "danger" | "dangerOn"; disabled?: boolean }) => (
  <TouchableOpacity
    onPress={onPress}
    disabled={disabled}
    activeOpacity={0.8}
    accessibilityRole="button"
    accessibilityLabel={label}
    style={[styles.action, tone === "danger" && styles.actionDanger, tone === "dangerOn" && styles.actionDangerOn, disabled && { opacity: 0.5 }]}
  >
    <Ionicons name={icon} size={20} color={tone === "gold" ? "#1a1200" : tone === "dangerOn" ? "#fff" : "#FF8A80"} />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  cardWrap: { gap: 8 },
  cardTitle: { color: GOLD, fontWeight: "900", fontSize: 12, letterSpacing: 2.2, marginLeft: 6 },
  card: { backgroundColor: CARD_BG, borderRadius: 18, borderWidth: 1, borderColor: CARD_BORDER, paddingHorizontal: 14, paddingVertical: 4, overflow: "hidden" },
  divider: { height: 1, backgroundColor: "rgba(255,255,255,0.07)" },
  row: { paddingVertical: 12, gap: 10 },
  rowStacked: {},
  rowHead: { flexDirection: "row", alignItems: "center", gap: 12 },
  chip: { width: 38, height: 38, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  rowText: { flex: 1, flexShrink: 1 },
  rowLabel: { color: "#fff", fontWeight: "800", fontSize: 16 },
  rowHint: { color: "#CBB49E", fontSize: 12.5, lineHeight: 17, marginTop: 2 },
  rowControl: { marginLeft: 8 },
  rowBody: { paddingLeft: 50 },
  track: { width: 52, height: 30, borderRadius: 15, backgroundColor: "#34324a", borderWidth: 1.5, borderColor: "rgba(255,255,255,0.14)", justifyContent: "center", paddingHorizontal: 2 },
  trackOn: { backgroundColor: "rgba(255,213,79,0.28)", borderColor: GOLD },
  thumb: { width: 22, height: 22, borderRadius: 11, backgroundColor: "#9a97b3" },
  thumbOn: { backgroundColor: GOLD },
  sliderRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  sliderTouch: { flex: 1, height: 40, justifyContent: "center" },
  sliderTrack: { height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.12)", overflow: "hidden" },
  sliderFill: { height: "100%", backgroundColor: GOLD, borderRadius: 4 },
  tick: { position: "absolute", top: 17, width: 6, height: 6, borderRadius: 3, marginLeft: -3, backgroundColor: "rgba(255,255,255,0.25)" },
  tickOn: { backgroundColor: "rgba(26,18,0,0.6)" },
  sliderThumb: { position: "absolute", top: 7, backgroundColor: "#fff", borderWidth: 3, borderColor: GOLD },
  sliderValue: { width: 48, textAlign: "right", color: GOLD, fontWeight: "900", fontSize: 15 },
  segmented: { flexDirection: "row", backgroundColor: "rgba(0,0,0,0.35)", borderRadius: 14, padding: 4, gap: 4 },
  segment: { flex: 1, minHeight: 46, borderRadius: 11, alignItems: "center", justifyContent: "center", paddingHorizontal: 8 },
  segmentActive: { backgroundColor: GOLD },
  segmentText: { color: "#D6C4B2", fontWeight: "900", fontSize: 12.5, letterSpacing: 0.8 },
  segmentTextActive: { color: "#1a1200" },
  action: { width: 44, height: 44, borderRadius: 22, backgroundColor: GOLD, alignItems: "center", justifyContent: "center" },
  actionDanger: { backgroundColor: "rgba(255,82,82,0.14)", borderWidth: 1.5, borderColor: "rgba(255,138,128,0.7)" },
  actionDangerOn: { backgroundColor: "#FF5252" },
});
