import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, ImageBackground, ScrollView, StyleSheet, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";
import Text from "../ui/components/Text";
import ScreenHeader from "../ui/components/ScreenHeader";
import GlyphIcon from "../ui/components/GlyphIcon";
import FriendCreateJoin from "../ui/components/friends/FriendCreateJoin";
import { PopButton } from "../ui/components/game/popup";
import { RootStackParamList } from "../navigation/types";
import { useT } from "../i18n/useT";
import characters from "../data/characters";
import { formatTime } from "../shared/utils/formatTime";
import { getPlayerId } from "../services/playerProfile";
import { newChallenge, parseChallengeCode } from "../core/challenge/code";
import { loadChallengeBoard, rememberChallenge, type ChallengeDoc } from "../services/challenges";
import { useWindowDimensions, withUiScale } from "../ui/layout/scaledWindow";
import CodeTicket, { FRIEND_ART } from "../ui/components/friends/CodeTicket";
import Rise, { riseDelay } from "../ui/components/Rise";
import SpriteImage from "../ui/components/SpriteImage";
import { PlayerPortrait, PlayerTitle } from "../ui/components/PlayerPortrait";

type Props = NativeStackScreenProps<RootStackParamList, "ChallengeScreen">;

const GOLD = "#FFD54F";
const MEDAL = ["#FFD54F", "#CFD8DC", "#FFAB91"];

/**
 * A friend challenge: the same cave for whoever has the code, played whenever each one wants. Without a code this screen creates one or
 * joins one; with a code it shows the code, how to play it and the results of everyone who did.
 */
const ChallengeScreen: React.FC<Props> = ({ navigation, route }) => {
  const { t, n } = useT();
  const code = route.params?.code ?? null;
  const challenge = code ? parseChallengeCode(code) : null;
  const challengeCode = challenge?.code ?? null;

  const { width } = useWindowDimensions();
  const narrow = width < 600;
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


  const play = () => {
    if (!challenge) return;
    navigation.navigate("CharactersScreen", { mode: "expedition", challenge: { code: challenge.code, seed: challenge.seed, depth: challenge.depth } });
  };
  const boardRow = (item: ChallengeDoc, index: number) => {
    const row = item.data();
    const hero = characters[row.characterIndex] || characters[0];
    const mine = !!myId && row.pid === myId;
    return (
      <Rise key={item.id} delay={riseDelay(index)} style={[styles.row, index < 3 && { borderLeftColor: MEDAL[index], borderLeftWidth: 4 }, mine && styles.rowMine]}>
        <View style={[styles.rank, index < 3 && { backgroundColor: MEDAL[index] }]}>
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
      </Rise>
    );
  };

  return (
    <ImageBackground fadeDuration={0} resizeMethod="none" source={require("../assets/sprites/backgrounds/Cover_Background.png")} style={styles.root} resizeMode="cover">
      <SafeAreaView style={{ flex: 1, backgroundColor: "rgba(13, 10, 7,0.9)" }}>
        <ScreenHeader title={t("challenge.title")} onBack={() => navigation.goBack()} />
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {challenge ? (
            <View style={[styles.cols, narrow && { flexDirection: "column", alignItems: "stretch" }]}>
              <View style={[styles.colCode, narrow && { width: "100%", maxWidth: undefined }]}>
                <CodeTicket mode="challenge" code={challenge.code} depth={challenge.depth}>
                  <PopButton label={t("challenge.play")} icon="play" onPress={play} />
                </CodeTicket>
              </View>
              <View style={styles.colBoard}>
                <View style={styles.boardHead}>
                  <Text style={styles.section} accessibilityRole="header" maxFontSizeMultiplier={1.2}>
                    {t("challenge.board").toLocaleUpperCase()}
                  </Text>
                  {status === "ready" && rows.length > 0 ? (
                    <Text style={styles.boardCount} maxFontSizeMultiplier={1.1}>
                      {t("challenge.players", { n: rows.length })}
                    </Text>
                  ) : null}
                </View>
                {status === "loading" ? (
                  <ActivityIndicator color={GOLD} style={{ marginTop: 20 }} />
                ) : status === "error" ? (
                  <View style={{ alignItems: "center", gap: 10, paddingTop: 12 }} accessibilityLiveRegion="polite">
                    <Text style={styles.empty}>{t("scores.error")}</Text>
                    <PopButton variant="secondary" label={t("common.retry")} onPress={() => void load()} style={{ minWidth: 160 }} />
                  </View>
                ) : rows.length === 0 ? (
                  <Rise style={styles.emptyBox}>
                    <SpriteImage source={FRIEND_ART.challenge} style={styles.emptyArt} resizeMode="contain" accessibilityIgnoresInvertColors />
                    <Text style={styles.empty} maxFontSizeMultiplier={1.2}>
                      {t("challenge.empty")}
                    </Text>
                    <Text style={styles.emptySub} maxFontSizeMultiplier={1.2}>
                      {t("challenge.emptyHint")}
                    </Text>
                  </Rise>
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
  cols: { width: "100%", maxWidth: 980, flexDirection: "row", gap: 14, alignItems: "flex-start" },
  colCode: { width: "40%", maxWidth: 380 },
  colBoard: { flex: 1, gap: 8 },
  boardHead: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" },
  boardCount: { color: "#C4AA91", fontWeight: "800", fontSize: 12 },
  section: { color: GOLD, fontWeight: "900", fontSize: 13, letterSpacing: 2.2 },
  emptyBox: { alignItems: "center", gap: 6, padding: 18, borderRadius: 18, borderWidth: 1.5, borderStyle: "dashed", borderColor: "rgba(255,255,255,0.18)", backgroundColor: "rgba(36,28,19,0.6)" },
  emptyArt: { width: 64, height: 64, opacity: 0.6 },
  empty: { color: "#E1D4C8", fontSize: 14, fontWeight: "800", textAlign: "center" },
  emptySub: { color: "#C4AA91", fontSize: 12.5, textAlign: "center" },
  row: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 16, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.08)", backgroundColor: "rgba(36, 28, 19,0.8)", paddingVertical: 8, paddingHorizontal: 10 },
  rowMine: { borderColor: GOLD, backgroundColor: "rgba(255,213,79,0.1)" },
  rank: { width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center" },
  rankText: { color: "#EAE1D8", fontWeight: "900", fontSize: 15 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.08)" },
  name: { color: "#fff", fontWeight: "900", fontSize: 16 },
  sub: { color: "#C4AA91", fontSize: 12, marginTop: 1 },
  score: { color: "#9ee37d", fontWeight: "900", fontSize: 20, minWidth: 84, textAlign: "right" },
});
