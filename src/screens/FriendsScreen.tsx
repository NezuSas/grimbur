import React, { useCallback, useState } from "react";
import { ImageBackground, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Text from "../ui/components/Text";
import EmberIcon from "../ui/components/EmberIcon";
import ScreenHeader from "../ui/components/ScreenHeader";
import { RootStackParamList } from "../navigation/types";
import { useT } from "../i18n/useT";
import type { TranslationKey } from "../i18n/en";
import { getRecentChallenges, type RecentChallenge } from "../services/challenges";
import { formatChallengeCode, parseChallengeCode } from "../core/challenge/code";
import { withUiScale } from "../ui/layout/scaledWindow";
import { getDuelHistory } from "../services/duelHistory";
import { summarize, type DuelRecord } from "../core/duel/history";

type Props = NativeStackScreenProps<RootStackParamList, "FriendsScreen">;

const GOLD = "#FFD54F";

const ModeCard = ({ icon, tint, title, hint, onPress }: { icon: keyof typeof Ionicons.glyphMap; tint: string; title: string; hint: string; onPress: () => void }) => (
  <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${title}. ${hint}`} style={({ pressed }) => [styles.cardShadow, { shadowColor: tint }, pressed && { transform: [{ scale: 0.98 }] }]}>
    <LinearGradient colors={["#513E2B", "#2A2016"]} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={[styles.card, { borderColor: tint }]}>
      <View style={styles.lit} pointerEvents="none" />
      <View style={[styles.medallion, { borderColor: tint, backgroundColor: tint + "26" }]}>
        <Ionicons name={icon} size={30} color={tint} />
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={[styles.cardTitle, { color: tint }]} maxFontSizeMultiplier={1.2}>
          {title.toLocaleUpperCase()}
        </Text>
        <Text style={styles.cardHint} numberOfLines={3} maxFontSizeMultiplier={1.3}>
          {hint}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={22} color="#D6C4B2" />
    </LinearGradient>
  </Pressable>
);

/**
 * Friends: the two ways to play against someone (a live duel, or a challenge to play whenever each one wants) and the challenges this
 * phone has opened, to play them again or see how the others did.
 */
const FriendsScreen: React.FC<Props> = ({ navigation }) => {
  const { t, n } = useT();
  const [recent, setRecent] = useState<RecentChallenge[]>([]);
  const [history, setHistory] = useState<DuelRecord[]>([]);
  useFocusEffect(
    useCallback(() => {
      void getRecentChallenges().then(setRecent);
      void getDuelHistory().then(setHistory);
    }, []),
  );

  return (
    <ImageBackground fadeDuration={0} resizeMethod="none" source={require("../assets/sprites/backgrounds/Cover_Background.png")} style={styles.root} resizeMode="cover">
      <SafeAreaView style={{ flex: 1, backgroundColor: "rgba(13, 10, 7,0.9)" }}>
        <ScreenHeader title={t("friends.title")} subtitle={t("friends.subtitle")} onBack={() => navigation.goBack()} />
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.inner}>
            <View style={styles.cards}>
              <View style={styles.cardSlot}>
                <ModeCard icon="flash" tint="#FF8A80" title={t("duel.open")} hint={t("duel.openHint")} onPress={() => navigation.navigate("DuelScreen")} />
              </View>
              <View style={styles.cardSlot}>
                <ModeCard icon="extension-puzzle" tint="#4FC3F7" title={t("challenge.open")} hint={t("challenge.openHint")} onPress={() => navigation.navigate("ChallengeScreen")} />
              </View>
            </View>

            <Text style={styles.section} accessibilityRole="header" maxFontSizeMultiplier={1.2}>
              {t("duel.history").toLocaleUpperCase()}
            </Text>
            {history.length === 0 ? (
              <Text style={styles.empty} maxFontSizeMultiplier={1.3}>
                {t("duel.historyEmpty")}
              </Text>
            ) : (
              <>
                {(() => {
                  const s = summarize(history);
                  return (
                    <Text style={styles.summary} maxFontSizeMultiplier={1.2}>
                      {t("duel.historySummary", { won: s.won, lost: s.lost, tied: s.tied })}  ·  {t("duel.historyNet", { n: `${s.net > 0 ? "+" : ""}${n(s.net)}` })}
                    </Text>
                  );
                })()}
                <View style={styles.list}>
                  {history.slice(0, 8).map(r => {
                    const color = r.outcome === "won" ? "#9EE37D" : r.outcome === "lost" ? "#FF8A80" : "#FFD54F";
                    return (
                      <View key={r.code} style={styles.row} accessible accessibilityLabel={`${formatChallengeCode(r.code)}. ${t(`duel.outcome.${r.outcome}` as TranslationKey)}. ${r.net}`}>
                        <View style={[styles.outcome, { borderColor: color }]}>
                          <Text style={[styles.outcomeText, { color }]} maxFontSizeMultiplier={1.1}>
                            {t(`duel.outcome.${r.outcome}` as TranslationKey).toLocaleUpperCase()}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.code} numberOfLines={1} maxFontSizeMultiplier={1.2}>{formatChallengeCode(r.code)}</Text>
                          <Text style={styles.rowSub} numberOfLines={1} maxFontSizeMultiplier={1.2}>{r.total > 2 ? t("duel.historyPlace", { n: r.placement, total: r.total }) : new Date(r.at).toLocaleDateString()}</Text>
                        </View>
                        <Text style={[styles.bestValue, { color: r.net < 0 ? "#FF8A80" : r.net > 0 ? "#9ee37d" : "#D6C4B2" }]} maxFontSizeMultiplier={1.2}>
                          {r.stake > 0 ? <><EmberIcon size={11} /> {`${r.net > 0 ? "+" : ""}${n(r.net)}`}</> : "—"}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </>
            )}

            <Text style={styles.section} accessibilityRole="header" maxFontSizeMultiplier={1.2}>
              {t("challenge.recent").toLocaleUpperCase()}
            </Text>
            {recent.length === 0 ? (
              <Text style={styles.empty} maxFontSizeMultiplier={1.3}>
                {t("friends.noRecent")}
              </Text>
            ) : (
              <View style={styles.list}>
                {recent.map(c => {
                  const parsed = parseChallengeCode(c.code);
                  const depth = parsed ? t(`ascension.label.${parsed.depth}` as TranslationKey) : "";
                  return (
                    <Pressable key={c.code} onPress={() => navigation.navigate("ChallengeScreen", { code: c.code })} accessibilityRole="button" accessibilityLabel={`${formatChallengeCode(c.code)}. ${depth}. ${c.best !== null ? c.best : t("friends.notPlayed")}`} style={({ pressed }) => [styles.row, pressed && { opacity: 0.8 }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.code} numberOfLines={1} maxFontSizeMultiplier={1.2}>
                          {formatChallengeCode(c.code)}
                        </Text>
                        <Text style={styles.rowSub} numberOfLines={1} maxFontSizeMultiplier={1.2}>
                          <EmberIcon size={11} /> {depth}
                        </Text>
                      </View>
                      <View style={styles.best}>
                        <Text style={styles.bestLabel} maxFontSizeMultiplier={1.2}>
                          {t("friends.best").toLocaleUpperCase()}
                        </Text>
                        <Text style={styles.bestValue} maxFontSizeMultiplier={1.2}>
                          {c.best !== null ? n(c.best) : "—"}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color="#B99A7C" />
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </ImageBackground>
  );
};

export default withUiScale(FriendsScreen);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  content: { padding: 14, alignItems: "center" },
  inner: { width: "100%", maxWidth: 760, gap: 12 },
  cards: { flexDirection: "row", flexWrap: "wrap", gap: 12, alignItems: "stretch" },
  cardSlot: { flexGrow: 1, flexBasis: 280, minWidth: 0 },
  cardShadow: { flex: 1, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 10, borderRadius: 22 },
  card: { flex: 1, flexDirection: "row", alignItems: "center", gap: 14, borderRadius: 22, borderWidth: 2, padding: 16, overflow: "hidden", minHeight: 104 },
  lit: { position: "absolute", top: 0, left: 24, right: 24, height: 2, borderRadius: 1, backgroundColor: "rgba(255,255,255,0.22)" },
  medallion: { width: 56, height: 56, borderRadius: 28, borderWidth: 2.5, alignItems: "center", justifyContent: "center" },
  cardTitle: { fontWeight: "900", fontSize: 16, letterSpacing: 2 },
  cardHint: { color: "#E9E0D7", fontSize: 13, lineHeight: 18 },
  section: { color: GOLD, fontWeight: "900", fontSize: 13, letterSpacing: 2.2, marginTop: 8 },
  summary: { color: "#E9E0D7", fontWeight: "800", fontSize: 13 },
  outcome: { minWidth: 74, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 10, borderWidth: 1.5, alignItems: "center" },
  outcomeText: { fontWeight: "900", fontSize: 11, letterSpacing: 1 },
  empty: { color: "#C4AA91", fontSize: 13.5, lineHeight: 19 },
  list: { gap: 8 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 56, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 16, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.1)", backgroundColor: "rgba(36, 28, 19,0.85)" },
  code: { color: "#fff", fontWeight: "900", fontSize: 18, letterSpacing: 3 },
  rowSub: { color: "#FF9A5C", fontWeight: "800", fontSize: 12 },
  best: { alignItems: "flex-end" },
  bestLabel: { color: "#B99A7C", fontWeight: "900", fontSize: 10, letterSpacing: 1.5 },
  bestValue: { color: "#9ee37d", fontWeight: "900", fontSize: 18 },
});
