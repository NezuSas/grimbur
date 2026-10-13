// src/screens/HighScoresScreen.tsx
import React, { useEffect, useState, useCallback, useRef } from "react";
import { 
  FlatList, 
  Image, 
  Text, 
  TouchableOpacity, 
  View, 
  StyleSheet, 
  Animated,
  ActivityIndicator,
  ImageBackground
} from "react-native";
import { fetchTop10, type Doc } from "../services/highscores";
import { SafeAreaView } from "react-native-safe-area-context";
import { useGameLayout } from "../ui/layout/useGameLayout";
import characters from "../data/characters";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";
import { formatTime as formatElapsed } from "../shared/utils/formatTime";

type Props = NativeStackScreenProps<RootStackParamList, "HighScoresScreen">;

type HighscoreDoc = {
  level: number;
  score: number;
  name: string;
  coins: number;
  characterIndex: number;
  time: number;
};

const HighScoresScreen: React.FC<Props> = ({ navigation }) => {
  const { screenWidth, spacing, titleSize, textSize, fontSize } = useGameLayout();
  const [data, setData] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  
  const skeletonOpacity = useRef(new Animated.Value(0.3)).current;

  // Selection Card Width
  const cardWidth = Math.min(screenWidth * 0.9, 950);

  // Legacy leaderboard documents may not have a `time` field.
  const formatTime = (seconds?: number | null) =>
    seconds === undefined || seconds === null ? "N/A" : formatElapsed(seconds);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const docs = await fetchTop10();
      setData(docs);
    } catch (err) {
      console.error("[HighScores] load error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (loading) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(skeletonOpacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
          Animated.timing(skeletonOpacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    } else {
      skeletonOpacity.setValue(1);
    }
  }, [loading]);

  const renderSkeletonRow = (index: number) => (
    <Animated.View 
      key={`skeleton-${index}`}
      style={[
        styles.row, 
        index % 2 !== 0 && styles.rowAlternate, 
        { paddingVertical: spacing(14), opacity: skeletonOpacity }
      ]}
    >
      <View style={[styles.cell, { width: "8%", alignItems: "center" }]}><View style={[styles.skeletonBox, { width: 15, height: 16 }]} /></View>
      <View style={[styles.cell, { width: "10%", alignItems: "center" }]}><View style={[styles.avatarSkeleton, { width: 32, height: 32 }]} /></View>
      <View style={[styles.cell, { width: "22%", alignItems: "center" }]}><View style={[styles.skeletonBox, { width: "80%", height: 18 }]} /></View>
      <View style={[styles.cell, { width: "12%", alignItems: "center" }]}><View style={[styles.skeletonBox, { width: 30, height: 16 }]} /></View>
      <View style={[styles.cell, { width: "18%", alignItems: "center" }]}><View style={[styles.skeletonBox, { width: "70%", height: 18 }]} /></View>
      <View style={[styles.cell, { width: "15%", alignItems: "center" }]}><View style={[styles.skeletonBox, { width: 40, height: 16 }]} /></View>
      <View style={[styles.cell, { width: "15%", alignItems: "center" }]}><View style={[styles.skeletonBox, { width: 40, height: 16 }]} /></View>
    </Animated.View>
  );

  const renderItem = ({ item, index }: { item: Doc; index: number }) => {
    const row = item.data() as HighscoreDoc;
    const isEven = index % 2 === 0;
    const char = characters[row.characterIndex] || characters[0];

    return (
      <View style={[styles.row, !isEven && styles.rowAlternate, { paddingVertical: spacing(14) }]}>
        <View style={[styles.cell, { width: "8%", alignItems: "center" }]}>
           <Text style={[styles.cellText, { fontSize: fontSize(14), color: "#666" }]}>#{index + 1}</Text>
        </View>

        <View style={[styles.cell, { width: "10%", alignItems: "center" }]}>
          <Image source={char.scoreImage} style={[styles.avatar, { width: 32, height: 32 }]} />
        </View>

        <View style={[styles.cell, { width: "22%", alignItems: "center" }]}>
          <Text style={[styles.cellText, { fontSize: fontSize(18) }]} numberOfLines={1}>{row.name}</Text>
        </View>

        <View style={[styles.cell, { width: "12%", alignItems: "center" }]}>
          <Text style={[styles.cellText, { fontSize: fontSize(14), color: "#888" }]}>Lvl {row.level}</Text>
        </View>

        <View style={[styles.cell, { width: "18%", alignItems: "center" }]}>
          <Text style={[styles.cellText, styles.scoreValue, { fontSize: fontSize(18) }]}>{row.score.toLocaleString()}</Text>
        </View>

        <View style={[styles.cell, { width: "15%", alignItems: "center" }]}>
          <Text style={[styles.cellText, { fontSize: fontSize(16), color: "#00E5FF" }]}>💎 {row.coins || 0}</Text>
        </View>

        <View style={[styles.cell, { width: "15%", alignItems: "center" }]}>
          <Text style={[styles.cellText, { fontSize: fontSize(16), color: "#00BFFF" }]}>⏱️ {formatTime(row.time)}</Text>
        </View>
      </View>
    );
  };

  return (
    <ImageBackground source={require("../assets/sprites/backgrounds/Cover_Background.png")} style={styles.root} resizeMode="cover">
      <SafeAreaView style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)' }}>
        <View style={{ flex: 1 }}>
          <View style={[styles.headerArea, { paddingVertical: spacing(25) }]}>
            <TouchableOpacity style={[styles.backButton, { left: spacing(20) }]} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={spacing(30)} color="#fff" />
            </TouchableOpacity>
            <Text style={[styles.title, { fontSize: titleSize }]}>CHAMPIONS LINEUP</Text>
          </View>

          <View style={[styles.mainLayout, { width: cardWidth, alignSelf: "center" }]}>
            <View style={[styles.tableHeader, { paddingVertical: spacing(14) }]}>
              <View style={[styles.headerCell, { width: "8%" }]}><Text style={[styles.headerText, { fontSize: textSize * 0.45 }]}>RANK</Text></View>
              <View style={[styles.headerCell, { width: "10%" }]}><Text style={[styles.headerText, { fontSize: textSize * 0.45 }]}>HERO</Text></View>
              <View style={[styles.headerCell, { width: "22%" }]}><Text style={[styles.headerText, { fontSize: textSize * 0.45 }]}>NAME</Text></View>
              <View style={[styles.headerCell, { width: "12%" }]}><Text style={[styles.headerText, { fontSize: textSize * 0.45 }]}>LEVEL</Text></View>
              <View style={[styles.headerCell, { width: "18%" }]}><Text style={[styles.headerText, { fontSize: textSize * 0.45 }]}>SCORE</Text></View>
              <View style={[styles.headerCell, { width: "15%" }]}><Text style={[styles.headerText, { fontSize: textSize * 0.45 }]}>GEMS</Text></View>
              <View style={[styles.headerCell, { width: "15%" }]}><Text style={[styles.headerText, { fontSize: textSize * 0.45 }]}>TIME</Text></View>
            </View>

            {loading ? (
              <View style={styles.loadingContainer}>
                <View style={styles.indicatorRow}>
                    <ActivityIndicator color="#FFD700" size="small" />
                    <Text style={[styles.loadingText, { fontSize: fontSize(16), marginLeft: 10 }]}>RETRIEVING LEGENDS...</Text>
                </View>
                <View style={styles.list}>{[0, 1, 2, 3, 4, 5, 6, 7].map(renderSkeletonRow)}</View>
              </View>
            ) : (
              <FlatList
                data={data}
                showsVerticalScrollIndicator={false}
                keyExtractor={(doc) => doc.id}
                renderItem={renderItem}
                contentContainerStyle={{ paddingBottom: spacing(40) }}
                style={styles.list}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Text style={[styles.emptyText, { fontSize: fontSize(18) }]}>NO LEGENDS YET. BE THE FIRST!</Text>
                  </View>
                }
              />
            )}
          </View>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0b0b0b" },
  headerArea: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#111", borderBottomWidth: 1, borderColor: "#333" },
  backButton: { position: "absolute", width: 50, height: 50, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 25, justifyContent: "center", alignItems: "center" },
  title: { fontWeight: "900", color: "#fff", letterSpacing: 2, textShadowColor: "rgba(0,0,0,0.5)", textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 4 },
  tableHeader: { flexDirection: "row", alignItems: "center", backgroundColor: "#1a1a1a", borderBottomWidth: 2, borderColor: "#FFD700", marginTop: 10 },
  headerCell: { alignItems: "center" },
  headerText: { fontWeight: "800", color: "#888", letterSpacing: 1 },
  mainLayout: { flex: 1 },
  list: { paddingHorizontal: 4 },
  row: { flexDirection: "row", alignItems: "center", borderRadius: 8, marginVertical: 1 },
  rowAlternate: { backgroundColor: "rgba(255, 255, 255, 0.04)" },
  cell: { paddingHorizontal: 4 },
  cellText: { fontWeight: "700", color: "#eee" },
  scoreValue: { color: "#4caf50", fontWeight: "900" },
  avatar: { borderRadius: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.2)", backgroundColor: "rgba(255,255,255,0.05)" },
  loadingContainer: { flex: 1 },
  indicatorRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 20, backgroundColor: "rgba(255,255,255,0.02)" },
  loadingText: { color: "#FFD700", fontWeight: "bold", letterSpacing: 1 },
  skeletonBox: { backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 4 },
  avatarSkeleton: { backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 16 },
  emptyContainer: { padding: 60, alignItems: "center" },
  emptyText: { color: "#444", fontWeight: "900", textAlign: "center", letterSpacing: 1 },
});

export default HighScoresScreen;
