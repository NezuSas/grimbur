import React, { useCallback, useState } from "react";
import { ImageBackground, ScrollView, StyleSheet, View } from "react-native";
import type { ImageSourcePropType } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Text from "../ui/components/Text";
import EmberIcon from "../ui/components/EmberIcon";
import ScreenHeader from "../ui/components/ScreenHeader";
import PressScale from "../ui/components/PressScale";
import Rise, { riseDelay } from "../ui/components/Rise";
import SpriteImage from "../ui/components/SpriteImage";
import { PlayerPortrait, PlayerTitle } from "../ui/components/PlayerPortrait";
import { RootStackParamList } from "../navigation/types";
import { useT } from "../i18n/useT";
import type { TranslationKey } from "../i18n/en";
import { getRecentChallenges, type RecentChallenge } from "../services/challenges";
import { formatChallengeCode, parseChallengeCode } from "../core/challenge/code";
import { useWindowDimensions, withUiScale } from "../ui/layout/scaledWindow";
import { useGameLayout } from "../ui/layout/useGameLayout";
import { getDuelHistory } from "../services/duelHistory";
import { summarize, type DuelRecord } from "../core/duel/history";
import { getPlayerName } from "../services/playerProfile";
import { getLocalStats, peekLocalStats } from "../services/localStats";
import { EMPTY_STATS, type LocalStats } from "../core/stats/runStats";
import { lookOf } from "../core/cosmetics/look";
import { equippedSkin } from "../core/skins/ownership";
import { skinArt } from "../data/skinArt";
import { useSettingsStore } from "../state/settings/store";

type Props = NativeStackScreenProps<RootStackParamList, "FriendsScreen">;
type Tab = "duels" | "challenges";

const GOLD = "#FFD54F";
const DUEL = "#FF8A80";
const CHALLENGE = "#4FC3F7";
const OUTCOME_COLOR = { won: "#9EE37D", lost: "#FF8A80", tie: "#FFD54F" } as const;

const SWORDS = require("../assets/sprites/ui/Icon_Swords.png");
const PUZZLE = require("../assets/sprites/ui/Icon_Puzzle.png");

const ModeCard = ({ art, tint, title, hint, onPress, delay }: { art: ImageSourcePropType; tint: string; title: string; hint: string; onPress: () => void; delay: number }) => (
  <Rise delay={delay}>
    <PressScale onPress={onPress} depth={0.96} accessibilityRole="button" accessibilityLabel={`${title}. ${hint}`} style={[styles.cardShadow, { shadowColor: tint }]}>
      <LinearGradient colors={["#513E2B", "#2A2016"]} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={[styles.card, { borderColor: tint }]}>
        <View style={styles.lit} pointerEvents="none" />
        <View style={[styles.cardGlow, { backgroundColor: tint }]} pointerEvents="none" />
        <SpriteImage source={art} style={styles.cardArt} resizeMode="contain" accessibilityIgnoresInvertColors />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[styles.cardTitle, { color: tint }]} numberOfLines={1} maxFontSizeMultiplier={1.15}>
            {title.toLocaleUpperCase()}
          </Text>
          <Text style={styles.cardHint} numberOfLines={2} maxFontSizeMultiplier={1.2}>
            {hint}
          </Text>
        </View>
        <View style={[styles.go, { backgroundColor: tint }]}>
          <Ionicons name="chevron-forward" size={18} color="#1a0f00" />
        </View>
      </LinearGradient>
    </PressScale>
  </Rise>
);

/** What a tab shows while it has nothing: the mode's emblem, what will land here and a way to start. */
const Empty = ({ art, tint, text, action, onPress }: { art: ImageSourcePropType; tint: string; text: string; action: string; onPress: () => void }) => (
  <Rise style={styles.empty}>
    <SpriteImage source={art} style={styles.emptyArt} resizeMode="contain" accessibilityIgnoresInvertColors />
    <Text style={styles.emptyText} maxFontSizeMultiplier={1.25}>
      {text}
    </Text>
    <PressScale onPress={onPress} style={[styles.emptyButton, { borderColor: tint, backgroundColor: tint + "22" }]} accessibilityRole="button" accessibilityLabel={action}>
      <Text style={[styles.emptyButtonText, { color: tint }]} maxFontSizeMultiplier={1.15}>
        {action.toLocaleUpperCase()}
      </Text>
    </PressScale>
  </Rise>
);

/**
 * Friends: the player as the others see them (hero, frame, title, duel record), the two ways to play against someone (a live duel,
 * or a challenge each one plays whenever they want) and what this phone has played: finished duels and the challenges it opened.
 */
