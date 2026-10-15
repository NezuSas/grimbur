import React, { useCallback, useMemo, useState } from "react";
import { ImageBackground, View, StyleSheet } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { RootStackParamList } from "../navigation/types";
import CoverCard from "../ui/components/CoverCard";
import { EMPTY_STATS, LocalStats, streakStatus } from "../core/stats/runStats";
import { endlessProgress, isEndlessUnlocked } from "../core/stats/unlocks";
import { nextGoals } from "../core/stats/goals";
import { getLocalStats, peekLocalStats, syncAchievements } from "../services/localStats";
import { maybeRequestReview } from "../services/storeReview";
import { dailyKey, msUntilNextDay } from "../core/engine/seed";
import { UPGRADES, canAfford } from "../core/stats/forge";
import { useSettingsStore } from "../state/settings/store";
import { collectionBadge } from "../core/skins/collection";
import { useEntitlements } from "../state/entitlements/useEntitlements";

import { emitSound } from "../audio/audioEventBus";

type Props = NativeStackScreenProps<RootStackParamList, "CoverScreen">;

const CoverScreen: React.FC<Props> = ({ navigation }) => {
  const [stats, setStats] = useState<LocalStats>(() => peekLocalStats() ?? EMPTY_STATS);

  useFocusEffect(
    useCallback(() => {
      emitSound('COVER_SCREEN_START');
      let active = true;
      let timer: ReturnType<typeof setTimeout> | undefined;
      syncAchievements()
        .then(r => r.stats)
        .catch(() => getLocalStats())
        .then(loaded => {
          setStats(loaded);
          // Let the cover settle before any rating dialog.
          if (active) timer = setTimeout(() => void maybeRequestReview(loaded), 1500);
        })
        .catch(() => {});
      return () => {
        active = false;
        clearTimeout(timer);
      };
    }, [])
  );

  // The clock ticks once a minute so the countdown and the day itself roll over while the cover is open.
  const [now, setNow] = useState(() => new Date());
  useFocusEffect(
    useCallback(() => {
      setNow(new Date());
      const id = setInterval(() => setNow(new Date()), 30_000);
      return () => clearInterval(id);
    }, []),
  );
  const today = dailyKey(now);
  const streak = useMemo(() => streakStatus(stats, today), [stats, today]);
  const goal = useMemo(() => nextGoals(stats, 1)[0] ?? null, [stats]);
  const achievementsSeen = useSettingsStore(st => st.achievementsSeen);
  const unlocked = Object.keys(stats.achievements).length;
  // Endless is part of the paid full game (only when monetisation is on and the unlock is not owned).
  const { modeLocked } = useEntitlements();
  const endlessPaywalled = modeLocked("endless");

  return (
    <View style={styles.root}>
      <ImageBackground
      fadeDuration={0}
      resizeMethod="none"
        source={require("../assets/sprites/backgrounds/Cover_Background.png")}
        style={StyleSheet.absoluteFill}
        imageStyle={{ width: "100%", height: "100%" }}
        resizeMode="cover"
      >
        <CoverCard
          onPressPlay={() => navigation.navigate("CharactersScreen", { mode: "expedition" })}
          onPressDaily={() => navigation.navigate("CharactersScreen", { mode: "daily" })}
          onPressEndless={() =>
            endlessPaywalled ? navigation.navigate("PaywallScreen", { source: "endless" }) : navigation.navigate("CharactersScreen", { mode: "endless" })
          }
          endlessPaywalled={endlessPaywalled}
          streak={streak.current}
          streakLost={streak.lost}
          bestStreak={streak.best}
          freezeWillSave={streak.freezeWillSave}
          msLeft={msUntilNextDay(now)}
          goal={goal}
          endlessProgress={endlessProgress(stats)}
          dailyDone={stats.daily?.date === today}
          endlessUnlocked={isEndlessUnlocked(stats)}
          bestEndlessFloor={stats.bestEndlessFloor}
          embers={stats.embers}
          bestScore={stats.bestScore}
          bestFloor={stats.bestLevel}
          firstRun={stats.gamesPlayed === 0}
          forgeBadge={UPGRADES.some(u => canAfford(stats, u.id))}
          achievementsBadge={unlocked > achievementsSeen}
          collectionBadge={collectionBadge(stats)}
          onPressCollection={() => navigation.navigate("CollectionScreen")}
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
    backgroundColor: "#0E0B1F",
  },
});

export default CoverScreen;
