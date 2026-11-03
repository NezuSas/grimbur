import React, { memo } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import Text from "./Text";
import KeyHint from "./KeyHint";
import type { KeyAction } from "../../core/input/keyBindings";
import { haptic } from "../../shared/haptics";
import { useT } from "../../i18n/useT";
import { MIN_TOUCH } from "../layout/useGameLayout";
import type { AbilityId } from "../../core/engine/abilities";
import type { ImageSourcePropType } from "react-native";
import SpriteImage from "./SpriteImage";
import { ABILITY_ART, TOOL_ART } from "../toolArt";

type Props = {
  ability: AbilityId | null;
  /** Actions until the ability is ready (0 = ready). */
  abilityCd: number;
  detector: number;
  bomb: number;
  canUndo: boolean;
  onAbility: () => void;
  onDetector: () => void;
  onBomb: () => void;
  onUndo: () => void;
  /** Button diameter in dp. */
  size: number;
};

type ButtonProps = {
  art: ImageSourcePropType;
  color: string;
  size: number;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  /** Small number over the button (cooldown or item count). */
  badge?: string;
  /** Fill the ring to show a recharge in progress (0..1). */
  dim?: boolean;
  /** Its key on a computer. */
  hotkey?: KeyAction;
};

/** Extra touch area so a small button still reaches the minimum touch size. */
const HIT_PAD = (size: number) => Math.max(0, (MIN_TOUCH - size) / 2);

const ToolButton = ({ art, color, size, label, onPress, disabled, badge, dim, hotkey }: ButtonProps) => (
  <TouchableOpacity
    onPress={() => {
      haptic.impact();
      onPress();
    }}
    disabled={disabled}
    hitSlop={{ top: HIT_PAD(size), bottom: HIT_PAD(size), left: HIT_PAD(size), right: HIT_PAD(size) }}
    activeOpacity={0.75}
    accessibilityRole="button"
    accessibilityLabel={label}
    accessibilityState={{ disabled: !!disabled }}
    style={[
      styles.button,
      { width: size, height: size, borderRadius: size / 2, borderColor: dim ? "rgba(255,255,255,0.25)" : color },
      dim && styles.dim,
    ]}
  >
    {/* The picture has its own golden rim: it fills the round button and fades while recharging. */}
    <SpriteImage source={art} style={{ width: size * 0.8, height: size * 0.8, opacity: dim ? 0.4 : 1 }} resizeMode="contain" accessibilityIgnoresInvertColors />
    {badge ? (
      <View style={[styles.badge, { backgroundColor: dim ? "#455a64" : color }]}>
        <Text style={styles.badgeText} allowFontScaling={false}>
          {badge}
        </Text>
      </View>
    ) : null}
    {hotkey ? <KeyHint action={hotkey} /> : null}
  </TouchableOpacity>
);

/** The hero's ability, the one-use items and the undo, as a row of round buttons above the pad. */
const ToolBar: React.FC<Props> = memo(({ ability, abilityCd, detector, bomb, canUndo, onAbility, onDetector, onBomb, onUndo, size }) => {
  const { t } = useT();
  const abilityName = ability ? t(`ability.${ability}.name`) : "";
  if (!ability && detector === 0 && bomb === 0 && !canUndo) return null;
  return (
    <View style={styles.row}>
      {ability && (
        <ToolButton
          art={ABILITY_ART[ability]}
          color="#D9B45A"
          size={size}
          label={`${abilityName}. ${abilityCd > 0 ? t("tool.cooldown", { name: abilityName, n: abilityCd }) : t("tool.ready", { name: abilityName })}. ${t(`ability.${ability}.desc`)}`}
          onPress={onAbility}
          hotkey="ability"
          disabled={abilityCd > 0}
          dim={abilityCd > 0}
          badge={abilityCd > 0 ? String(abilityCd) : undefined}
        />
      )}
      {detector > 0 && (
        <ToolButton
          art={TOOL_ART.detector}
          color="#7FAFC6"
          size={size}
          label={`${t("tool.count", { name: t("tool.detector.name"), count: detector })}. ${t("tool.detector.desc")}`}
          onPress={onDetector}
          badge={String(detector)}
        />
      )}
      {bomb > 0 && (
        <ToolButton
          art={TOOL_ART.bomb}
          color="#CC6E44"
          size={size}
          label={`${t("tool.count", { name: t("tool.bomb.name"), count: bomb })}. ${t("tool.bomb.desc")}`}
          onPress={onBomb}
          badge={String(bomb)}
        />
      )}
      {canUndo && (
        <ToolButton
          art={TOOL_ART.undo}
          color="#B08DBE"
          size={size}
          label={`${t("tool.undo.name")}. ${t("tool.undo.desc")}`}
          onPress={onUndo}
          hotkey="undo"
        />
      )}
    </View>
  );
});

export default ToolBar;

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 6, justifyContent: "center", alignItems: "center", flexWrap: "wrap" },
  button: {
    backgroundColor: "rgba(28, 19, 11,0.82)",
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  dim: { backgroundColor: "rgba(28, 19, 11,0.6)" },
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { color: "#2A2016", fontSize: 11, fontWeight: "900" },
});