const FriendsScreen: React.FC<Props> = ({ navigation }) => {
  const { t, n } = useT();
  const { width } = useWindowDimensions();
  const { insets } = useGameLayout();
  const lastHero = useSettingsStore(s => s.lastHero);
  const [recent, setRecent] = useState<RecentChallenge[]>([]);
  const [history, setHistory] = useState<DuelRecord[]>([]);
  const [name, setName] = useState<string | null>(null);
  const [stats, setStats] = useState<LocalStats>(() => peekLocalStats() ?? EMPTY_STATS);
  const [tab, setTab] = useState<Tab>("duels");

  useFocusEffect(
    useCallback(() => {
      void getRecentChallenges().then(setRecent);
      void getDuelHistory().then(setHistory);
      void getPlayerName().then(setName);
      void getLocalStats().then(setStats);
    }, []),
  );

  const narrow = width < 640;
  const hero = Math.max(0, lastHero ?? 0);
  const portrait = skinArt(hero, equippedSkin(stats, hero)).scoreImage;
  const look = lookOf(stats);
  const s = summarize(history);
  const played = s.won + s.lost + s.tied;

  const openDuel = () => navigation.navigate("DuelScreen");
  const openChallenge = (code?: string) => navigation.navigate("ChallengeScreen", code ? { code } : undefined);

  const playerCard = (
    <Rise style={[styles.player, narrow && styles.playerNarrow]}>
      <Text style={styles.section} maxFontSizeMultiplier={1.1}>
        {t("friends.card").toLocaleUpperCase()}
      </Text>
      <View style={styles.playerTop}>
        <PlayerPortrait source={portrait} size={narrow ? 72 : 92} frame={look.frame} />
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={[styles.playerName, !name && styles.playerNoName]} numberOfLines={2} maxFontSizeMultiplier={1.15}>
            {name ?? t("friends.noName")}
          </Text>
          <PlayerTitle title={look.title} />
        </View>
      </View>

      <View style={styles.record} accessible accessibilityLabel={t("duel.historySummary", { won: s.won, lost: s.lost, tied: s.tied })}>
        {(
          [
            ["won", s.won],
            ["lost", s.lost],
            ["tie", s.tied],
          ] as const
        ).map(([k, v]) => (
          <View key={k} style={styles.recordCell}>
            <Text style={[styles.recordValue, { color: OUTCOME_COLOR[k] }]} maxFontSizeMultiplier={1.1}>
              {v}
            </Text>
            <Text style={styles.recordLabel} numberOfLines={1} maxFontSizeMultiplier={1.05}>
              {t(`friends.stat.${k}` as TranslationKey).toLocaleUpperCase()}
            </Text>
          </View>
        ))}
      </View>
      <View style={styles.netRow} accessible accessibilityLabel={t("duel.historyNet", { n: `${s.net > 0 ? "+" : ""}${n(s.net)}` })}>
        <EmberIcon size={14} />
        <Text style={styles.netLabel} maxFontSizeMultiplier={1.1}>
          {t("friends.net")}
        </Text>
        <Text style={[styles.netValue, { color: s.net < 0 ? "#FF8A80" : s.net > 0 ? "#9EE37D" : "#D6C4B2" }]} maxFontSizeMultiplier={1.1}>
          {played > 0 ? `${s.net > 0 ? "+" : ""}${n(s.net)}` : "—"}
        </Text>
      </View>

      <PressScale
        onPress={() => navigation.navigate("CollectionScreen", { category: look.frame ? "title" : "frame" })}
        style={styles.customize}
        accessibilityRole="button"
        accessibilityLabel={t("friends.customize")}
      >
        <Ionicons name="color-palette" size={16} color={GOLD} />
        <Text style={styles.customizeText} maxFontSizeMultiplier={1.1}>
          {t("friends.customize").toLocaleUpperCase()}
        </Text>
      </PressScale>
    </Rise>
  );

  const duels = history.length === 0 ? (
    <Empty art={SWORDS} tint={DUEL} text={t("duel.historyEmpty")} action={t("friends.startDuel")} onPress={openDuel} />
  ) : (
    history.slice(0, 12).map((r, i) => {
      const color = OUTCOME_COLOR[r.outcome];
      return (
        <Rise key={r.code} delay={riseDelay(i)} style={[styles.row, { borderLeftColor: color }]} accessible accessibilityLabel={`${formatChallengeCode(r.code)}. ${t(`duel.outcome.${r.outcome}` as TranslationKey)}. ${r.net}`}>
          <View style={[styles.outcome, { borderColor: color, backgroundColor: color + "1F" }]}>
            <Text style={[styles.outcomeText, { color }]} numberOfLines={1} maxFontSizeMultiplier={1.05}>
              {t(`duel.outcome.${r.outcome}` as TranslationKey).toLocaleUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.code} numberOfLines={1} maxFontSizeMultiplier={1.15}>
              {formatChallengeCode(r.code)}
            </Text>
            <Text style={styles.rowSub} numberOfLines={1} maxFontSizeMultiplier={1.15}>
              {r.total > 2 ? `${t("duel.historyPlace", { n: r.placement, total: r.total })} · ` : ""}
              {new Date(r.at).toLocaleDateString()}
            </Text>
          </View>
          <Text style={[styles.rowValue, { color: r.net < 0 ? "#FF8A80" : r.net > 0 ? "#9EE37D" : "#D6C4B2" }]} maxFontSizeMultiplier={1.15}>
            {r.stake > 0 ? (
              <>
                <EmberIcon size={12} /> {`${r.net > 0 ? "+" : ""}${n(r.net)}`}
              </>
            ) : (
              "—"
            )}
          </Text>
        </Rise>
      );
    })
  );

  const challenges = recent.length === 0 ? (
    <Empty art={PUZZLE} tint={CHALLENGE} text={t("friends.noRecent")} action={t("friends.startChallenge")} onPress={() => openChallenge()} />
  ) : (
    recent.map((c, i) => {
      const parsed = parseChallengeCode(c.code);
      const depth = parsed ? t(`ascension.label.${parsed.depth}` as TranslationKey) : "";
      return (
        <Rise key={c.code} delay={riseDelay(i)}>
          <PressScale
            onPress={() => openChallenge(c.code)}
            depth={0.97}
            accessibilityRole="button"
            accessibilityLabel={`${formatChallengeCode(c.code)}. ${depth}. ${c.best !== null ? c.best : t("friends.notPlayed")}`}
            style={[styles.row, { borderLeftColor: CHALLENGE }]}
          >
            <SpriteImage source={PUZZLE} style={styles.rowArt} resizeMode="contain" accessibilityIgnoresInvertColors />
            <View style={{ flex: 1 }}>
              <Text style={styles.code} numberOfLines={1} maxFontSizeMultiplier={1.15}>
                {formatChallengeCode(c.code)}
              </Text>
              <Text style={[styles.rowSub, { color: "#FF9A5C" }]} numberOfLines={1} maxFontSizeMultiplier={1.15}>
                {depth}
              </Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.bestLabel} maxFontSizeMultiplier={1.1}>
                {t("friends.best").toLocaleUpperCase()}
              </Text>
              <Text style={[styles.rowValue, c.best === null && { color: "#B99A7C", fontSize: 13 }]} maxFontSizeMultiplier={1.15}>
                {c.best !== null ? n(c.best) : t("friends.notPlayed")}
              </Text>
            </View>
            <Ionicons name="play-circle" size={26} color={CHALLENGE} />
          </PressScale>
        </Rise>
      );
    })
  );

  return (
    <ImageBackground fadeDuration={0} resizeMethod="none" source={require("../assets/sprites/backgrounds/Cover_Background.png")} style={styles.root} resizeMode="cover">
      <SafeAreaView style={{ flex: 1, backgroundColor: "rgba(13, 10, 7,0.9)" }} edges={["top", "left", "right"]}>
        <ScreenHeader title={t("friends.title")} subtitle={t("friends.subtitle")} onBack={() => navigation.goBack()} />
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[styles.body, narrow && styles.bodyNarrow, { paddingBottom: Math.max(insets.bottom, 10) + 6 }]}
          showsVerticalScrollIndicator={false}
        >
          {playerCard}

          <View style={styles.main}>
            <View style={styles.cards}>
              <ModeCard art={SWORDS} tint={DUEL} title={t("duel.open")} hint={t("duel.openHint")} onPress={openDuel} delay={60} />
              <ModeCard art={PUZZLE} tint={CHALLENGE} title={t("challenge.open")} hint={t("challenge.openHint")} onPress={() => openChallenge()} delay={120} />
            </View>

            <View style={styles.tabs}>
              {(
                [
                  ["duels", t("friends.tabDuels"), history.length, DUEL],
                  ["challenges", t("friends.tabChallenges"), recent.length, CHALLENGE],
                ] as const
              ).map(([k, label, count, tint]) => {
                const on = tab === k;
                return (
                  <PressScale
                    key={k}
                    onPress={() => setTab(k)}
                    style={[styles.tab, on && { borderColor: tint, backgroundColor: tint + "22" }]}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: on }}
                    accessibilityLabel={`${label}. ${count}`}
                  >
                    <Text style={[styles.tabText, on && { color: tint }]} maxFontSizeMultiplier={1.1}>
                      {label.toLocaleUpperCase()}
                    </Text>
                    {count > 0 ? (
                      <View style={[styles.tabCount, { backgroundColor: on ? tint : "rgba(255,255,255,0.14)" }]}>
                        <Text style={[styles.tabCountText, on && { color: "#1a0f00" }]} maxFontSizeMultiplier={1.05}>
                          {count}
                        </Text>
                      </View>
                    ) : null}
                  </PressScale>
                );
              })}
            </View>

            <View key={tab} style={styles.list}>
              {tab === "duels" ? duels : challenges}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ImageBackground>
  );
};

