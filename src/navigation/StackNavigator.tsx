import React from "react";
import { StatusBar } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { RootStackParamList } from "./types";

import CoverScreen from "../screens/CoverScreen";
import CharactersScreen from "../screens/CharactersScreen";
import GameScreen from "../screens/GameScreen";
import TutorialScreen from "../screens/TutorialScreen";
import HighScoresScreen from "../screens/HighScoresScreen";
import LevelCompleteScreen from "../screens/LevelCompleteScreen";
import InstructionsScreen from "../screens/InstructionsScreen";
import SettingsScreen from "../screens/SettingsScreen";
import AchievementsScreen from "../screens/AchievementsScreen";

const Stack = createNativeStackNavigator<RootStackParamList>();

const StackNavigator: React.FC = () => {
  return (
    <>
      <StatusBar hidden />
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: "none",
          contentStyle: { backgroundColor: "#000" },
        }}
      >
        <Stack.Screen name="CoverScreen" component={CoverScreen} />
        <Stack.Screen name="CharactersScreen" component={CharactersScreen} />
        <Stack.Screen name="TutorialScreen" component={TutorialScreen} />
        <Stack.Screen name="GameScreen" component={GameScreen} />
        <Stack.Screen name="HighScoresScreen" component={HighScoresScreen} />
        <Stack.Screen name="LevelCompleteScreen" component={LevelCompleteScreen} />
        <Stack.Screen name="InstructionsScreen" component={InstructionsScreen} />
        <Stack.Screen name="SettingsScreen" component={SettingsScreen} />
        <Stack.Screen name="AchievementsScreen" component={AchievementsScreen} />
      </Stack.Navigator>
    </>
  );
};

export default StackNavigator;
