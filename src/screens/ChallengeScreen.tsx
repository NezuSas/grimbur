import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, ImageBackground, ScrollView, Share, StyleSheet, TextInput, TouchableOpacity, View, useWindowDimensions } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import Text from "../ui/components/Text";
import ScreenHeader from "../ui/components/ScreenHeader";
import SpriteImage from "../ui/components/SpriteImage";
import { PopButton, PopupPanel } from "../ui/components/game/popup";
import { RootStackParamList } from "../navigation/types";
import { useT } from "../i18n/useT";
import type { TranslationKey } from "../i18n/en";
import characters from "../data/characters";
import { formatTime } from "../shared/utils/formatTime";
import { getPlayerId } from "../services/playerProfile";
import { getLocalStats, peekLocalStats } from "../services/localStats";
import { EMPTY_STATS, type LocalStats } from "../core/stats/runStats";
import { MAX_ASCENSION } from "../core/engine/ascension";
import { GAME_CONFIG } from "../config/gameConfig";
import { formatChallengeCode, newChallenge, parseChallengeCode } from "../core/challenge/code";
import { getRecentChallenges, loadChallengeBoard, rememberChallenge, type ChallengeDoc } from "../services/challenges";

type Props = NativeStackScreenProps<RootStackParamList, "ChallengeScreen">;

const GOLD = "#FFD54F";
const TINT = "#4FC3F7";

/**
 * Friend challenges: the same cave for whoever has the code. This screen creates a challenge, joins one by its code and, for a code,
 * shows its board and plays it. Nothing here needs an account: results are listed under the name the player chose.
 */
