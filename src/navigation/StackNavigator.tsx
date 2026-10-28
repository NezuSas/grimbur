import React from "react";
import { StatusBar } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { RootStackParamList } from "./types";

import CoverScreen from "../screens/CoverScreen";
import CharactersScreen from "../screens/CharactersScreen";
import StoryScreen from "../screens/StoryScreen";
import MissionsScreen from "../screens/MissionsScreen";
import CollectionScreen from "../screens/CollectionScreen";
import GameScreen from "../screens/GameScreen";
import LessonScreen from "../screens/LessonScreen";
import TutorialScreen from "../screens/TutorialScreen";
import HighScoresScreen from "../screens/HighScoresScreen";
import ChallengeScreen from "../screens/ChallengeScreen";
import DuelScreen from "../screens/DuelScreen";
import FriendsScreen from "../screens/FriendsScreen";
import ProgressScreen from "../screens/ProgressScreen";
import LevelCompleteScreen from "../screens/LevelCompleteScreen";
import InstructionsScreen from "../screens/InstructionsScreen";
import SettingsScreen from "../screens/SettingsScreen";
import AchievementsScreen from "../screens/AchievementsScreen";
import ForgeScreen from "../screens/ForgeScreen";
import PaywallScreen from "../screens/PaywallScreen";
import { withUiScale } from "../ui/layout/scaledWindow";

// Menu screens grow on big windows (tablets); on phones the scale is 1 and nothing changes.
const ScaledMissionsScreen = withUiScale(MissionsScreen);
const ScaledCollectionScreen = withUiScale(CollectionScreen);
const ScaledHighScoresScreen = withUiScale(HighScoresScreen);
const ScaledProgressScreen = withUiScale(ProgressScreen);
const ScaledInstructionsScreen = withUiScale(InstructionsScreen);
const ScaledSettingsScreen = withUiScale(SettingsScreen);
const ScaledAchievementsScreen = withUiScale(AchievementsScreen);
const ScaledForgeScreen = withUiScale(ForgeScreen);
const ScaledStoryScreen = withUiScale(StoryScreen);

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * A swipe from the screen edge goes back in a native stack (on iPads and iPhones, from anywhere with the full-screen
 * variant). That is off on EVERY screen: during a run a finger sliding across the board would silently throw the game
 * away, the hero screen uses horizontal swipes to flip through the heroes, and the menus all have their own Back
 * button. The system Back button of Android still works (a run pauses instead, see GameScreen).
 */
const NO_SWIPE_BACK = { gestureEnabled: false, fullScreenGestureEnabled: false } as const;

const StackNavigator: React.FC = () => {
  return (
    <>
      <StatusBar hidden />
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          // A short fade between screens instead of a cut (the stack is landscape-only, so a slide would cross the whole phone).
          animation: "fade",
          animationDuration: 220,
          contentStyle: { backgroundColor: "#000" },
          // Screens under the one in front stop rendering (their animations and timers stop with them) until they come back.
          freezeOnBlur: true,
          ...NO_SWIPE_BACK,
        }}
      >
        <Stack.Screen name="CoverScreen" component={CoverScreen} />
        <Stack.Screen name="StoryScreen" component={ScaledStoryScreen} />
        <Stack.Screen name="MissionsScreen" component={ScaledMissionsScreen} />
        <Stack.Screen name="CharactersScreen" component={CharactersScreen} />
        <Stack.Screen name="CollectionScreen" component={ScaledCollectionScreen} />
        <Stack.Screen name="TutorialScreen" component={TutorialScreen} />
        <Stack.Screen name="LessonScreen" component={LessonScreen} />
        <Stack.Screen name="GameScreen" component={GameScreen} />
        <Stack.Screen name="HighScoresScreen" component={ScaledHighScoresScreen} />
        <Stack.Screen name="FriendsScreen" component={FriendsScreen} />
        <Stack.Screen name="ChallengeScreen" component={ChallengeScreen} />
        <Stack.Screen name="DuelScreen" component={DuelScreen} />
        <Stack.Screen name="ProgressScreen" component={ScaledProgressScreen} />
        <Stack.Screen name="LevelCompleteScreen" component={LevelCompleteScreen} />
        <Stack.Screen name="InstructionsScreen" component={ScaledInstructionsScreen} />
        <Stack.Screen name="SettingsScreen" component={ScaledSettingsScreen} />
        <Stack.Screen name="AchievementsScreen" component={ScaledAchievementsScreen} />
        <Stack.Screen name="ForgeScreen" component={ScaledForgeScreen} />
        <Stack.Screen name="PaywallScreen" component={PaywallScreen} />
      </Stack.Navigator>
    </>
  );
};

export default StackNavigator;
