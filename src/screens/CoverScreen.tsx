import React, { useCallback, useState } from "react";
import { ImageBackground, View, StyleSheet } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { RootStackParamList } from "../navigation/types";
import CoverCard from "../ui/components/CoverCard";
import { EMPTY_STATS, LocalStats, currentStreak } from "../core/stats/runStats";
import { getLocalStats } from "../services/localStats";
import { dailyKey } from "../core/engine/seed";

import { emitSound } from "../audio/audioEventBus";

type Props = NativeStackScreenProps<RootStackParamList, "CoverScreen">;

const CoverScreen: React.FC<Props> = ({ navigation }) => {
  const [stats, setStats] = useState<LocalStats>(EMPTY_STATS);

  useFocusEffect(
    useCallback(() => {
      emitSound('COVER_SCREEN_START');
      getLocalStats().then(setStats).catch(() => {});
    }, [])
  );

  const today = dailyKey();

  return (
    <View style={styles.root}>
      <ImageBackground
      fadeDuration={0}
      resizeMethod="none"
        source={require("../assets/sprites/backgrounds/Cover_Background.png")}
        style={StyleSheet.absoluteFill}
        imageStyle={StyleSheet.absoluteFill}
        resizeMode="cover"
      >
        <CoverCard
          onPressPlay={() => navigation.navigate("CharactersScreen", { mode: "expedition" })}
          onPressDaily={() => navigation.navigate("CharactersScreen", { mode: "daily" })}
          onPressEndless={() => navigation.navigate("CharactersScreen", { mode: "endless" })}
          streak={currentStreak(stats, today)}
          dailyDone={stats.daily?.date === today}
          endlessUnlocked={stats.victories >= 1}
          bestEndlessFloor={stats.bestEndlessFloor}
          onPressScores={() => navigation.navigate("HighScoresScreen")}
          onPressInstructions={() => navigation.navigate("InstructionsScreen")}
          onPressForge={() => navigation.navigate("ForgeScreen")}
          onPressAchievements={() => navigation.navigate("AchievementsScreen")}
          onPressSettings={() => navigation.navigate("SettingsScreen")}
        />
      </ImageBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "black",
  },
});

export default CoverScreen;
