import React, { useCallback, useEffect, useRef, useState } from "react";
import { ImageBackground, ScrollView, StyleSheet, TextInput, TouchableOpacity, View, useWindowDimensions } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Text from "../ui/components/Text";
import ScreenHeader from "../ui/components/ScreenHeader";
import SpriteImage from "../ui/components/SpriteImage";
import { PopButton, PopupPanel } from "../ui/components/game/popup";
import { RootStackParamList } from "../navigation/types";
import { useT } from "../i18n/useT";
import type { TranslationKey } from "../i18n/en";
import characters from "../data/characters";
import { MAX_ASCENSION } from "../core/engine/ascension";
import { GAME_CONFIG } from "../config/gameConfig";
import { getLocalStats, peekLocalStats } from "../services/localStats";
import { EMPTY_STATS, type LocalStats } from "../core/stats/runStats";
import { formatChallengeCode, newChallenge, parseChallengeCode } from "../core/challenge/code";
import { COUNTDOWN_SECONDS, HEARTBEAT_MS, rivalStatus } from "../core/duel/duel";
import { getPlayerId, getPlayerName, setPlayerName } from "../services/playerProfile";
import { publishDuelState, watchRoom, type Room } from "../services/duel";
import { rememberChallenge } from "../services/challenges";

type Props = NativeStackScreenProps<RootStackParamList, "DuelScreen">;

const GOLD = "#FFD54F";
const TINT = "#FF8A80";

/**
 * Live duel. Without a code: create a duel (a code to send) or join one. With a code and a hero (chosen on the hero screen): the lobby,
 * where both players see each other, press Ready and, when both are ready, a short countdown starts the same cave on both phones.
 */