const ChallengeScreen: React.FC<Props> = ({ navigation, route }) => {
  const { t } = useT();
  const { width } = useWindowDimensions();
  const code = route.params?.code ?? null;
  const challenge = code ? parseChallengeCode(code) : null;

  const [stats, setStats] = useState<LocalStats>(() => peekLocalStats() ?? EMPTY_STATS);
  const [recent, setRecent] = useState<string[]>([]);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [depth, setDepth] = useState(0);
  const [copied, setCopied] = useState(false);
  const [rows, setRows] = useState<ChallengeDoc[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [myId, setMyId] = useState<string | null>(null);

  useEffect(() => {
    void getLocalStats().then(setStats).catch(() => {});
    void getRecentChallenges().then(setRecent);
    void getPlayerId().then(setMyId);
  }, []);
  const maxDepth = GAME_CONFIG.dev.unlockAllHeroes ? MAX_ASCENSION : stats.maxAscension;

  const load = useCallback(async () => {
    if (!challenge) return;
    setStatus("loading");
    try {
      setRows(await loadChallengeBoard(challenge.code));
      setStatus("ready");
    } catch (e) {
      console.warn("[challenge] board failed:", e);
      setStatus("error");
    }
  }, [challenge?.code]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    void load();
  }, [load]);

  const open = useCallback(
    async (raw: string) => {
      const parsed = parseChallengeCode(raw);
      if (!parsed) {
        setError(t("challenge.badCode"));
        return;
      }
      setError(null);
      setRecent(await rememberChallenge(parsed.code));
      navigation.push("ChallengeScreen", { code: parsed.code });
    },
    [navigation, t],
  );

  const create = useCallback(() => {
    const made = newChallenge(Math.min(depth, maxDepth));
    void open(made.code);
  }, [depth, maxDepth, open]);

  const depthName = (d: number) => t(`ascension.label.${d}` as TranslationKey);

  const play = () => {
    if (!challenge) return;
    navigation.navigate("CharactersScreen", { mode: "expedition", challenge: { code: challenge.code, seed: challenge.seed, depth: challenge.depth } });
  };
  const share = async () => {
    if (!challenge) return;
    const message = t("challenge.shareMessage", { code: formatChallengeCode(challenge.code), depth: depthName(challenge.depth) });
    try {
      await Share.share({ message });
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
      // nothing to do: the code is on the screen
    }
  };

  const wide = width >= 640;
  const panelWidth = wide ? Math.min(width / 2 - 24, 460) : Math.min(width - 32, 460);

  const boardRow = (item: ChallengeDoc, index: number) => {
    const row = item.data();
    const hero = characters[row.characterIndex] || characters[0];
    const mine = !!myId && row.pid === myId;
    return (
      <View key={item.id} style={[styles.row, mine && styles.rowMine]}>
        <View style={[styles.rank, index < 3 && { backgroundColor: ["#FFD54F", "#CFD8DC", "#FFAB91"][index] }]}>
          <Text style={[styles.rankText, index < 3 && { color: "#1a1030" }]}>{index + 1}</Text>
        </View>
        <SpriteImage source={hero.scoreImage} style={styles.avatar} accessibilityIgnoresInvertColors />
        <View style={{ flex: 1 }}>
          <Text style={styles.name} numberOfLines={1} maxFontSizeMultiplier={1.2}>
            {row.name}
            {mine ? `  ·  ${t("scores.you")}` : ""}
          </Text>
          <Text style={styles.sub} numberOfLines={1} maxFontSizeMultiplier={1.2}>
            {t("scores.floorShort", { n: row.level })}  ·  💎 {row.coins}  ·  {formatTime(row.time)}
          </Text>
        </View>
        <Text style={styles.score} numberOfLines={1} adjustsFontSizeToFit>
          {row.score.toLocaleString()}
        </Text>
      </View>
    );
  };

  return (
    <ImageBackground fadeDuration={0} resizeMethod="none" source={require("../assets/sprites/backgrounds/Cover_Background.png")} style={styles.root} resizeMode="cover">
      <SafeAreaView style={{ flex: 1, backgroundColor: "rgba(6,4,16,0.9)" }}>
        <ScreenHeader title={t("challenge.title")} onBack={() => navigation.goBack()} />
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {challenge ? (
            <View style={[styles.cols, wide && styles.colsWide]}>
              <PopupPanel tint={TINT} width={panelWidth}>
                <Text style={styles.kicker} maxFontSizeMultiplier={1.2}>
                  {t("challenge.code").toLocaleUpperCase()}
                </Text>
                <Text style={styles.code} selectable accessibilityLabel={formatChallengeCode(challenge.code).split("").join(" ")} maxFontSizeMultiplier={1.2}>
                  {formatChallengeCode(challenge.code)}
                </Text>
                <Text style={styles.hint} maxFontSizeMultiplier={1.3}>
                  {t("challenge.depthLine", { depth: depthName(challenge.depth) })} {t("challenge.fair")}
                </Text>
                <PopButton label={t("challenge.play")} glyph="▶" onPress={play} />
                <View style={styles.pair}>
                  <PopButton variant="secondary" label={t("challenge.share")} glyph="📤" onPress={() => void share()} style={styles.half} />
                  <PopButton variant="secondary" label={copied ? t("challenge.copied") : t("challenge.copy")} glyph="📋" onPress={() => void copy()} style={styles.half} />
                </View>
              </PopupPanel>

              <View style={{ width: panelWidth, gap: 8 }}>
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
            <>
              <View style={[styles.cols, wide && styles.colsWide]}>
                <PopupPanel tint={TINT} width={panelWidth}>
                  <Text style={styles.cardTitle} accessibilityRole="header" maxFontSizeMultiplier={1.2}>
                    {t("challenge.join").toLocaleUpperCase()}
                  </Text>
                  <Text style={styles.hint} maxFontSizeMultiplier={1.3}>
                    {t("challenge.joinHint")}
                  </Text>
                  <TextInput
                    value={typed}
                    onChangeText={text => {
                      setTyped(text);
                      setError(null);
                    }}
                    placeholder="ABCD-EFGH"
                    placeholderTextColor="#777"
                    style={styles.input}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    spellCheck={false}
                    maxLength={12}
                    returnKeyType="go"
                    onSubmitEditing={() => void open(typed)}
                    accessibilityLabel={t("challenge.join")}
                  />
                  {error ? (
                    <Text style={styles.error} accessibilityLiveRegion="polite" maxFontSizeMultiplier={1.3}>
                      {error}
                    </Text>
                  ) : null}
                  <PopButton label={t("challenge.joinButton")} glyph="➜" onPress={() => void open(typed)} disabled={typed.trim().length === 0} />
                </PopupPanel>

                <PopupPanel tint={GOLD} width={panelWidth}>
                  <Text style={[styles.cardTitle, { color: GOLD }]} accessibilityRole="header" maxFontSizeMultiplier={1.2}>
                    {t("challenge.create").toLocaleUpperCase()}
                  </Text>
                  <Text style={styles.hint} maxFontSizeMultiplier={1.3}>
                    {t("challenge.createHint")}
                  </Text>
                  <View style={styles.depthRow}>
                    <TouchableOpacity style={[styles.stepper, depth <= 0 && { opacity: 0.35 }]} onPress={() => setDepth(d => Math.max(0, d - 1))} disabled={depth <= 0} accessibilityRole="button" accessibilityLabel={t("a11y.depthLower")}>
                      <Ionicons name="remove" size={20} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.depthLabel} maxFontSizeMultiplier={1.2}>
                      🔥 {depthName(Math.min(depth, maxDepth)).toLocaleUpperCase()}
                    </Text>
                    <TouchableOpacity style={[styles.stepper, depth >= maxDepth && { opacity: 0.35 }]} onPress={() => setDepth(d => Math.min(maxDepth, d + 1))} disabled={depth >= maxDepth} accessibilityRole="button" accessibilityLabel={t("a11y.depthRaise")}>
                      <Ionicons name="add" size={20} color="#fff" />
                    </TouchableOpacity>
                  </View>
                  <PopButton label={t("challenge.createButton")} glyph="✨" onPress={create} />
                </PopupPanel>
              </View>

              {recent.length > 0 ? (
                <View style={{ width: wide ? panelWidth * 2 + 16 : panelWidth, gap: 8 }}>
                  <Text style={styles.section} accessibilityRole="header" maxFontSizeMultiplier={1.2}>
                    {t("challenge.recent").toLocaleUpperCase()}
                  </Text>
                  <View style={styles.chips}>
                    {recent.map(c => (
                      <TouchableOpacity key={c} style={styles.chip} onPress={() => void open(c)} accessibilityRole="button" accessibilityLabel={`${t("challenge.board")} ${formatChallengeCode(c)}`}>
                        <Text style={styles.chipText}>{formatChallengeCode(c)}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ) : null}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </ImageBackground>
  );
};

export default ChallengeScreen;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  content: { padding: 16, gap: 16, alignItems: "center" },
  cols: { gap: 16, alignItems: "center" },
  colsWide: { flexDirection: "row", alignItems: "flex-start", justifyContent: "center" },
  cardTitle: { color: TINT, fontWeight: "900", fontSize: 18, letterSpacing: 3, textAlign: "center" },
  kicker: { color: "#8f8aab", fontWeight: "900", fontSize: 11, letterSpacing: 2 },
  code: { color: GOLD, fontWeight: "900", fontSize: 40, letterSpacing: 6, textAlign: "center" },
  hint: { color: "#c3bedb", fontSize: 13.5, lineHeight: 19, textAlign: "center" },
  input: { alignSelf: "stretch", minHeight: 52, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1.5, borderColor: "rgba(255,213,79,0.45)", color: "#fff", fontSize: 22, fontWeight: "900", letterSpacing: 4, textAlign: "center", paddingHorizontal: 12 },
  error: { color: "#FF8A80", fontSize: 12.5, fontWeight: "700", textAlign: "center" },
  pair: { flexDirection: "row", gap: 10, alignSelf: "stretch" },
  half: { flex: 1 },
  depthRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  stepper: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,112,67,0.35)", borderWidth: 1, borderColor: "#FF7043", alignItems: "center", justifyContent: "center" },
  depthLabel: { color: "#FF9A5C", fontWeight: "900", fontSize: 15, letterSpacing: 1, minWidth: 130, textAlign: "center" },
  section: { color: GOLD, fontWeight: "900", fontSize: 13, letterSpacing: 2.2 },
  empty: { color: "#c9c3e6", fontSize: 14, textAlign: "center", paddingTop: 10 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { minHeight: 44, paddingHorizontal: 14, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  chipText: { color: "#fff", fontWeight: "900", letterSpacing: 2, fontSize: 14 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 16, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.08)", backgroundColor: "rgba(20,15,40,0.8)", paddingVertical: 8, paddingHorizontal: 10 },
  rowMine: { borderColor: GOLD, backgroundColor: "rgba(255,213,79,0.1)" },
  rank: { width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center" },
  rankText: { color: "#d8d2f0", fontWeight: "900", fontSize: 15 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.08)" },
  name: { color: "#fff", fontWeight: "900", fontSize: 16 },
  sub: { color: "#9f9abb", fontSize: 12, marginTop: 1 },
  score: { color: "#9ee37d", fontWeight: "900", fontSize: 20, minWidth: 84, textAlign: "right" },
});
