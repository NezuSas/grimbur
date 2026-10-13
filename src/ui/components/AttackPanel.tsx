import React from "react";
import { View } from "react-native";
import { useGameLayout } from "../layout/useGameLayout";
import { useT } from "../../i18n/useT";
import { AttackButton } from "./DirectionPad";
import RelicTray from "./RelicTray";
import type { RelicId } from "../../core/engine/relics";
import type { Direction } from "../../core/engine/types";

type Props = {
  onAttack: (direction?: Direction) => void;
  onAim?: (aim: Direction | "facing" | null) => void;
  arrows: number;
  relics?: readonly RelicId[];
  relicsLabel?: string;
};

/**
 * The attack button on its own column, opposite the direction pad (one thumb moves, the other shoots).
 * Renders nothing when the attack button lives in the middle of the pad instead.
 */
const AttackPanel: React.FC<Props> = ({ onAttack, onAim, arrows, relics, relicsLabel }) => {
  const { t } = useT();
  const { splitAttack, attackPanelWidth, attackSize } = useGameLayout();
  if (!splitAttack) return null;
  return (
    <View style={{ width: attackPanelWidth, alignSelf: "stretch", justifyContent: "flex-end", alignItems: "center", paddingBottom: 10 }}>
      {relics && relics.length > 0 && (
        <View style={{ position: "absolute", top: 4, left: 0, right: 0, alignItems: "center" }}>
          <RelicTray relics={relics} size={Math.max(26, Math.min(attackPanelWidth * 0.38, 40))} label={relicsLabel ?? ""} />
        </View>
      )}
      <AttackButton
        size={attackSize}
        arrows={arrows}
        label={`${t("a11y.attack")}. ${t("a11y.arrowsLeft", { count: arrows })}`}
        onAttack={onAttack}
        onAim={onAim}
      />
    </View>
  );
};

export default AttackPanel;
