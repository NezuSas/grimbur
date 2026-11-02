import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Text from "../../ui/components/Text";
import SpriteImage from "../../ui/components/SpriteImage";
import { TECHNIQUES, type TechniqueId } from "../../core/puzzles/techniques";
import { asKey } from "./kit";
import type { Kit } from "./kit";

const TINT = "#4DD0E1";
const ART: Record<TechniqueId, ReturnType<typeof require>> = {
  quiet: require("../../assets/sprites/tiles/Tile_Hidden.png"),
  cornered: require("../../assets/sprites/ui/Icon_Flag.png"),
  full: require("../../assets/sprites/ui/Clue_Guardian.png"),
  typed: require("../../assets/sprites/ui/Clue_Vortex.png"),
};

/** The deduction techniques: what each move is, and a small board to practise it (played like a puzzle, without stars). */
export const TechniquesPane = ({ kit }: { kit: Kit }) => {
  const { t, wide, navigation, heading } = kit;
  return (
    <>
      {heading(t("manual.techniques.title"))}
      <Text style={styles.intro} maxFontSizeMultiplier={1.2}>
        {t("manual.techniques.intro")}
      </Text>
      <View style={[styles.list, wide && styles.listWide]}>
        {TECHNIQUES.map((x, i) => (
          <View key={x.id} style={[styles.card, wide && styles.cardWide]}>
            <View style={styles.head}>
              <View style={styles.number}>
                <Text style={styles.numberText}>{i + 1}</Text>
              </View>
              <SpriteImage source={ART[x.id]} style={styles.art} resizeMode="contain" accessibilityIgnoresInvertColors />
              <Text style={styles.name} numberOfLines={2} maxFontSizeMultiplier={1.2}>
                {t(asKey(`tech.${x.id}.name`))}
              </Text>
            </View>
            <Text style={styles.body} maxFontSizeMultiplier={1.2}>
              {t(asKey(`tech.${x.id}.body`))}
            </Text>
            <TouchableOpacity
              style={styles.button}
              onPress={() => navigation.navigate("PuzzleScreen", { target: "technique", tech: x.id })}
              accessibilityRole="button"
              accessibilityLabel={`${t("tech.practice")}: ${t(asKey(`tech.${x.id}.name`))}`}
            >
              <Ionicons name="play" size={16} color="#06262B" />
              <Text style={styles.buttonText} maxFontSizeMultiplier={1.2}>
                {t("tech.practice").toLocaleUpperCase()}
              </Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  intro: { color: "#E6D6C2", fontSize: 14, lineHeight: 20 },
  list: { gap: 12 },
  listWide: { flexDirection: "row", flexWrap: "wrap" },
  card: { gap: 8, padding: 12, borderRadius: 16, borderWidth: 1.5, borderColor: TINT + "66", backgroundColor: "rgba(0,0,0,0.35)" },
  cardWide: { width: "31.5%", flexGrow: 1 },
  head: { flexDirection: "row", alignItems: "center", gap: 8 },
  number: { width: 24, height: 24, borderRadius: 12, backgroundColor: TINT, alignItems: "center", justifyContent: "center" },
  numberText: { color: "#06262B", fontWeight: "900", fontSize: 13 },
  art: { width: 34, height: 34 },
  name: { flex: 1, color: TINT, fontWeight: "900", fontSize: 15 },
  body: { color: "#E6D6C2", fontSize: 13, lineHeight: 18, flexGrow: 1 },
  button: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, minHeight: 40, borderRadius: 12, backgroundColor: TINT, borderBottomWidth: 3, borderBottomColor: "#00838F" },
  buttonText: { color: "#06262B", fontWeight: "900", letterSpacing: 1, fontSize: 13 },
});
