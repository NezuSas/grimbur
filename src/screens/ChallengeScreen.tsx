import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, ImageBackground, ScrollView, Share, StyleSheet, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";
import Text from "../ui/components/Text";
import ScreenHeader from "../ui/components/ScreenHeader";
import GlyphIcon from "../ui/components/GlyphIcon";
import FriendCreateJoin from "../ui/components/friends/FriendCreateJoin";
import { PopButton, PopupPanel } from "../ui/components/game/popup";
import { RootStackParamList } from "../navigation/types";
import { useT } from "../i18n/useT";
import type { TranslationKey } from "../i18n/en";
import characters from "../data/characters";
import { formatTime } from "../shared/utils/formatTime";
import { getPlayerId } from "../services/playerProfile";
import { formatChallengeCode, newChallenge, parseChallengeCode } from "../core/challenge/code";
import { loadChallengeBoard, rememberChallenge, type ChallengeDoc } from "../services/challenges";
import { GAME_CONFIG } from "../config/gameConfig";
import { withUiScale } from "../ui/layout/scaledWindow";
import { PlayerPortrait, PlayerTitle } from "../ui/components/PlayerPortrait";

type Props = NativeStackScreenProps<RootStackParamList, "ChallengeScreen">;

const GOLD = "#FFD54F";
const TINT = "#4FC3F7";

/**
 * A friend challenge: the same cave for whoever has the code, played whenever each one wants. Without a code this screen creates one or
 * joins one; with a code it shows the code, how to play it and the results of everyone who did.
 */
