import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import Text from "../../ui/components/Text";
import type { TranslationKey } from "../../i18n/en";
import { CHRONICLE_COUNT, chronicleCount } from "../../core/stats/chronicle";
import { getLocalStats, peekLocalStats } from "../../services/localStats";
import type { Kit } from "./kit";

const INK = "#E8C07D";

/**
 * The Grimbur's chronicle: twelve fragments of the cave's story, one unveiled by each secret room found. The ones not found yet
 * are a sealed page that says how to open it.
 */
export const ChroniclePane = ({ kit }: { kit: Kit }) => {
  const { t, heading } = kit;
  const [read, setRead] = useState(() => chronicleCount(peekLocalStats() ?? { secretsFound: 0 }));
  useEffect(() => {
    void getLocalStats().then(s => setRead(chronicleCount(s))).catch(() => {});
  }, []);

  return (
    <>
      {heading(t("manual.chronicle.title"))}
      <Text style={styles.progress} maxFontSizeMultiplier={1.2}>
        {t("chronicle.progress", { n: read, total: CHRONICLE_COUNT })}
      </Text>
      <View style={styles.list}>
        {Array.from({ length: CHRONICLE_COUNT }, (_, i) => {
          const n = i + 1;
          const open = n <= read;
          return (
            <View key={n} style={[styles.page, !open && styles.sealed]} accessible accessibilityLabel={open ? `${t(`chronicle.${n}.title` as TranslationKey)}. ${t(`chronicle.${n}.body` as TranslationKey)}` : t("chronicle.sealed")}>
              <Text style={[styles.number, { color: open ? INK : "#6d5a48" }]} maxFontSizeMultiplier={1.1}>
                {String(n).padStart(2, "0")}
              </Text>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[styles.title, { color: open ? INK : "#7d6a58" }]} maxFontSizeMultiplier={1.15}>
                  {open ? t(`chronicle.${n}.title` as TranslationKey) : "???"}
                </Text>
                <Text style={[styles.body, !open && styles.bodySealed]} maxFontSizeMultiplier={1.15}>
                  {open ? t(`chronicle.${n}.body` as TranslationKey) : t("chronicle.sealed")}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  progress: { color: "#C2A88F", fontSize: 13, fontWeight: "700", marginBottom: 6 },
  list: { gap: 8 },
  page: { flexDirection: "row", gap: 12, padding: 12, borderRadius: 14, borderWidth: 1.5, borderColor: INK + "66", backgroundColor: "rgba(52,38,22,0.9)" },
  sealed: { borderColor: "rgba(255,255,255,0.08)", backgroundColor: "rgba(26,20,14,0.9)" },
  number: { fontSize: 22, fontWeight: "900", minWidth: 32 },
  title: { fontSize: 15, fontWeight: "900" },
  body: { color: "#E6D6C2", fontSize: 13, lineHeight: 19, fontStyle: "italic" },
  bodySealed: { color: "#8a7663", fontStyle: "normal" },
});
