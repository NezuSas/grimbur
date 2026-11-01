import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import type { ImageSourcePropType } from "react-native";
import Text from "../../ui/components/Text";
import SpriteImage from "../../ui/components/SpriteImage";
import type { TranslationKey } from "../../i18n/en";
import { BEASTS, EMPTY_BESTIARY, SLAYABLE, type BeastId, type Bestiary } from "../../core/stats/bestiary";
import { getLocalStats, peekLocalStats } from "../../services/localStats";
import type { Kit } from "./kit";

const ART: Record<BeastId, ImageSourcePropType> = {
  enemy: require("../../assets/sprites/enemies/Guardian_Enemy.png"),
  stalker: require("../../assets/sprites/enemies/Stalker_Enemy.png"),
  sleeper: require("../../assets/sprites/enemies/Sleeper_Enemy.png"),
  mimic: require("../../assets/sprites/enemies/Mimic_Enemy.png"),
  thief: require("../../assets/sprites/enemies/Thief_Enemy.png"),
  brute: require("../../assets/sprites/enemies/Lieutenant_Boss.png"),
  boss: require("../../assets/sprites/enemies/Grimbur_Boss.png"),
  pit: require("../../assets/sprites/tiles/Danger_Vortex.png"),
  trap: require("../../assets/sprites/tiles/Trap_Sprung.png"),
  chest: require("../../assets/sprites/items/Icon_Chest.png"),
};
const TINT: Record<BeastId, string> = {
  enemy: "#FF8A65", stalker: "#B388FF", sleeper: "#80CBC4", mimic: "#4FC3F7", thief: "#FFD54F",
  brute: "#FF7043", boss: "#FF5252", pit: "#CE93D8", trap: "#BCAAA4", chest: "#FFCA28",
};

/**
 * The bestiary: every creature and danger of the cave. Those not met yet are a dark shape and "???"; the met ones show their
 * art, a line of lore and how many were defeated (caught, for the thief) over all runs.
 */
export const BestiaryPane = ({ kit }: { kit: Kit }) => {
  const { t, heading, wide } = kit;
  const [book, setBook] = useState<Bestiary>(() => peekLocalStats()?.bestiary ?? EMPTY_BESTIARY);
  useEffect(() => {
    void getLocalStats().then(s => setBook(s.bestiary ?? EMPTY_BESTIARY)).catch(() => {});
  }, []);
  const found = BEASTS.filter(b => book.met.includes(b)).length;

  return (
    <>
      {heading(t("manual.bestiary.title"))}
      <Text style={styles.progress} maxFontSizeMultiplier={1.2}>
        {t("bestiary.progress", { n: found, total: BEASTS.length })}
      </Text>
      <View style={styles.grid}>
        {BEASTS.map(b => {
          const known = book.met.includes(b);
          const slain = book.slain[b] ?? 0;
          const tint = TINT[b];
          return (
            <View key={b} style={[styles.card, { width: wide ? "31.5%" : "47%", borderColor: known ? tint + "88" : "rgba(255,255,255,0.08)" }]} accessible accessibilityLabel={known ? `${t(`bestiary.${b}.name` as TranslationKey)}. ${t(`bestiary.${b}.lore` as TranslationKey)}` : t("bestiary.unknown")}>
              <View style={[styles.well, { backgroundColor: known ? tint + "1F" : "rgba(0,0,0,0.35)" }]}>
                <SpriteImage source={ART[b]} style={[styles.art, !known && styles.shadow]} resizeMode="contain" />
              </View>
              <Text style={[styles.name, { color: known ? tint : "#7d6a58" }]} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.15}>
                {known ? t(`bestiary.${b}.name` as TranslationKey) : "???"}
              </Text>
              <Text style={styles.lore} numberOfLines={3} maxFontSizeMultiplier={1.15}>
                {known ? t(`bestiary.${b}.lore` as TranslationKey) : t("bestiary.unknown")}
              </Text>
              {known && SLAYABLE.includes(b) ? (
                <Text style={[styles.count, { color: tint }]} maxFontSizeMultiplier={1.1}>
                  {t(b === "thief" ? "bestiary.caught" : "bestiary.slain", { n: slain })}
                </Text>
              ) : null}
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
  card: { alignItems: "center", gap: 3, padding: 8, borderRadius: 14, borderWidth: 1.5, backgroundColor: "rgba(34,26,18,0.9)" },
  well: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center" },
  art: { width: 56, height: 56 },
  shadow: { tintColor: "#4A3828", opacity: 1 },
  name: { fontWeight: "900", fontSize: 14 },
  lore: { color: "#D9C8B5", fontSize: 11.5, textAlign: "center", minHeight: 30 },
  count: { fontWeight: "900", fontSize: 12 },
});
