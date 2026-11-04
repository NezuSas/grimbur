import React, { useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import GameIcon from "../../ui/components/GameIcon";
import Text from "../../ui/components/Text";
import { useT } from "../../i18n/useT";
import type { TranslationKey } from "../../i18n/en";

const TINT = "#C9A55A";
const STEPS: { icon: React.ComponentProps<typeof Ionicons>["name"]; key: TranslationKey }[] = [
  { icon: "footsteps", key: "puzzle.guide.walk" },
  { icon: "pulse", key: "puzzle.guide.clues" },
  { icon: "flag", key: "puzzle.guide.marks" },
  { icon: "bulb", key: "puzzle.guide.hint" },
];

/**
 * The first puzzle a player meets explains itself on the board, in four short steps (walking, reading the clues, the flag and
 * the notes, the hint). It sits low over the board and never blocks a tap; it can be skipped, and it is shown only once.
 */
export default function PuzzleGuide({ onDone }: { onDone: () => void }) {
  const { t } = useT();
  const [step, setStep] = useState(0);
  const last = step === STEPS.length - 1;
  const s = STEPS[step];
  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <View style={styles.card} accessibilityLiveRegion="polite">
        <View style={styles.icon}>
          <GameIcon name={s.icon} size={20} color="#14101F" />
        </View>
        <Text style={styles.text} numberOfLines={4} adjustsFontSizeToFit minimumFontScale={0.75} maxFontSizeMultiplier={1.15}>
          {t(s.key)}
        </Text>
        <View style={styles.side}>
          <View style={styles.dots}>
            {STEPS.map((_, k) => (
              <View key={k} style={[styles.dot, k === step && styles.dotOn]} />
            ))}
          </View>
          <TouchableOpacity onPress={() => (last ? onDone() : setStep(step + 1))} style={styles.next} accessibilityRole="button" accessibilityLabel={last ? t("puzzle.guide.done") : t("puzzle.guide.next")}>
            <Text style={styles.nextText} maxFontSizeMultiplier={1.1}>
              {(last ? t("puzzle.guide.done") : t("puzzle.guide.next")).toLocaleUpperCase()}
            </Text>
          </TouchableOpacity>
          {!last ? (
            <TouchableOpacity onPress={onDone} hitSlop={6} accessibilityRole="button" accessibilityLabel={t("puzzle.guide.skip")}>
              <Text style={styles.skip} maxFontSizeMultiplier={1.1}>
                {t("puzzle.guide.skip")}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: 0, right: 0, bottom: 10, alignItems: "flex-start", paddingLeft: 16, zIndex: 950 },
  card: { flexDirection: "row", alignItems: "center", gap: 10, maxWidth: 520, padding: 10, borderRadius: 16, borderWidth: 1.5, borderColor: TINT, backgroundColor: "rgba(20,14,8,0.94)" },
  icon: { width: 34, height: 34, borderRadius: 17, backgroundColor: TINT, alignItems: "center", justifyContent: "center" },
  text: { flex: 1, color: "#FFF3E0", fontWeight: "700", fontSize: 13, lineHeight: 18 },
  side: { alignItems: "center", gap: 5 },
  dots: { flexDirection: "row", gap: 3 },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.25)" },
  dotOn: { backgroundColor: TINT, width: 12 },
  next: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: TINT },
  nextText: { color: "#14101F", fontWeight: "900", fontSize: 11, letterSpacing: 1 },
  skip: { color: "#bfb3a6", fontSize: 10.5, fontWeight: "800", textDecorationLine: "underline" },
});
