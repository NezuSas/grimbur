import React, { useEffect, useRef, useMemo, useState } from "react";
import {
  Animated,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import characters from "../data/characters";
import { useGameLayout } from "../ui/layout/useGameLayout";
import { emitSound } from "../audio/audioEventBus";
import { formatTime } from "../shared/utils/formatTime";

type Props = NativeStackScreenProps<RootStackParamList, "LevelCompleteScreen">;

const LevelCompleteScreen: React.FC<Props> = ({ route, navigation }) => {
  const { score, level, coins, totalCoins, characterIndex, kills = 0, totalEnemies = 6 } = route.params;
  const character = characters[characterIndex];
  const { screenWidth, screenHeight, spacing, titleSize, textSize, fontSize, isTablet } = useGameLayout();

  const [buttonEnabled, setButtonEnabled] = useState(false);

  // Animation values
  const cardScale = useRef(new Animated.Value(0)).current;
  const star1 = useRef(new Animated.Value(0)).current;
  const star2 = useRef(new Animated.Value(0)).current;
  const star3 = useRef(new Animated.Value(0)).current;

  // Rating logic:
  // 1 star  -> level completed
  // 2 stars -> all coins collected
  // 3 stars -> all coins collected + at least 50% of monsters killed (3/6)
  const starsEarned = useMemo(() => {
    const allCoins = coins === totalCoins;
    const allKilled = kills === totalEnemies;

    if (allCoins && allKilled) return 3;
    if (allCoins) return 2;
    return 1;
  }, [coins, totalCoins, kills, totalEnemies]);

  useEffect(() => {
    // Initial entry animation
    Animated.spring(cardScale, {
      toValue: 1,
      friction: 6,
      useNativeDriver: true,
    }).start(() => {
      // Sequential star animations — always show 3 stars one by one
      Animated.sequence([
        Animated.delay(300),
        Animated.spring(star1, { toValue: 1, friction: 3, useNativeDriver: true }),
        Animated.spring(star2, { toValue: 1, friction: 3, useNativeDriver: true }),
        Animated.spring(star3, { toValue: 1, friction: 3, useNativeDriver: true }),
      ]).start(() => {
        setButtonEnabled(true);
      });
    });
  }, []);

  const handleContinue = () => {
    navigation.goBack();
  };

  // Skip: complete all animations instantly, stop ceremony audio, and go back
  const handleSkip = () => {
    cardScale.setValue(1);
    star1.setValue(1);
    star2.setValue(1);
    star3.setValue(1);
    if (!buttonEnabled) setButtonEnabled(true);
    emitSound('LEVEL_RESUME'); // Stop level-up audio and resume in-game music
    navigation.goBack();
  };

  // Responsive sizes
  const cardWidth = Math.min(screenWidth * 0.9, 850);
  const cardMaxHeight = screenHeight * 0.92;
  const imageHeight = Math.min(spacing(160), screenHeight * 0.35);

  return (
    <SafeAreaView style={styles.container}>
      {/* Tap anywhere to skip */}
      <TouchableOpacity
        style={StyleSheet.absoluteFill}
        activeOpacity={1}
        onPress={handleSkip}
      />

      <Animated.View style={[
        styles.card,
        {
          transform: [{ scale: cardScale }],
          width: cardWidth,
          maxHeight: cardMaxHeight,
          borderColor: character.arrowColor,
        }
      ]}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={[styles.row, { padding: spacing(20) }]}>

            {/* Left Column: Title, Image, and Stars */}
            <View style={[styles.column, { flex: 1, paddingRight: spacing(10) }]}>
              <View style={styles.header}>
                <Text style={[styles.title, { fontSize: titleSize, color: character.arrowColor }]}>LEVEL COMPLETE</Text>
                <Text style={[styles.levelText, { fontSize: textSize, marginBottom: spacing(5) }]}>Level {level}</Text>
              </View>

              <View style={[styles.imageContainer, { height: imageHeight, marginBottom: spacing(10) }]}>
                <Image source={character.winImage} style={styles.winImage} resizeMode="contain" />
              </View>

              <View style={styles.starsContainer}>
                <Animated.View style={{ transform: [{ scale: star1 }] }}>
                  <Ionicons name="star" size={spacing(45)} color="#FFD700" />
                </Animated.View>
                <Animated.View style={{ transform: [{ scale: star2 }] }}>
                  <Ionicons
                    name={starsEarned >= 2 ? "star" : "star-outline"}
                    size={spacing(60)}
                    color={starsEarned >= 2 ? "#FFD700" : "#444"}
                    style={{ marginHorizontal: spacing(15) }}
                  />
                </Animated.View>
                <Animated.View style={{ transform: [{ scale: star3 }] }}>
                  <Ionicons
                    name={starsEarned >= 3 ? "star" : "star-outline"}
                    size={spacing(45)}
                    color={starsEarned >= 3 ? "#FFD700" : "#444"}
                  />
                </Animated.View>
              </View>

              {/* Skip hint — shows until animation finishes */}
              {!buttonEnabled && (
                <Text style={styles.skipHint}>TAP ANYWHERE TO SKIP</Text>
              )}
            </View>

            {/* Right Column: Stats and Button */}
            <View style={[styles.column, { flex: 1.2, paddingLeft: spacing(10) }]}>

              <View style={[styles.statsContainer, { padding: spacing(15), marginBottom: spacing(25) }]}>
                <View style={styles.statRow}>
                  <Text style={[styles.statLabel, { fontSize: textSize * 0.7 }]}>SCORE</Text>
                  <Text style={[styles.statValue, { fontSize: textSize * 1.1 }]}>{score.toLocaleString()}</Text>
                </View>
                <View style={styles.statRow}>
                  <Text style={[styles.statLabel, { fontSize: textSize * 0.6 }]}>GEMS</Text>
                  <Text style={[styles.statValue, { color: "#FFD700", fontSize: fontSize(20) }]}>{coins} / {totalCoins}</Text>
                </View>
                <View style={styles.statRow}>
                  <Text style={[styles.statLabel, { fontSize: textSize * 0.6 }]}>KILLS</Text>
                  <Text style={[styles.statValue, { color: "#FF3D00", fontSize: fontSize(20) }]}>{kills} / {totalEnemies}</Text>
                </View>
                <View style={styles.statRow}>
                  <Text style={[styles.statLabel, { fontSize: textSize * 0.6 }]}>TIME</Text>
                  <Text style={[styles.statValue, { color: "#00BFFF", fontSize: fontSize(20) }]}>{formatTime(route.params.time ?? 0)}</Text>
                </View>
              </View>

              <TouchableOpacity
                style={[
                  styles.button,
                  {
                    backgroundColor: character.arrowColor,
                    paddingVertical: spacing(20),
                  }
                ]}
                onPress={handleSkip}
                activeOpacity={0.8}
              >
                <Text style={[styles.buttonText, { fontSize: textSize }]}>NEXT LEVEL →</Text>
              </TouchableOpacity>
            </View>

          </View>
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    backgroundColor: "#111",
    borderRadius: 36,
    borderWidth: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 25,
    overflow: "hidden",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  column: {
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    alignItems: "center",
    width: "100%",
  },
  title: {
    fontWeight: "900",
    letterSpacing: 1,
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  levelText: {
    color: "#aaa",
    fontWeight: "bold",
    letterSpacing: 1,
    textAlign: "center",
  },
  imageContainer: {
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  winImage: {
    height: "100%",
    width: "100%",
  },
  starsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  statsContainer: {
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  statLabel: {
    color: "#777",
    fontWeight: "900",
    letterSpacing: 1,
  },
  statValue: {
    color: "#fff",
    fontWeight: "900",
    letterSpacing: 1,
  },
  button: {
    borderRadius: 24,
    width: "100%",
    alignItems: "center",
    borderBottomWidth: 4,
    borderBottomColor: "rgba(0,0,0,0.3)",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "900",
    letterSpacing: 2,
  },
  skipHint: {
    color: "rgba(255,255,255,0.35)",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
    marginTop: 10,
  },
});

export default LevelCompleteScreen;
