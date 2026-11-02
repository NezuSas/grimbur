import React, { useCallback, useMemo, useState } from "react";
import { ImageBackground, View, StyleSheet } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { RootStackParamList } from "../navigation/types";
import CoverCard from "../ui/components/CoverCard";
import NewsBanner from "../ui/components/NewsBanner";
import { EMPTY_STATS, LocalStats, streakStatus } from "../core/stats/runStats";
import { endlessProgress, isEndlessUnlocked } from "../core/stats/unlocks";
import { nextGoals } from "../core/stats/goals";
import { getLocalStats, openDailyChest, peekLocalStats, syncAchievements } from "../services/localStats";
import { chestStatus } from "../core/stats/dailyChest";
import { dailyPuzzleStars } from "../core/stats/puzzleProgress";
import DailyChestModal from "../ui/components/DailyChestModal";
import WhatsNewModal, { WHATS_NEW_ID } from "../ui/components/WhatsNewModal";
import { HERO_UNLOCKS, isHeroUnlocked } from "../core/stats/heroUnlocks";
import { claimableCount, syncMissions } from "../core/stats/missions";
import { syncReminders } from "../services/reminders";
import { maybeRequestReview } from "../services/storeReview";
import { dailyKey, msUntilNextDay } from "../core/engine/seed";
import { UPGRADES, canAfford } from "../core/stats/forge";
import { useSettingsStore } from "../state/settings/store";
import { collectionBadge } from "../core/skins/collection";
import { collectionMilestonesReached } from "../core/cosmetics/cosmetics";
import { useEntitlements } from "../state/entitlements/useEntitlements";
import { loadSavedRun, SavedRun } from "../services/savedRun";
import { flushPendingSubmits } from "../services/pendingSubmits";

import { emitSound } from "../audio/audioEventBus";

type Props = NativeStackScreenProps<RootStackParamList, "CoverScreen">;

const CoverScreen: React.FC<Props> = ({ navigation, route }) => {
  const calm = useSettingsStore(s => s.reduceFlash);
  const storySeen = useSettingsStore(s => s.storySeen);
  // What is new: once, for a player who already knew the cave (a newcomer meets it all by playing), after the daily chest.
  const newsSeen = useSettingsStore(s => s.hintsSeen.includes(WHATS_NEW_ID));
  const markHintSeen = useSettingsStore(s => s.markHintSeen);
  const tutorialSeen = useSettingsStore(s => s.tutorialSeen);
  const [stats, setStats] = useState<LocalStats>(() => peekLocalStats() ?? EMPTY_STATS);
  // The daily chest: offered once a day after the first run ever, when the cover is reached with nothing else pressing.
  const [chest, setChest] = useState<{ day: number; opened: { embers: number; freeze: boolean } | null; busy: boolean } | null>(null);
  const openChest = useCallback(() => {
    setChest(c => (c ? { ...c, busy: true } : c));
    openDailyChest()
      .then(r => {
        if (!r) return setChest(null);
        setStats(r.stats);
        setChest({ day: r.day, opened: { embers: r.embers, freeze: r.freeze }, busy: false });
      })
      .catch(() => setChest(null));
  }, []);
  // An expedition left half-way (or cut short by Android) can be continued from here.
  const [savedRun, setSavedRun] = useState<SavedRun | null>(null);
  useFocusEffect(
    useCallback(() => {
      let active = true;
      loadSavedRun()
        .then(run => {
          if (active) setSavedRun(run);
        })
        .catch(() => {});
      return () => {
        active = false;
      };
    }, []),
  );

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
          const box = chestStatus(loaded.chest, dailyKey());
          const chestDue = (loaded.gamesPlayed > 0 && box.ready) || (__DEV__ && !!route.params?.devChest);
          if (active && chestDue) setChest(c => c ?? { day: box.day, opened: __DEV__ && route.params?.devChest === "open" ? { embers: 25, freeze: false } : null, busy: false });
          void syncReminders(loaded); // the evening reminder moves on once the daily is played
          void flushPendingSubmits(); // results that could not reach the boards try again here
          // Let the cover settle before any rating dialog.
          if (active && !chestDue) timer = setTimeout(() => void maybeRequestReview(loaded), 1500);
        })
        .catch(() => {});
      return () => {
        active = false;
        clearTimeout(timer);
      };
    }, [route.params?.devChest])
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
  const collectionRewardsSeen = useSettingsStore(st => st.collectionRewardsSeen);
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
          savedRun={savedRun ? { floor: savedRun.state.level, endless: savedRun.state.mode === "endless" } : null}
          onPressResume={() => {
            if (!savedRun) return;
            navigation.navigate("GameScreen", {
              characterIndex: savedRun.characterIndex,
              skin: savedRun.skin,
              mode: savedRun.state.mode,
              ascension: savedRun.ascension,
              meta: savedRun.meta,
              resume: true,
            });
          }}
          onPressPlay={() => (stats.gamesPlayed === 0 && !storySeen ? navigation.navigate("StoryScreen") : navigation.navigate("CharactersScreen", { mode: "expedition" }))}
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
          tutorialPending={!tutorialSeen}
          forgeBadge={UPGRADES.some(u => canAfford(stats, u.id))}
          achievementsBadge={unlocked > achievementsSeen}
          collectionBadge={collectionBadge(stats) || collectionMilestonesReached(stats) > collectionRewardsSeen}
          missionsBadge={claimableCount(syncMissions(stats.missions, today, HERO_UNLOCKS.filter((_, i) => isHeroUnlocked(i, stats)).length)) > 0}
          onPressMissions={() => navigation.navigate("MissionsScreen")}
          onPressPuzzles={() => navigation.navigate("PuzzlesScreen")}
          puzzleWaiting={dailyPuzzleStars(stats.puzzles, today) === 0}
          onPressCollection={() => navigation.navigate("CollectionScreen")}
          onPressScores={() => navigation.navigate("HighScoresScreen")}
          onPressFriends={() => navigation.navigate("FriendsScreen")}
          onPressInstructions={() => navigation.navigate("InstructionsScreen")}
          onPressForge={() => navigation.navigate("ForgeScreen")}
          onPressAchievements={() => navigation.navigate("AchievementsScreen")}
          onPressSettings={() => navigation.navigate("SettingsScreen")}
        />
        <NewsBanner />
      </ImageBackground>
      {!chest && !newsSeen && (stats.gamesPlayed > 0 || (__DEV__ && !!route.params?.devNews)) ? (
        <WhatsNewModal
          onClose={() => markHintSeen(WHATS_NEW_ID)}
          onSeePuzzles={() => {
            markHintSeen(WHATS_NEW_ID);
            navigation.navigate("PuzzlesScreen");
          }}
          onSeePets={() => {
            markHintSeen(WHATS_NEW_ID);
            navigation.navigate("CollectionScreen", { category: "pet" });
          }}
        />
      ) : null}
      {chest ? <DailyChestModal day={chest.day} opened={chest.opened} busy={chest.busy} onOpen={openChest} onClose={() => setChest(null)} calm={calm} /> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#1B150F",
  },
});

export default CoverScreen;
