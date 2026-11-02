import React from "react";
import { ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import type { ImageSourcePropType } from "react-native";
import Text from "./Text";
import SpriteImage from "./SpriteImage";
import OverlayContainer from "./game/OverlayContainer";
import { PopButton, PopLink, PopupPanel, popupTitleStyle } from "./game/popup";
import { useT } from "../../i18n/useT";
import type { TranslationKey } from "../../i18n/en";

/** Bump when a new set of news ships: a returning player sees the card once per version. */
export const WHATS_NEW_ID = "whatsnew-1";

const GOLD = "#FFD54F";
const ITEMS: { key: string; art: ImageSourcePropType; tint: string }[] = [
  { key: "secrets", art: require("../../assets/sprites/ui/Icon_Sparkles.png"), tint: "#FFE082" },
  { key: "encounters", art: require("../../assets/sprites/encounters/Encounter_Gambler.png"), tint: "#9EE37D" },
  { key: "pets", art: require("../../assets/sprites/cosmetics/PetAdult_Fox_A.png"), tint: "#81D4FA" },
  { key: "quests", art: require("../../assets/sprites/cosmetics/Frame_QuestMira.png"), tint: "#F48FB1" },
  { key: "ancient", art: require("../../assets/sprites/enemies/Ancient_Boss.png"), tint: "#80DEEA" },
];

type Props = { onClose: () => void; onSeePets: () => void };

/** What is new in the cave, shown once to a player who already knew it (a newcomer meets it all by playing). */
const WhatsNewModal = ({ onClose, onSeePets }: Props) => {
  const { t } = useT();
  const { width, height } = useWindowDimensions();
  const wide = width >= 640;
  return (
    <OverlayContainer>
      <PopupPanel tint={GOLD} width={Math.min(width * 0.94, 760)} style={{ maxHeight: height * 0.92 }}>
        <Text style={popupTitleStyle(GOLD)} maxFontSizeMultiplier={1.15}>
          {t("whatsnew.title").toLocaleUpperCase()}
        </Text>
        <ScrollView style={{ alignSelf: "stretch" }} contentContainerStyle={[styles.grid, wide && styles.gridWide]}>
          {ITEMS.map(item => (
            <View key={item.key} style={[styles.item, wide && styles.itemWide, { borderColor: item.tint + "66" }]}>
              <View style={[styles.well, { backgroundColor: item.tint + "22" }]}>
                <SpriteImage source={item.art} style={styles.art} resizeMode="contain" />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[styles.name, { color: item.tint }]} maxFontSizeMultiplier={1.15}>
                  {t(`whatsnew.${item.key}.title` as TranslationKey)}
                </Text>
                <Text style={styles.body} maxFontSizeMultiplier={1.15}>
                  {t(`whatsnew.${item.key}.body` as TranslationKey)}
                </Text>
              </View>
            </View>
          ))}
        </ScrollView>
        {/* Side by side: every line of height goes to the news on a small phone. */}
        <View style={styles.actions}>
          <PopLink label={t("whatsnew.pets")} onPress={onSeePets} />
          <PopButton label={t("whatsnew.go")} onPress={onClose} tint={GOLD} style={styles.button} />
        </View>
      </PopupPanel>
    </OverlayContainer>
  );
};

const styles = StyleSheet.create({
  grid: { gap: 8 },
  gridWide: { flexDirection: "row", flexWrap: "wrap" },
  item: { flexDirection: "row", alignItems: "center", gap: 10, padding: 8, borderRadius: 14, borderWidth: 1.5, backgroundColor: "rgba(0,0,0,0.3)" },
  itemWide: { width: "49%" },
  well: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  art: { width: 46, height: 46 },
  name: { fontSize: 14, fontWeight: "900" },
  body: { color: "#E6D6C2", fontSize: 12, lineHeight: 16 },
  actions: { flexDirection: "row", alignItems: "center", gap: 14, alignSelf: "stretch" },
  button: { flex: 1 },
});

export default WhatsNewModal;
