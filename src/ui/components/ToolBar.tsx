import React, { memo } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Text from "./Text";
import { haptic } from "../../shared/haptics";
import { useT } from "../../i18n/useT";
import type { AbilityId } from "../../core/engine/abilities";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

export const ABILITY_ICONS: Record<AbilityId, IconName> = {
  scout: "eye",
  volley: "flash",
  brace: "shield-checkmark",
  magnet: "magnet",
};

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
  icon: IconName;
  color: string;
  size: number;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  /** Small number over the button (cooldown or item count). */
  badge?: string;
  /** Fill the ring to show a recharge in progress (0..1). */
  dim?: boolean;
};

const ToolButton = ({ icon, color, size, label, onPress, disabled, badge, dim }: ButtonProps) => (
  <TouchableOpacity
    onPress={() => {
      haptic.impact();
      onPress();
    }}
    disabled={disabled}
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
    <Ionicons name={icon} size={size * 0.5} color={dim ? "rgba(255,255,255,0.55)" : color} />
    {badge ? (
      <View style={[styles.badge, { backgroundColor: dim ? "#455a64" : color }]}>
        <Text style={styles.badgeText} allowFontScaling={false}>
          {badge}
        </Text>
      </View>
    ) : null}
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
          icon={ABILITY_ICONS[ability]}
          color="#FFD54F"
          size={size}
          label={`${abilityName}. ${abilityCd > 0 ? t("tool.cooldown", { name: abilityName, n: abilityCd }) : t("tool.ready", { name: abilityName })}. ${t(`ability.${ability}.desc`)}`}
          onPress={onAbility}
          disabled={abilityCd > 0}
          dim={abilityCd > 0}
          badge={abilityCd > 0 ? String(abilityCd) : undefined}
        />
      )}
      {detector > 0 && (
        <ToolButton
          icon="radio"
          color="#4FC3F7"
          size={size}
          label={`${t("tool.count", { name: t("tool.detector.name"), count: detector })}. ${t("tool.detector.desc")}`}
          onPress={onDetector}
          badge={String(detector)}
        />
      )}
      {bomb > 0 && (
        <ToolButton
          icon="flame"
          color="#FF7043"
          size={size}
          label={`${t("tool.count", { name: t("tool.bomb.name"), count: bomb })}. ${t("tool.bomb.desc")}`}
          onPress={onBomb}
          badge={String(bomb)}
        />
      )}
      {canUndo && (
        <ToolButton
          icon="arrow-undo"
          color="#CE93D8"
          size={size}
          label={`${t("tool.undo.name")}. ${t("tool.undo.desc")}`}
          onPress={onUndo}
        />
      )}
    </View>
  );
});

export default ToolBar;

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 8, justifyContent: "center", alignItems: "center", flexWrap: "wrap" },
  button: {
    backgroundColor: "rgba(20,12,40,0.82)",
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  dim: { backgroundColor: "rgba(20,12,40,0.6)" },
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
  badgeText: { color: "#1a1030", fontSize: 11, fontWeight: "900" },
});
