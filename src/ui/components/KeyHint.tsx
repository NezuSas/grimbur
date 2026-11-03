import React from "react";
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { isTouchWeb } from "../web/webScreen";
import Text from "./Text";
import { useT } from "../../i18n/useT";
import { useSettingsStore } from "../../state/settings/store";
import { keyCap, keyOf, type KeyAction } from "../../core/input/keyBindings";

type Props = {
  /** The action whose key to show (the player's own key); or `text` for a fixed key such as Enter. */
  action?: KeyAction;
  text?: string;
  /** Where it sits on its button (absolute; top-left by default). */
  style?: StyleProp<ViewStyle>;
};

/**
 * A small keycap on a button, on a computer only: the key that does the same (the player's choice, from Settings), so the
 * keyboard is learned by playing. Never on a phone.
 */
export default function KeyHint({ action, text, style }: Props) {
  const { t } = useT();
  const bindings = useSettingsStore(s => s.keyBindings);
  if (Platform.OS !== "web" || isTouchWeb()) return null;
  const label = text ?? (action ? keyCap(keyOf(bindings, action), t("settings.keys.spaceShort")) : "");
  if (!label) return null;
  return (
    <View pointerEvents="none" style={[styles.cap, style]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Text style={styles.text} allowFontScaling={false}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  cap: {
    position: "absolute",
    top: -6,
    left: -6,
    minWidth: 18,
    paddingHorizontal: 4,
    height: 18,
    borderRadius: 5,
    borderWidth: 1,
    borderBottomWidth: 2,
    borderColor: "rgba(255,255,255,0.55)",
    backgroundColor: "rgba(20,14,10,0.92)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 5,
  },
  text: { color: "#FFF3E0", fontWeight: "900", fontSize: 10, lineHeight: 12 },
});