const DuelScreen: React.FC<Props> = ({ navigation, route }) => {
  const { t } = useT();
  const { width } = useWindowDimensions();
  const code = route.params?.code ?? null;
  const heroIndex = route.params?.characterIndex ?? null;
  const challenge = code ? parseChallengeCode(code) : null;
  const inLobby = !!challenge && heroIndex !== null;
  const wide = width >= 640;
  const panelWidth = wide ? Math.min(width / 2 - 24, 460) : Math.min(width - 32, 460);

  // ── Create / join ──────────────────────────────────────────────────────────────────────────────────────
  const [stats, setStats] = useState<LocalStats>(() => peekLocalStats() ?? EMPTY_STATS);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [depth, setDepth] = useState(0);
  useEffect(() => {
    void getLocalStats().then(setStats).catch(() => {});
  }, []);
  const maxDepth = GAME_CONFIG.dev.unlockAllHeroes ? MAX_ASCENSION : stats.maxAscension;
  const depthName = (d: number) => t(`ascension.label.${d}` as TranslationKey);

  const goHero = useCallback(
    async (raw: string) => {
      const parsed = parseChallengeCode(raw);
      if (!parsed) {
        setError(t("challenge.badCode"));
        return;
      }
      setError(null);
      await rememberChallenge(parsed.code);
      navigation.navigate("CharactersScreen", { mode: "expedition", duel: { code: parsed.code, seed: parsed.seed, depth: parsed.depth } });
    },
    [navigation, t],
  );

  // ── Lobby ──────────────────────────────────────────────────────────────────────────────────────────────
  const [name, setName] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [room, setRoom] = useState<Room>({ me: null, rival: null, full: false });
  const [now, setNow] = useState(() => Date.now());
  const [ready, setReady] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [count, setCount] = useState<number | null>(null);
  const left = useRef(false);
  const started = useRef(false);

  useEffect(() => {
    if (!inLobby) return;
    void getPlayerName().then(saved => setName(saved));
  }, [inLobby]);

  const saveName = async () => {
    const saved = await setPlayerName(nameDraft);
    if (saved) setName(saved);
    else setNameError(t("entry.errBlocked"));
  };

  const publish = useCallback(
    async (state: "lobby" | "ready") => {
      if (!code || name === null || heroIndex === null) return;
      try {
        await publishDuelState(code, name, { characterIndex: heroIndex, state, level: 1, score: 0, victory: false, time: 0 });
        setProblem(null);
      } catch (e) {
        console.warn("[duel] could not publish:", e);
        setProblem(t("duel.offline"));
      }
    },
    [code, name, heroIndex, t],
  );

  // Joining the room: this player appears as "in the lobby" and listens to the other.
  useEffect(() => {
    if (!inLobby || !code || name === null) return;
    let off: (() => void) | undefined;
    let cancelled = false;
    void publish("lobby");
    void getPlayerId().then(id => {
      if (cancelled) return;
      off = watchRoom(code, id, setRoom, e => {
        console.warn("[duel] room error:", e);
        setProblem(t("duel.offline"));
      });
    });
    const tick = setInterval(() => setNow(Date.now()), 2000);
    const beat = setInterval(() => void publish(ready ? "ready" : "lobby"), HEARTBEAT_MS);
    return () => {
      cancelled = true;
      off?.();
      clearInterval(tick);
      clearInterval(beat);
    };
  }, [inLobby, code, name, publish, ready, t]);

  const status = rivalStatus(room.rival, room.rival?.updatedAt ?? null, now);
  // A rival who is already playing started the countdown a moment before: this phone starts too (it never cancels itself on a rival's start).
  const bothReady = ready && (status === "ready" || status === "playing") && room.me?.state === "ready";

  // Both ready: the same countdown on both phones, then the same cave.
  useEffect(() => {
    if (!bothReady || started.current) return;
    let n = COUNTDOWN_SECONDS;
    setCount(n);
    const id = setInterval(() => {
      n -= 1;
      if (n > 0) {
        setCount(n);
        return;
      }
      clearInterval(id);
      if (started.current || left.current || !challenge) return;
      started.current = true;
      setCount(0);
      navigation.replace("GameScreen", {
        characterIndex: heroIndex ?? 0,
        skin: route.params?.skin,
        mode: "expedition",
        ascension: challenge.depth,
        challenge: { code: challenge.code, seed: challenge.seed, depth: challenge.depth },
        duel: { code: challenge.code, name: name ?? "" },
      });
    }, 1000);
    return () => clearInterval(id);
  }, [bothReady]); // eslint-disable-line react-hooks/exhaustive-deps

  // The rival left before the start: back to waiting.
  useEffect(() => {
    if (count !== null && count > 0 && !bothReady) setCount(null);
  }, [bothReady, count]);

  const onReady = async () => {
    setReady(true);
    await publish("ready");
  };
  const onCancelReady = async () => {
    setReady(false);
    setCount(null);
    await publish("lobby");
  };
  useEffect(() => {
    left.current = false;
    return () => {
      left.current = true;
    };
  }, []);

  const playerCard = (title: string, who: { name: string; characterIndex: number } | null, state: string, accent: string) => {
    const hero = who ? characters[who.characterIndex] || characters[0] : null;
    return (
      <View style={[styles.player, { borderColor: accent + "99" }]}>
        {hero ? <SpriteImage source={hero.scoreImage} style={styles.avatar} accessibilityIgnoresInvertColors /> : <View style={[styles.avatar, styles.avatarEmpty]}><Ionicons name="hourglass" size={22} color="#8f8aab" /></View>}
        <View style={{ flex: 1 }}>
          <Text style={styles.playerTitle} maxFontSizeMultiplier={1.2}>
            {title.toLocaleUpperCase()}
          </Text>
          <Text style={styles.playerName} numberOfLines={1} maxFontSizeMultiplier={1.2}>
            {who?.name ?? t("duel.waitingRival")}
          </Text>
          <Text style={[styles.playerState, { color: accent }]} maxFontSizeMultiplier={1.2}>
            {state}
          </Text>
        </View>
      </View>
    );
  };

  const rivalLabel = status === "ready" ? t("duel.state.ready") : status === "away" ? t("duel.state.away") : status === "playing" || status === "done" ? t("duel.state.inGame") : t("duel.state.waiting");

  return (
    <ImageBackground fadeDuration={0} resizeMethod="none" source={require("../assets/sprites/backgrounds/Cover_Background.png")} style={styles.root} resizeMode="cover">
      <SafeAreaView style={{ flex: 1, backgroundColor: "rgba(6,4,16,0.9)" }}>
        <ScreenHeader title={t("duel.title")} onBack={() => navigation.goBack()} />
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {inLobby && challenge ? (
            name === null ? (
              <PopupPanel tint={TINT} width={panelWidth}>
                <Text style={styles.cardTitle} accessibilityRole="header">{t("duel.nameTitle").toLocaleUpperCase()}</Text>
                <Text style={styles.hint}>{t("duel.nameHint")}</Text>
                <TextInput value={nameDraft} onChangeText={text => { setNameDraft(text); setNameError(null); }} placeholder={t("entry.placeholder")} placeholderTextColor="#777" style={styles.input} maxLength={20} returnKeyType="done" onSubmitEditing={() => void saveName()} accessibilityLabel={t("entry.placeholder")} />
                {nameError ? <Text style={styles.error}>{nameError}</Text> : null}
                <PopButton label={t("duel.continue")} onPress={() => void saveName()} disabled={nameDraft.trim().length === 0} />
              </PopupPanel>
            ) : (
              <View style={[styles.cols, wide && styles.colsWide]}>
                <PopupPanel tint={TINT} width={panelWidth}>
                  <Text style={styles.kicker}>{t("challenge.code").toLocaleUpperCase()}</Text>
                  <Text style={styles.code} selectable>{formatChallengeCode(challenge.code)}</Text>
                  <Text style={styles.hint}>{t("challenge.depthLine", { depth: depthName(challenge.depth) })} {t("challenge.fair")}</Text>
                  {room.full ? <Text style={styles.error}>{t("duel.full")}</Text> : null}
                  {problem ? <Text style={styles.error} accessibilityLiveRegion="polite">{problem}</Text> : null}
                  {count !== null ? (
                    <Text style={styles.count} accessibilityLiveRegion="assertive">{count > 0 ? String(count) : t("duel.go").toLocaleUpperCase()}</Text>
                  ) : ready ? (
                    <>
                      <Text style={styles.hint}>{t("duel.waitingStart")}</Text>
                      <PopButton variant="secondary" label={t("duel.notReady")} onPress={() => void onCancelReady()} />
                    </>
                  ) : (
                    <PopButton label={t("duel.ready")} glyph="⚔️" onPress={() => void onReady()} disabled={room.full} />
                  )}
                </PopupPanel>
                <View style={{ width: panelWidth, gap: 10 }}>
                  {playerCard(t("duel.you"), { name, characterIndex: heroIndex ?? 0 }, ready ? t("duel.state.ready") : t("duel.state.lobby"), GOLD)}
                  {playerCard(t("duel.rival"), room.rival ? { name: room.rival.name, characterIndex: room.rival.characterIndex } : null, rivalLabel, TINT)}
                  <Text style={styles.hint}>{t("duel.lobbyHint")}</Text>
                </View>
              </View>
            )
          ) : (
            <View style={[styles.cols, wide && styles.colsWide]}>
              <PopupPanel tint={TINT} width={panelWidth}>
                <Text style={styles.cardTitle} accessibilityRole="header">{t("challenge.join").toLocaleUpperCase()}</Text>
                <Text style={styles.hint}>{t("duel.joinHint")}</Text>
                <TextInput value={typed} onChangeText={text => { setTyped(text); setError(null); }} placeholder="ABCD-EFGH" placeholderTextColor="#777" style={styles.input} autoCapitalize="characters" autoCorrect={false} spellCheck={false} maxLength={12} returnKeyType="go" onSubmitEditing={() => void goHero(typed)} accessibilityLabel={t("challenge.join")} />
                {error ? <Text style={styles.error} accessibilityLiveRegion="polite">{error}</Text> : null}
                <PopButton label={t("duel.joinButton")} glyph="➜" onPress={() => void goHero(typed)} disabled={typed.trim().length === 0} />
              </PopupPanel>
              <PopupPanel tint={GOLD} width={panelWidth}>
                <Text style={[styles.cardTitle, { color: GOLD }]} accessibilityRole="header">{t("duel.create").toLocaleUpperCase()}</Text>
                <Text style={styles.hint}>{t("duel.createHint")}</Text>
                <View style={styles.depthRow}>
                  <TouchableOpacity style={[styles.stepper, depth <= 0 && { opacity: 0.35 }]} onPress={() => setDepth(d => Math.max(0, d - 1))} disabled={depth <= 0} accessibilityRole="button" accessibilityLabel={t("a11y.depthLower")}>
                    <Ionicons name="remove" size={20} color="#fff" />
                  </TouchableOpacity>
                  <Text style={styles.depthLabel}>🔥 {depthName(Math.min(depth, maxDepth)).toLocaleUpperCase()}</Text>
                  <TouchableOpacity style={[styles.stepper, depth >= maxDepth && { opacity: 0.35 }]} onPress={() => setDepth(d => Math.min(maxDepth, d + 1))} disabled={depth >= maxDepth} accessibilityRole="button" accessibilityLabel={t("a11y.depthRaise")}>
                    <Ionicons name="add" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>
                <PopButton label={t("duel.createButton")} glyph="⚔️" onPress={() => void goHero(newChallenge(Math.min(depth, maxDepth)).code)} />
              </PopupPanel>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </ImageBackground>
  );
};

export default DuelScreen;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  content: { padding: 16, gap: 16, alignItems: "center" },
  cols: { gap: 16, alignItems: "center" },
  colsWide: { flexDirection: "row", alignItems: "flex-start", justifyContent: "center" },
  cardTitle: { color: TINT, fontWeight: "900", fontSize: 18, letterSpacing: 3, textAlign: "center" },
  kicker: { color: "#8f8aab", fontWeight: "900", fontSize: 11, letterSpacing: 2 },
  code: { color: GOLD, fontWeight: "900", fontSize: 36, letterSpacing: 6, textAlign: "center" },
  hint: { color: "#c3bedb", fontSize: 13.5, lineHeight: 19, textAlign: "center" },
  input: { alignSelf: "stretch", minHeight: 52, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1.5, borderColor: "rgba(255,213,79,0.45)", color: "#fff", fontSize: 22, fontWeight: "900", letterSpacing: 3, textAlign: "center", paddingHorizontal: 12 },
  error: { color: "#FF8A80", fontSize: 12.5, fontWeight: "700", textAlign: "center" },
  count: { color: "#fff", fontWeight: "900", fontSize: 64, textAlign: "center" },
  depthRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  stepper: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,112,67,0.35)", borderWidth: 1, borderColor: "#FF7043", alignItems: "center", justifyContent: "center" },
  depthLabel: { color: "#FF9A5C", fontWeight: "900", fontSize: 15, letterSpacing: 1, minWidth: 130, textAlign: "center" },
  player: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 18, borderWidth: 2, backgroundColor: "rgba(20,15,40,0.85)", padding: 12 },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: "rgba(255,255,255,0.08)" },
  avatarEmpty: { alignItems: "center", justifyContent: "center" },
  playerTitle: { color: "#8f8aab", fontWeight: "900", fontSize: 11, letterSpacing: 2 },
  playerName: { color: "#fff", fontWeight: "900", fontSize: 18 },
  playerState: { fontWeight: "800", fontSize: 13 },
});
