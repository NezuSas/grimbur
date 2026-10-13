import React, { useEffect, useCallback } from "react";
import { ImageBackground, View, StyleSheet } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { RootStackParamList } from "../navigation/types";
import { SafeAreaView } from "react-native-safe-area-context";
import CoverCard from "../ui/components/CoverCard";

import { emitSound } from "../audio/audioEventBus";

let hideNavigationBar: undefined | (() => void);
try {
  hideNavigationBar = require("react-native-navigation-bar-color").hideNavigationBar;
} catch {}

type Props = NativeStackScreenProps<RootStackParamList, "CoverScreen">;

const CoverScreen: React.FC<Props> = ({ navigation }) => {
  useFocusEffect(
    useCallback(() => {
      emitSound('COVER_SCREEN_START');
    }, [])
  );

  useEffect(() => {
    try { hideNavigationBar?.(); } catch {}
  }, []);

  return (
    <SafeAreaView style={styles.root}>
      <ImageBackground
        source={require("../assets/sprites/backgrounds/Cover_Background.png")}
        style={StyleSheet.absoluteFill}
        imageStyle={StyleSheet.absoluteFill}
        resizeMode="cover"
      >
        <CoverCard
          onPressPlay={() => navigation.navigate("CharactersScreen")}
          onPressScores={() => navigation.navigate("HighScoresScreen")}
          onPressInstructions={() => navigation.navigate("InstructionsScreen")}
          onPressSettings={() => navigation.navigate("SettingsScreen")}
        />
      </ImageBackground>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "black",
  },
});

export default CoverScreen;
