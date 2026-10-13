import React from "react";
import { View } from "react-native";
import { useGameLayout } from "../layout/useGameLayout";
import { useT } from "../../i18n/useT";
import { PadButton } from "./DirectionPad";

type Props = { onAttack: () => void };

/**
 * The attack button on its own column, opposite the direction pad (one thumb moves, the other shoots).
 * Renders nothing when the attack button lives in the middle of the pad instead.
 */
const AttackPanel: React.FC<Props> = ({ onAttack }) => {
  const { t } = useT();
  const { splitAttack, attackPanelWidth, attackSize } = useGameLayout();
  if (!splitAttack) return null;
  return (
    <View style={{ width: attackPanelWidth, justifyContent: "center", alignItems: "center" }}>
      <PadButton size={attackSize} icon="flash" label={t("a11y.attack")} variant="attack" onPress={onAttack} />
    </View>
  );
};

export default AttackPanel;
