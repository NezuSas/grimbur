import React from "react";
import { View } from "react-native";
import { useGameLayout } from "../layout/useGameLayout";
import { useT } from "../../i18n/useT";
import { AttackButton } from "./DirectionPad";

type Props = { onAttack: () => void; arrows: number };

/**
 * The attack button on its own column, opposite the direction pad (one thumb moves, the other shoots).
 * Renders nothing when the attack button lives in the middle of the pad instead.
 */
const AttackPanel: React.FC<Props> = ({ onAttack, arrows }) => {
  const { t } = useT();
  const { splitAttack, attackPanelWidth, attackSize } = useGameLayout();
  if (!splitAttack) return null;
  return (
    <View style={{ width: attackPanelWidth, alignSelf: "stretch", justifyContent: "flex-end", alignItems: "center", paddingBottom: 10 }}>
      <AttackButton
        size={attackSize}
        arrows={arrows}
        label={`${t("a11y.attack")}. ${t("a11y.arrowsLeft", { count: arrows })}`}
        onPress={onAttack}
      />
    </View>
  );
};

export default AttackPanel;
