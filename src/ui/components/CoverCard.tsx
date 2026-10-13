import React from "react";
import { View, Text, ScrollView, StyleSheet, useWindowDimensions } from "react-native";
import Constants from "expo-constants";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import CoverButton from "./CoverButton";
import { useGameLayout } from "../layout/useGameLayout";
import { useT } from "../../i18n/useT";

type Props = {
  onPressPlay: () => void;
  onPressDaily: () => void;
  onPressScores: () => void;
  onPressInstructions: () => void;
  onPressSettings: () => void;
};

const CoverCard: React.FC<Props> = ({ onPressPlay, onPressDaily, onPressScores, onPressInstructions, onPressSettings }) => {
  const { t } = useT();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { spacing, titleSize } = useGameLayout();

  const cardWidth = Math.min(width - Math.max(insets.left, 12) - Math.max(insets.right, 12) - 16, 540);
  const version = Constants.expoConfig?.version ?? "";

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[
        styles.content,
        { paddingTop: Math.max(insets.top, 8), paddingBottom: Math.max(insets.bottom, 8) },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.cardContainer, { width: cardWidth, padding: spacing(24) }]}>
        {/* Header */}
        <View style={[styles.header, { marginBottom: spacing(16) }]}>
          <Text
            style={[styles.title, { fontSize: Math.min(titleSize * 0.95, 34) }]}
            accessibilityRole="header"
            numberOfLines={1}
            adjustsFontSizeToFit
            maxFontSizeMultiplier={1.2}
          >
            WUMPUS ADVENTURES
          </Text>
          <Text style={styles.tagline} maxFontSizeMultiplier={1.3}>
            {t("cover.tagline")}
          </Text>
        </View>

        {/* Primary actions */}
        <CoverButton label={t("cover.play")} onPress={onPressPlay} variant="primary" />
        <CoverButton label={t("cover.daily")} onPress={onPressDaily} variant="primary" />

        <View style={styles.buttonRow}>
          <View style={styles.half}>
            <CoverButton label={t("cover.rankings")} onPress={onPressScores} variant="secondary" />
          </View>
          <View style={styles.half}>
            <CoverButton label={t("cover.manual")} onPress={onPressInstructions} variant="secondary" />
          </View>
        </View>
        <CoverButton label={t("cover.settings")} onPress={onPressSettings} variant="secondary" />

        {version ? (
          <Text style={styles.versionText} maxFontSizeMultiplier={1.2}>
            {t("cover.version", { version })}
          </Text>
        ) : null}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scroll: { flex: 1, width: "100%" },
  content: { flexGrow: 1, alignItems: "center", justifyContent: "center" },
  cardContainer: {
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    borderRadius: 30,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.2)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 20,
  },
  header: { alignItems: "center" },
  title: {
    color: "#FFD700",
    fontWeight: "900",
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
    letterSpacing: 2,
  },
  tagline: {
    color: "#e6e6e6",
    fontWeight: "600",
    fontSize: 13,
    letterSpacing: 1,
    textAlign: "center",
    marginTop: 4,
  },
  buttonRow: { flexDirection: "row", gap: 10 },
  half: { flex: 1 },
  versionText: {
    color: "rgba(255, 255, 255, 0.55)",
    fontWeight: "bold",
    fontSize: 11,
    letterSpacing: 1,
    textAlign: "center",
    marginTop: 8,
  },
});

export default CoverCard;
