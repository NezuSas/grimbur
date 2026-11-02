import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import Text from "../../ui/components/Text";
import SpriteImage from "../../ui/components/SpriteImage";
import type { TranslationKey } from "../../i18n/en";
import { ENCOUNTERS } from "../../core/engine/encounters";
import { EMPTY_ENCOUNTER_BOOK, type EncounterBook } from "../../core/stats/encounterBook";
import { getLocalStats, peekLocalStats } from "../../services/localStats";
import { ENCOUNTER_ART, ENCOUNTER_PARAMS, ENCOUNTER_TINT } from "../../ui/components/game/EncounterModal";
import type { Kit } from "./kit";

/**
 * The encounter journal: every scene of the cave. The ones met show their picture and story; the others are a dark shape.
 */
export const EncountersPane = ({ kit }: { kit: Kit }) => {
  const { t, heading, wide } = kit;
  const [book, setBook] = useState<EncounterBook>(() => peekLocalStats()?.encounterBook ?? EMPTY_ENCOUNTER_BOOK);
  useEffect(() => {
    void getLocalStats().then(s => setBook(s.encounterBook ?? EMPTY_ENCOUNTER_BOOK)).catch(() => {});
  }, []);

  return (
    <>
      {heading(t("manual.encounters.title"))}
      <Text style={styles.progress} maxFontSizeMultiplier={1.2}>
        {t("encounters.progress", { n: book.seen.length, total: ENCOUNTERS.length })}
      </Text>
      <View style={styles.grid}>
        {ENCOUNTERS.map(id => {
          const known = book.seen.includes(id);
          const tint = ENCOUNTER_TINT[id];
          const title = t(`encounter.${id}.title` as TranslationKey);
          return (
            <View key={id} style={[styles.card, { width: wide ? "48.5%" : "100%", borderColor: known ? tint + "88" : "rgba(255,255,255,0.08)" }]} accessible accessibilityLabel={known ? title : t("encounters.unknown")}>
              <View style={[styles.well, { backgroundColor: known ? tint + "1F" : "rgba(0,0,0,0.35)" }]}>
                <SpriteImage source={ENCOUNTER_ART[id]} style={[styles.art, !known && styles.shadow]} resizeMode="contain" />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[styles.name, { color: known ? tint : "#7d6a58" }]} numberOfLines={1} maxFontSizeMultiplier={1.15}>
                  {known ? title : "???"}
                </Text>
                <Text style={styles.lore} numberOfLines={4} maxFontSizeMultiplier={1.15}>
                  {known ? t(`encounter.${id}.body` as TranslationKey, ENCOUNTER_PARAMS) : t("encounters.unknown")}
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
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  card: { flexDirection: "row", alignItems: "center", gap: 10, padding: 10, borderRadius: 14, borderWidth: 1.5, backgroundColor: "rgba(34,26,18,0.9)" },
  well: { width: 70, height: 70, borderRadius: 35, alignItems: "center", justifyContent: "center" },
  art: { width: 62, height: 62 },
  shadow: { tintColor: "#4A3828", opacity: 1 },
  name: { fontWeight: "900", fontSize: 14 },
  lore: { color: "#D9C8B5", fontSize: 11.5, lineHeight: 16 },
});
