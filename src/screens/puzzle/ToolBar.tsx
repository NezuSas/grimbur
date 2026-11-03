import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Text from "../../ui/components/Text";
import { useT } from "../../i18n/useT";
import KeyHint from "../../ui/components/KeyHint";
import type { KeyAction } from "../../core/input/keyBindings";

export type PuzzleTool = "walk" | "flag" | "note";

const TOOLS: { id: PuzzleTool; icon: React.ComponentProps<typeof Ionicons>["name"]; key: string; hotkey?: KeyAction }[] = [
  { id: "walk", icon: "footsteps", key: "puzzle.tool.walk" },
  { id: "flag", icon: "flag", key: "puzzle.tool.flag", hotkey: "flag" },
  { id: "note", icon: "pencil", key: "puzzle.tool.note", hotkey: "note" },
];

/**
 * What a tap on the board does: walk there, plant or lift a flag (a danger), or pencil a note (safe, not a guardian, not a
 * vortex, in turn). A long press still flags whatever the tool.
 */
export default function ToolBar({ tool, onChange }: { tool: PuzzleTool; onChange: (tool: PuzzleTool) => void }) {
  const { t } = useT();
  return (
    <View style={styles.bar} accessibilityRole="radiogroup">
      {TOOLS.map(x => {
        const on = x.id === tool;
        return (
          <TouchableOpacity
            key={x.id}
            onPress={() => onChange(x.id)}
            style={[styles.tool, on && styles.toolOn]}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            accessibilityLabel={t(x.key as never)}
            hitSlop={4}
          >
            <Ionicons name={x.icon} size={17} color={on ? "#14101F" : "#E6D6C2"} />
            <Text style={[styles.label, on && { color: "#14101F" }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} maxFontSizeMultiplier={1}>
              {t(x.key as never)}
            </Text>
            {x.hotkey ? <KeyHint action={x.hotkey} style={{ top: -7, left: -4 }} /> : null}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: "row", gap: 4, padding: 3, borderRadius: 14, backgroundColor: "rgba(0,0,0,0.5)", borderWidth: 1, borderColor: "rgba(255,255,255,0.16)" },
  tool: { width: 50, alignItems: "center", gap: 1, paddingVertical: 4, borderRadius: 11 },
  toolOn: { backgroundColor: "#FFD54F" },
  label: { color: "#bfb3a6", fontWeight: "900", fontSize: 9, letterSpacing: 0.3 },
});
