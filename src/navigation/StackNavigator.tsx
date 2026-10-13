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
import ForgeScreen from "../screens/ForgeScreen";

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * A swipe from the screen edge goes back in a native stack. During a run that would silently throw the game
 * away (a finger sliding across the board is enough), so the gesture is off there; the Back button/gesture
 * of the system pauses the game instead (see GameScreen).
 */
const NO_SWIPE_BACK = { gestureEnabled: false, fullScreenGestureEnabled: false } as const;

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
        <Stack.Screen name="TutorialScreen" component={TutorialScreen} options={NO_SWIPE_BACK} />
        <Stack.Screen name="GameScreen" component={GameScreen} options={NO_SWIPE_BACK} />
        <Stack.Screen name="HighScoresScreen" component={HighScoresScreen} />
        <Stack.Screen name="LevelCompleteScreen" component={LevelCompleteScreen} options={NO_SWIPE_BACK} />
        <Stack.Screen name="InstructionsScreen" component={InstructionsScreen} />
        <Stack.Screen name="SettingsScreen" component={SettingsScreen} />
        <Stack.Screen name="AchievementsScreen" component={AchievementsScreen} />
        <Stack.Screen name="ForgeScreen" component={ForgeScreen} />
      </Stack.Navigator>
    </>
  );
};

export default StackNavigator;
