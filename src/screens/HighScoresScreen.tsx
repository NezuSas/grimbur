// src/screens/HighScoresScreen.tsx
import React, { useEffect, useState, useCallback } from "react";
import {
  FlatList,
  Image,
  Text,
  TouchableOpacity,
  View,
  StyleSheet,
  ActivityIndicator,
  ImageBackground,
  useWindowDimensions,
} from "react-native";
import { fetchTop10, type Doc } from "../services/highscores";
import { SafeAreaView } from "react-native-safe-area-context";
import { MIN_TOUCH, useGameLayout } from "../ui/layout/useGameLayout";
import characters from "../data/characters";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";
import { formatTime } from "../shared/utils/formatTime";
import { useT } from "../i18n/useT";

type Props = NativeStackScreenProps<RootStackParamList, "HighScoresScreen">;

type Status = "loading" | "ready" | "error";

/** Column flex weights; one source for the header and the rows so they always align. */
const COLUMNS = { rank: 0.8, hero: 0.9, name: 2.2, floor: 1, score: 1.6, gems: 1.1, time: 1.3 } as const;

const HighScoresScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useT();
  const { width } = useWindowDimensions();
  const { spacing, fontSize, insets } = useGameLayout();
  const [data, setData] = useState<Doc[]>([]);
  const [status, setStatus] = useState<Status>("loading");

  const cardWidth = Math.min(width - Math.max(insets.left, 8) - Math.max(insets.right, 8) - 16, 950);

  const loadData = useCallback(async () => {
    setStatus("loading");
    try {
      setData(await fetchTop10());
      setStatus("ready");
    } catch (err) {
      console.warn("[HighScores] load error:", err);
      setStatus("error"); // a failed request is not an empty leaderboard
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const header = (
    <View style={[styles.tableHeader, { paddingVertical: spacing(10) }]}>
      {(
        [
          ["rank", t("scores.col.rank")],
          ["hero", t("scores.col.hero")],
          ["name", t("scores.col.name")],
          ["floor", t("scores.col.floor")],
          ["score", t("scores.col.score")],
          ["gems", t("scores.col.gems")],
          ["time", t("scores.col.time")],
        ] as const
      ).map(([key, label]) => (
        <View key={key} style={[styles.headerCell, { flex: COLUMNS[key] }]}>
          <Text style={styles.headerText} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.2}>
            {label.toLocaleUpperCase()}
          </Text>
        </View>
      ))}
    </View>
  );

  const renderItem = ({ item, index }: { item: Doc; index: number }) => {
    const row = item.data();
    const char = characters[row.characterIndex] || characters[0];
    const time = typeof row.time === "number" ? formatTime(row.time) : t("scores.noTime");

    return (
      <View
        style={[styles.row, index % 2 === 1 && styles.rowAlternate, { paddingVertical: spacing(10) }]}
        accessible
        accessibilityLabel={`#${index + 1} ${row.name}. ${t("scores.col.score")} ${row.score}. ${t("scores.col.floor")} ${row.level}`}
      >
        <View style={[styles.cell, { flex: COLUMNS.rank }]}>
          <Text style={[styles.cellText, { fontSize: fontSize(15), color: "#a0a0a0" }]} maxFontSizeMultiplier={1.2}>
            #{index + 1}
          </Text>
        </View>
        <View style={[styles.cell, { flex: COLUMNS.hero }]}>
          <Image source={char.scoreImage} style={styles.avatar} accessibilityIgnoresInvertColors />
        </View>
        <View style={[styles.cell, { flex: COLUMNS.name }]}>
          <Text style={[styles.cellText, { fontSize: fontSize(17) }]} numberOfLines={1} maxFontSizeMultiplier={1.2}>
            {row.name}
          </Text>
        </View>
        <View style={[styles.cell, { flex: COLUMNS.floor }]}>
          <Text style={[styles.cellText, { fontSize: fontSize(15), color: "#b0b0b0" }]} maxFontSizeMultiplier={1.2}>
            {t("scores.floorShort", { n: row.level })}
          </Text>
        </View>
        <View style={[styles.cell, { flex: COLUMNS.score }]}>
          <Text
            style={[styles.cellText, styles.scoreValue, { fontSize: fontSize(17) }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            maxFontSizeMultiplier={1.2}
          >
            {(Number(row.score) || 0).toLocaleString()}
          </Text>
        </View>
        <View style={[styles.cell, { flex: COLUMNS.gems }]}>
          <Text style={[styles.cellText, { fontSize: fontSize(15), color: "#00E5FF" }]} numberOfLines={1} maxFontSizeMultiplier={1.2}>
            💎 {Number(row.coins) || 0}
          </Text>
        </View>
        <View style={[styles.cell, { flex: COLUMNS.time }]}>
          <Text style={[styles.cellText, { fontSize: fontSize(15), color: "#4FC3F7" }]} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.2}>
            {time}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <ImageBackground source={require("../assets/sprites/backgrounds/Cover_Background.png")} style={styles.root} resizeMode="cover">
      <SafeAreaView style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.85)" }}>
        <View style={[styles.headerArea, { paddingVertical: spacing(14) }]}>
          <TouchableOpacity
            style={[styles.backButton, { left: Math.max(insets.left, 12) }]}
            onPress={() => navigation.goBack()}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t("a11y.back")}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={[styles.title, { fontSize: fontSize(28) }]} accessibilityRole="header" maxFontSizeMultiplier={1.3}>
            {t("scores.title").toLocaleUpperCase()}
          </Text>
        </View>

        <View style={[styles.mainLayout, { width: cardWidth }]}>
          {header}

          {status === "loading" && (
            <View style={styles.centerBox}>
              <ActivityIndicator color="#FFD700" size="large" />
              <Text style={styles.statusText} maxFontSizeMultiplier={1.3}>
                {t("scores.loading")}
              </Text>
            </View>
          )}

          {status === "error" && (
            <View style={styles.centerBox} accessibilityLiveRegion="polite">
              <Ionicons name="cloud-offline-outline" size={36} color="#FF8A80" />
              <Text style={[styles.statusText, { color: "#FF8A80" }]} maxFontSizeMultiplier={1.3}>
                {t("scores.error")}
              </Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={loadData}
                accessibilityRole="button"
                accessibilityLabel={t("common.retry")}
              >
                <Text style={styles.retryText} maxFontSizeMultiplier={1.3}>
                  {t("common.retry").toLocaleUpperCase()}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {status === "ready" && (
            <FlatList
              data={data}
              showsVerticalScrollIndicator={false}
              keyExtractor={doc => doc.id}
              renderItem={renderItem}
              contentContainerStyle={{ paddingBottom: spacing(30) + insets.bottom }}
              ListEmptyComponent={
                <View style={styles.centerBox}>
                  <Text style={styles.statusText} maxFontSizeMultiplier={1.3}>
                    {t("scores.empty")}
                  </Text>
                </View>
              }
            />
          )}
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0b0b0b" },
  headerArea: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111",
    borderBottomWidth: 1,
    borderColor: "#333",
  },
  backButton: {
    position: "absolute",
    width: MIN_TOUCH,
    height: MIN_TOUCH,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: MIN_TOUCH / 2,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontWeight: "900",
    color: "#fff",
    letterSpacing: 2,
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  mainLayout: { flex: 1, alignSelf: "center" },
  tableHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1a1a1a",
    borderBottomWidth: 2,
    borderColor: "#FFD700",
    marginTop: 10,
  },
  headerCell: { alignItems: "center", paddingHorizontal: 2 },
  headerText: { fontWeight: "800", color: "#b0b0b0", letterSpacing: 1, fontSize: 11 },
  row: { flexDirection: "row", alignItems: "center", borderRadius: 8, marginVertical: 1 },
  rowAlternate: { backgroundColor: "rgba(255, 255, 255, 0.05)" },
  cell: { alignItems: "center", paddingHorizontal: 3 },
  cellText: { fontWeight: "700", color: "#eee" },
  scoreValue: { color: "#4caf50", fontWeight: "900" },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  centerBox: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
  statusText: { color: "#d0d0d0", fontWeight: "700", textAlign: "center", fontSize: 15 },
  retryButton: {
    minHeight: MIN_TOUCH,
    paddingHorizontal: 24,
    borderRadius: 14,
    backgroundColor: "#FFD700",
    justifyContent: "center",
    alignItems: "center",
  },
  retryText: { color: "#000", fontWeight: "900", letterSpacing: 1 },
});

export default HighScoresScreen;