export default withUiScale(FriendsScreen);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  body: { flexDirection: "row", alignItems: "flex-start", gap: 14, paddingHorizontal: 14, paddingTop: 4, width: "100%", maxWidth: 1100, alignSelf: "center" },
  bodyNarrow: { flexDirection: "column", alignItems: "stretch" },
  section: { color: GOLD, fontWeight: "900", fontSize: 11, letterSpacing: 2 },

  player: { width: "32%", maxWidth: 340, gap: 10, padding: 14, borderRadius: 20, borderWidth: 1.5, borderColor: "rgba(255,213,79,0.45)", backgroundColor: "rgba(48,36,22,0.88)" },
  playerNarrow: { width: "100%", maxWidth: undefined },
  playerTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  playerName: { color: "#fff", fontWeight: "900", fontSize: 18 },
  playerNoName: { color: "#B99A7C", fontStyle: "italic", fontSize: 15 },
  record: { flexDirection: "row", gap: 6 },
  recordCell: { flex: 1, alignItems: "center", paddingVertical: 6, borderRadius: 12, backgroundColor: "rgba(0,0,0,0.28)" },
  recordValue: { fontWeight: "900", fontSize: 20 },
  recordLabel: { color: "#C4AA91", fontWeight: "800", fontSize: 9.5, letterSpacing: 0.8 },
  netRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 4 },
  netLabel: { color: "#D6C4B2", fontWeight: "800", fontSize: 13, flex: 1 },
  netValue: { fontWeight: "900", fontSize: 16 },
  customize: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, minHeight: 40, borderRadius: 20, borderWidth: 1.5, borderColor: "rgba(255,213,79,0.6)", backgroundColor: "rgba(255,213,79,0.1)" },
  customizeText: { color: GOLD, fontWeight: "900", fontSize: 12, letterSpacing: 1 },

  main: { flex: 1, gap: 10 },
  cards: { gap: 8 },
  cardShadow: { shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 10, borderRadius: 20 },
  card: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 20, borderWidth: 2, paddingVertical: 10, paddingLeft: 8, paddingRight: 10, overflow: "hidden", minHeight: 72 },
  lit: { position: "absolute", top: 0, left: 24, right: 24, height: 2, borderRadius: 1, backgroundColor: "rgba(255,255,255,0.22)" },
  cardGlow: { position: "absolute", left: -20, top: -20, width: 110, height: 110, borderRadius: 55, opacity: 0.12 },
  cardArt: { width: 56, height: 56 },
  cardTitle: { fontWeight: "900", fontSize: 15, letterSpacing: 1.5 },
  cardHint: { color: "#E9E0D7", fontSize: 12, lineHeight: 16 },
  go: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },

  tabs: { flexDirection: "row", gap: 8 },
  tab: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 36, paddingHorizontal: 14, borderRadius: 18, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.18)" },
  tabText: { color: "#EAE1D8", fontWeight: "900", fontSize: 12, letterSpacing: 1 },
  tabCount: { minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 5, alignItems: "center", justifyContent: "center" },
  tabCountText: { color: "#EAE1D8", fontWeight: "900", fontSize: 11 },

  list: { gap: 8 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 56, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 14, borderWidth: 1.5, borderLeftWidth: 4, borderColor: "rgba(255,255,255,0.1)", backgroundColor: "rgba(36, 28, 19,0.88)" },
  rowArt: { width: 34, height: 34 },
  outcome: { minWidth: 76, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 10, borderWidth: 1.5, alignItems: "center" },
  outcomeText: { fontWeight: "900", fontSize: 11, letterSpacing: 1 },
  code: { color: "#fff", fontWeight: "900", fontSize: 17, letterSpacing: 3 },
  rowSub: { color: "#C4AA91", fontWeight: "800", fontSize: 12 },
  rowValue: { color: "#9EE37D", fontWeight: "900", fontSize: 17 },
  bestLabel: { color: "#B99A7C", fontWeight: "900", fontSize: 10, letterSpacing: 1.5 },

  empty: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 16, borderWidth: 1.5, borderStyle: "dashed", borderColor: "rgba(255,255,255,0.18)", backgroundColor: "rgba(36,28,19,0.6)", flexWrap: "wrap" },
  emptyArt: { width: 48, height: 48, opacity: 0.55 },
  emptyText: { flex: 1, minWidth: 160, color: "#C4AA91", fontSize: 13, lineHeight: 18 },
  emptyButton: { minHeight: 38, paddingHorizontal: 14, borderRadius: 19, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  emptyButtonText: { fontWeight: "900", fontSize: 12, letterSpacing: 1 },
});
