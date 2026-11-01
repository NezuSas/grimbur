import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import Text from "../../ui/components/Text";
import SpriteImage from "../../ui/components/SpriteImage";
import type { TranslationKey } from "../../i18n/en";
import { ALL_RELICS, RELICS, RELIC_FAMILY } from "../../core/engine/relics";
import { EMPTY_RELIC_BOOK, type RelicBook } from "../../core/stats/runLog";
import { getLocalStats, peekLocalStats } from "../../services/localStats";
import { RELIC_IMAGES } from "../../ui/relicImages";
import { FAMILY_COLOR } from "../../ui/familyLook";
import type { Kit } from "./kit";

const CURSED = "#FF6E6E";
const GOLD = "#FFCA28";

/**
 * The relic book: every relic of the game. The ones never picked are a dark shape and "???"; the picked ones show their
 * name, family and how many runs took them and how many of those were won.
 */
export const RelicBookPane = ({ kit }: { kit: Kit }) => {
  const { t, heading, wide } = kit;
  const [book, setBook] = useState<RelicBook>(() => peekLocalStats()?.relicBook ?? EMPTY_RELIC_BOOK);
  useEffect(() => {
    void getLocalStats().then(s => setBook(s.relicBook ?? EMPTY_RELIC_BOOK)).catch(() => {});
  }, []);
  // Normal relics first, then the cursed ones; within each, the most picked first and the unknown last.
  const order = [...ALL_RELICS].sort((a, b) => Number(!!RELICS[a].cursed) - Number(!!RELICS[b].cursed) || (book.picks[b] ?? 0) - (book.picks[a] ?? 0));
  const found = ALL_RELICS.filter(r => (book.picks[r] ?? 0) > 0).length;

  return (
    <>
      {heading(t("manual.relicbook.title"))}
      <Text style={styles.progress} maxFontSizeMultiplier={1.2}>
        {t("relicbook.progress", { n: found, total: ALL_RELICS.length })}
      </Text>
      <View style={styles.grid}>
        {order.map(r => {
          const picks = book.picks[r] ?? 0;
          const wins = book.wins[r] ?? 0;
          const known = picks > 0;
          const family = RELIC_FAMILY[r];
          const tint = RELICS[r].cursed ? CURSED : family ? FAMILY_COLOR[family] : GOLD;
          const name = t(`relic.${r}.name` as TranslationKey);
          return (
            <View
              key={r}
              style={[styles.card, { width: wide ? "23.5%" : "31.5%", borderColor: known ? tint + "88" : "rgba(255,255,255,0.08)" }]}
              accessible
              accessibilityLabel={known ? `${name}. ${t("relicbook.picks", { n: picks })}. ${t("relicbook.wins", { n: wins })}` : t("relicbook.unknown")}
            >
              <View style={[styles.well, { backgroundColor: known ? tint + "1F" : "rgba(0,0,0,0.35)" }]}>
                <SpriteImage source={RELIC_IMAGES[r]} style={[styles.art, !known && styles.shadow]} resizeMode="contain" />
              </View>
              <Text style={[styles.name, { color: known ? tint : "#7d6a58" }]} numberOfLines={2} maxFontSizeMultiplier={1.1}>
                {known ? name : "???"}
              </Text>
              {known ? (
                <>
                  {family ? (
                    <Text style={[styles.family, { color: tint }]} numberOfLines={1} maxFontSizeMultiplier={1.1}>
                      {t(`family.${family}.name` as TranslationKey).toLocaleUpperCase()}
                    </Text>
                  ) : RELICS[r].cursed ? (
                    <Text style={[styles.family, { color: CURSED }]} numberOfLines={1} maxFontSizeMultiplier={1.1}>
                      {t("relicbook.cursed").toLocaleUpperCase()}
                    </Text>
                  ) : null}
                  <Text style={styles.count} numberOfLines={1} maxFontSizeMultiplier={1.1}>
                    {t("relicbook.picks", { n: picks })}
                  </Text>
                  <Text style={[styles.count, { color: wins > 0 ? "#9EE37D" : "#A8927D" }]} numberOfLines={1} maxFontSizeMultiplier={1.1}>
                    {t("relicbook.wins", { n: wins })}
                  </Text>
                </>
              ) : (
                <Text style={styles.hint} numberOfLines={2} maxFontSizeMultiplier={1.1}>
                  {t("relicbook.unknown")}
                </Text>
              )}
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
  card: { alignItems: "center", gap: 2, padding: 8, borderRadius: 14, borderWidth: 1.5, backgroundColor: "rgba(34,26,18,0.9)" },
  well: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  art: { width: 46, height: 46 },
  shadow: { tintColor: "#4A3828", opacity: 1 },
  name: { fontWeight: "900", fontSize: 12.5, textAlign: "center", minHeight: 30 },
  family: { fontWeight: "900", fontSize: 10, letterSpacing: 1 },
  count: { color: "#E6D6C4", fontWeight: "800", fontSize: 11 },
  hint: { color: "#8C7560", fontSize: 10.5, textAlign: "center" },
});
