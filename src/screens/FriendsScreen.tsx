import React, { useCallback, useState } from "react";
import { ImageBackground, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Text from "../ui/components/Text";
import ScreenHeader from "../ui/components/ScreenHeader";
import { RootStackParamList } from "../navigation/types";
import { useT } from "../i18n/useT";
import type { TranslationKey } from "../i18n/en";
import { getRecentChallenges, type RecentChallenge } from "../services/challenges";
import { formatChallengeCode, parseChallengeCode } from "../core/challenge/code";
import { withUiScale } from "../ui/layout/scaledWindow";

type Props = NativeStackScreenProps<RootStackParamList, "FriendsScreen">;

const GOLD = "#FFD54F";

const ModeCard = ({ icon, tint, title, hint, onPress }: { icon: keyof typeof Ionicons.glyphMap; tint: string; title: string; hint: string; onPress: () => void }) => (
  <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${title}. ${hint}`} style={({ pressed }) => [styles.cardShadow, { shadowColor: tint }, pressed && { transform: [{ scale: 0.98 }] }]}>
    <LinearGradient colors={["#2F2458", "#171030"]} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={[styles.card, { borderColor: tint }]}>
      <View style={styles.lit} pointerEvents="none" />
      <View style={[styles.medallion, { borderColor: tint, backgroundColor: tint + "26" }]}>
        <Ionicons name={icon} size={30} color={tint} />
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={[styles.cardTitle, { color: tint }]} maxFontSizeMultiplier={1.2}>
          {title.toLocaleUpperCase()}
        </Text>
        <Text style={styles.cardHint} maxFontSizeMultiplier={1.3}>
          {hint}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={22} color="#b9b4d4" />
    </LinearGradient>
  </Pressable>
);

/**
 * Friends: the two ways to play against someone (a live duel, or a challenge to play whenever each one wants) and the challenges this
 * phone has opened, to play them again or see how the others did.
 */
const FriendsScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useT();
  const [recent, setRecent] = useState<RecentChallenge[]>([]);
  useFocusEffect(
    useCallback(() => {
      void getRecentChallenges().then(setRecent);
    }, []),
  );

  return (
    <ImageBackground fadeDuration={0} resizeMethod="none" source={require("../assets/sprites/backgrounds/Cover_Background.png")} style={styles.root} resizeMode="cover">
      <SafeAreaView style={{ flex: 1, backgroundColor: "rgba(6,4,16,0.9)" }}>
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
                          🔥 {depth}
                        </Text>
                      </View>
                      <View style={styles.best}>
                        <Text style={styles.bestLabel} maxFontSizeMultiplier={1.2}>
                          {t("friends.best").toLocaleUpperCase()}
                        </Text>
                        <Text style={styles.bestValue} maxFontSizeMultiplier={1.2}>
                          {c.best !== null ? c.best.toLocaleString() : "—"}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color="#8f8aab" />
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
  cards: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  cardSlot: { flexGrow: 1, flexBasis: 280, minWidth: 0 },
  cardShadow: { shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 10, borderRadius: 22 },
  card: { flexDirection: "row", alignItems: "center", gap: 14, borderRadius: 22, borderWidth: 2, padding: 16, overflow: "hidden", minHeight: 96 },
  lit: { position: "absolute", top: 0, left: 24, right: 24, height: 2, borderRadius: 1, backgroundColor: "rgba(255,255,255,0.22)" },
  medallion: { width: 56, height: 56, borderRadius: 28, borderWidth: 2.5, alignItems: "center", justifyContent: "center" },
  cardTitle: { fontWeight: "900", fontSize: 16, letterSpacing: 2 },
  cardHint: { color: "#d7d2ee", fontSize: 13, lineHeight: 18 },
  section: { color: GOLD, fontWeight: "900", fontSize: 13, letterSpacing: 2.2, marginTop: 8 },
  empty: { color: "#9f9abb", fontSize: 13.5, lineHeight: 19 },
  list: { gap: 8 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 56, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 16, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.1)", backgroundColor: "rgba(20,15,40,0.85)" },
  code: { color: "#fff", fontWeight: "900", fontSize: 18, letterSpacing: 3 },
  rowSub: { color: "#FF9A5C", fontWeight: "800", fontSize: 12 },
  best: { alignItems: "flex-end" },
  bestLabel: { color: "#8f8aab", fontWeight: "900", fontSize: 10, letterSpacing: 1.5 },
  bestValue: { color: "#9ee37d", fontWeight: "900", fontSize: 18 },
});
