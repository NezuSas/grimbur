import React from "react";
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from "react-native";
import Text from "./Text";
import EmberIcon from "./EmberIcon";
import { useGameLayout } from "../layout/useGameLayout";
import { useT } from "../../i18n/useT";
import { AttackButton } from "./DirectionPad";
import RelicTray from "./RelicTray";
import { trayCapacity } from "./relicStacks";
import type { RelicId } from "../../core/engine/relics";
import type { Direction } from "../../core/engine/types";
import type { WeaponId } from "../../core/engine/weapons";
import { attackLabel, weaponLine } from "../../i18n/weaponText";

type Props = {
  onAttack: (direction?: Direction) => void;
  onAim?: (aim: Direction | "facing" | null) => void;
  arrows: number;
  relics?: readonly RelicId[];
  relicsLabel?: string;
  /** Arrows for embers, offered while the hero has none left (its price and pack size). */
  refill?: { show: boolean; price: number; arrows: number; busy: boolean; onBuy: () => void };
  /** What the hero shoots (weaponOf(state)); the bow when missing (tutorial, lessons). */
  weapon?: WeaponId;
};

/**
 * The attack button on its own column, opposite the direction pad (one thumb moves, the other shoots).
 * Renders nothing when the attack button lives in the middle of the pad instead.
 */
const AttackPanel: React.FC<Props> = ({ onAttack, onAim, arrows, relics, relicsLabel, refill, weapon = "bow" }) => {
  const { t } = useT();
  const { splitAttack, attackPanelWidth, attackSize, screenHeight, hudHeight, insets } = useGameLayout();
  if (!splitAttack) return null;
  // The relics get the column above the attack button and the arrow offer that floats over it (56dp), never more.
  const relicSize = Math.max(26, Math.min(attackPanelWidth * 0.38, 40));
  const relicRoom = screenHeight - hudHeight - insets.top - insets.bottom - attackSize - 10 - 56 - 4 - 6;
  return (
    <View style={{ width: attackPanelWidth, alignSelf: "stretch", justifyContent: "flex-end", alignItems: "center", paddingBottom: 10 }}>
      {relics && relics.length > 0 && (
        <View style={{ position: "absolute", top: 4, left: 0, right: 0, alignItems: "center" }}>
          <RelicTray relics={relics} size={relicSize} label={relicsLabel ?? ""} max={Math.min(6, trayCapacity(attackPanelWidth, relicRoom, relicSize))} details weapon={weapon} />
        </View>
      )}
      <View>
        {refill?.show ? (
          <TouchableOpacity
            style={styles.refill}
            onPress={refill.onBuy}
            disabled={refill.busy}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={weaponLine(t, "refill.a11y", weapon, { n: refill.arrows, price: refill.price })}
          >
            {refill.busy ? (
              <ActivityIndicator size="small" color="#1a1200" />
            ) : (
              <Text style={styles.refillText} numberOfLines={2} maxFontSizeMultiplier={1.1}>
                {weaponLine(t, "refill.chip", weapon, { n: refill.arrows })}
                {"\n"}<EmberIcon size={12} /> {refill.price}
              </Text>
            )}
          </TouchableOpacity>
        ) : null}
        <AttackButton
          size={attackSize}
          arrows={arrows}
          weapon={weapon}
          label={attackLabel(t, weapon, arrows)}
          onAttack={onAttack}
          onAim={onAim}
        />
      </View>
    </View>
  );
};

export default AttackPanel;

const styles = StyleSheet.create({
  // Floats above the button so that it never moves when the offer comes and goes.
  refill: { position: "absolute", top: -56, alignSelf: "center", minHeight: 50, minWidth: 84, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 16, backgroundColor: "#C48B4E", borderWidth: 2, borderColor: "rgba(255,255,255,0.5)", alignItems: "center", justifyContent: "center", zIndex: 5 },
  refillText: { color: "#1a1200", fontWeight: "900", fontSize: 13, textAlign: "center", lineHeight: 17 },
});