const ChallengeScreen: React.FC<Props> = ({ navigation, route }) => {
  const { t, n } = useT();
  const code = route.params?.code ?? null;
  const challenge = code ? parseChallengeCode(code) : null;
  const challengeCode = challenge?.code ?? null;

  const [copied, setCopied] = useState(false);
  const [rows, setRows] = useState<ChallengeDoc[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [myId, setMyId] = useState<string | null>(null);
  useEffect(() => {
    void getPlayerId().then(setMyId);
  }, []);

  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const load = useCallback(async () => {
    if (!challengeCode) return;
    setStatus("loading");
    try {
      setRows(await loadChallengeBoard(challengeCode));
      setStatus("ready");
    } catch (e) {
      console.warn("[challenge] board failed:", e);
      setStatus("error");
    }
  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  }, [challengeCode]);
  useEffect(() => {
    void load();
  }, [load]);
  // Opening a challenge saves it (it appears in the Friends list).
  useEffect(() => {
    if (challengeCode) void rememberChallenge(challengeCode);
  }, [challengeCode]);

  const open = useCallback(
    async (raw: string) => {
      const parsed = parseChallengeCode(raw);
      if (!parsed) return;
      await rememberChallenge(parsed.code);
      navigation.push("ChallengeScreen", { code: parsed.code });
    },
    [navigation],
  );

  const depthName = (d: number) => t(`ascension.label.${d}` as TranslationKey);

  const play = () => {
    if (!challenge) return;
    navigation.navigate("CharactersScreen", { mode: "expedition", challenge: { code: challenge.code, seed: challenge.seed, depth: challenge.depth } });
  };
  const share = async () => {
    if (!challenge) return;
    try {
      await Share.share({ message: t("challenge.shareMessage", { code: formatChallengeCode(challenge.code), depth: depthName(challenge.depth), url: GAME_CONFIG.store.url }) });
    } catch (e) {
      console.warn("[challenge] share failed:", e);
    }
  };
  const copy = async () => {
    if (!challenge) return;
    try {
      await Clipboard.setStringAsync(formatChallengeCode(challenge.code));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // the code is on the screen
    }
  };

  const boardRow = (item: ChallengeDoc, index: number) => {
    const row = item.data();
    const hero = characters[row.characterIndex] || characters[0];
    const mine = !!myId && row.pid === myId;
    return (
      <View key={item.id} style={[styles.row, mine && styles.rowMine]}>
        <View style={[styles.rank, index < 3 && { backgroundColor: ["#FFD54F", "#CFD8DC", "#FFAB91"][index] }]}>
          <Text style={[styles.rankText, index < 3 && { color: "#2A2016" }]}>{index + 1}</Text>
        </View>
        <PlayerPortrait source={hero.scoreImage} size={(row as { frame?: string }).frame ? 50 : 40} frame={(row as { frame?: string }).frame} />
        <View style={{ flex: 1 }}>
          <Text style={styles.name} numberOfLines={1} maxFontSizeMultiplier={1.2}>
            {row.name}
            {mine ? `  ·  ${t("scores.you")}` : ""}
          </Text>
          <PlayerTitle title={(row as { title?: string }).title} />
          <Text style={styles.sub} numberOfLines={1} maxFontSizeMultiplier={1.2}>
            {t("scores.floorShort", { n: row.level })}  ·  <GlyphIcon name="gem" size={11} /> {row.coins}  ·  {formatTime(row.time)}
          </Text>
        </View>
        <Text style={styles.score} numberOfLines={1} adjustsFontSizeToFit>
          {n(row.score)}
        </Text>
      </View>
    );
  };

  return (
    <ImageBackground fadeDuration={0} resizeMethod="none" source={require("../assets/sprites/backgrounds/Cover_Background.png")} style={styles.root} resizeMode="cover">
      <SafeAreaView style={{ flex: 1, backgroundColor: "rgba(13, 10, 7,0.9)" }}>
        <ScreenHeader title={t("challenge.title")} onBack={() => navigation.goBack()} />
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {challenge ? (
            <View style={styles.cols}>
              <View style={styles.colCode}>
                <PopupPanel tint={TINT} width="100%">
                  <Text style={styles.kicker} maxFontSizeMultiplier={1.2}>
                    {t("challenge.code").toLocaleUpperCase()}
                  </Text>
                  <Text style={styles.code} selectable adjustsFontSizeToFit numberOfLines={1} accessibilityLabel={formatChallengeCode(challenge.code).split("").join(" ")} maxFontSizeMultiplier={1.2}>
                    {formatChallengeCode(challenge.code)}
                  </Text>
                  <Text style={styles.hint} maxFontSizeMultiplier={1.3}>
                    {t("challenge.depthLine", { depth: depthName(challenge.depth) })} {t("challenge.fair")}
                  </Text>
                  <PopButton label={t("challenge.play")} icon="play" onPress={play} />
                  <View style={styles.pair}>
                    <PopButton variant="secondary" label={t("challenge.share")} icon="share-social" onPress={() => void share()} style={styles.half} />
                    <PopButton variant="secondary" label={copied ? t("challenge.copied") : t("challenge.copy")} icon={copied ? "checkmark" : "copy"} onPress={() => void copy()} style={styles.half} />
                  </View>
                </PopupPanel>
              </View>
              <View style={styles.colBoard}>
                <Text style={styles.section} accessibilityRole="header" maxFontSizeMultiplier={1.2}>
                  {t("challenge.board").toLocaleUpperCase()}
                </Text>
                {status === "loading" ? (
                  <ActivityIndicator color={GOLD} style={{ marginTop: 20 }} />
                ) : status === "error" ? (
                  <View style={{ alignItems: "center", gap: 10, paddingTop: 12 }} accessibilityLiveRegion="polite">
                    <Text style={styles.empty}>{t("scores.error")}</Text>
                    <PopButton variant="secondary" label={t("common.retry")} onPress={() => void load()} style={{ minWidth: 160 }} />
                  </View>
                ) : rows.length === 0 ? (
                  <Text style={styles.empty}>{t("challenge.empty")}</Text>
                ) : (
                  rows.map(boardRow)
                )}
              </View>
            </View>
          ) : (
            <FriendCreateJoin mode="challenge" embers={0} onCreate={depth => void open(newChallenge(depth).code)} onJoin={raw => void open(raw)} />
          )}
        </ScrollView>
      </SafeAreaView>
    </ImageBackground>
  );
};

export default withUiScale(ChallengeScreen);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  content: { padding: 14, alignItems: "center" },
  cols: { width: "100%", maxWidth: 940, flexDirection: "row", flexWrap: "wrap", gap: 16, alignItems: "flex-start" },
  colCode: { flexGrow: 1, flexBasis: 300, minWidth: 0 },
  colBoard: { flexGrow: 1, flexBasis: 300, minWidth: 0, gap: 8 },
  kicker: { color: "#B99A7C", fontWeight: "900", fontSize: 11, letterSpacing: 2 },
  code: { color: GOLD, fontWeight: "900", fontSize: 38, letterSpacing: 5, textAlign: "center", alignSelf: "stretch" },
  hint: { color: "#DCCCBD", fontSize: 13.5, lineHeight: 19, textAlign: "center" },
  pair: { flexDirection: "row", gap: 10, alignSelf: "stretch" },
  half: { flex: 1 },
  section: { color: GOLD, fontWeight: "900", fontSize: 13, letterSpacing: 2.2 },
  empty: { color: "#E1D4C8", fontSize: 14, textAlign: "center", paddingTop: 10 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 16, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.08)", backgroundColor: "rgba(36, 28, 19,0.8)", paddingVertical: 8, paddingHorizontal: 10 },
  rowMine: { borderColor: GOLD, backgroundColor: "rgba(255,213,79,0.1)" },
  rank: { width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center" },
  rankText: { color: "#EAE1D8", fontWeight: "900", fontSize: 15 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.08)" },
  name: { color: "#fff", fontWeight: "900", fontSize: 16 },
  sub: { color: "#C4AA91", fontSize: 12, marginTop: 1 },
  score: { color: "#9ee37d", fontWeight: "900", fontSize: 20, minWidth: 84, textAlign: "right" },
});
