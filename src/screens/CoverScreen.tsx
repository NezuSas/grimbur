import React, { useCallback } from "react";
import { ImageBackground, View, StyleSheet } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { RootStackParamList } from "../navigation/types";
import CoverCard from "../ui/components/CoverCard";

import { emitSound } from "../audio/audioEventBus";

type Props = NativeStackScreenProps<RootStackParamList, "CoverScreen">;

const CoverScreen: React.FC<Props> = ({ navigation }) => {
  useFocusEffect(
    useCallback(() => {
      emitSound('COVER_SCREEN_START');
    }, [])
  );

  return (
    <View style={styles.root}>
      <ImageBackground
        source={require("../assets/sprites/backgrounds/Cover_Background.png")}
        style={StyleSheet.absoluteFill}
        imageStyle={StyleSheet.absoluteFill}
        resizeMode="cover"
      >
        <CoverCard
          onPressPlay={() => navigation.navigate("CharactersScreen", { mode: "expedition" })}
          onPressDaily={() => navigation.navigate("CharactersScreen", { mode: "daily" })}
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
