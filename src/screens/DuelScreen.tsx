import React, { useCallback, useEffect, useRef, useState } from "react";
import { ImageBackground, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Text from "../ui/components/Text";
import ScreenHeader from "../ui/components/ScreenHeader";
import SpriteImage from "../ui/components/SpriteImage";
import FriendCreateJoin from "../ui/components/friends/FriendCreateJoin";
import { PopButton, PopupPanel } from "../ui/components/game/popup";
import { RootStackParamList } from "../navigation/types";
import { useT } from "../i18n/useT";
import type { TranslationKey } from "../i18n/en";
import characters from "../data/characters";
import { getLocalStats, peekLocalStats, spendEmbersFor } from "../services/localStats";
import { EMPTY_STATS, type LocalStats } from "../core/stats/runStats";
import { formatChallengeCode, newChallenge, parseChallengeCode } from "../core/challenge/code";
import { COUNTDOWN_SECONDS, HEARTBEAT_MS, MAX_PLAYERS, potOf, rivalStatus } from "../core/duel/duel";
import type { RivalStatus } from "../core/duel/duel";
import { getPlayerId, getPlayerName, setPlayerName } from "../services/playerProfile";
import { publishDuelState, watchRoom, type Room } from "../services/duel";
import { rememberChallenge } from "../services/challenges";
import { withUiScale } from "../ui/layout/scaledWindow";

type Props = NativeStackScreenProps<RootStackParamList, "DuelScreen">;

const GOLD = "#FFD54F";
const TINT = "#FF8A80";

/**
 * Live duel for two to four players. Without a code: create a duel (a code to send, a difficulty and an optional stake of embers) or join
 * one. With a code and a hero (chosen on the hero screen): the lobby, where everybody sees each other, presses Ready and, when all are
 * ready, a short countdown starts the same cave on every phone. A stake is paid when the cave starts; the winner takes the pot.
 */
const DuelScreen: React.FC<Props> = ({ navigation, route }) => {
  const { t } = useT();
  const code = route.params?.code ?? null;
  const heroIndex = route.params?.characterIndex ?? null;
  const creatorStake = route.params?.stake;
  const challenge = code ? parseChallengeCode(code) : null;
  const inLobby = !!challenge && heroIndex !== null;

  const [stats, setStats] = useState<LocalStats>(() => peekLocalStats() ?? EMPTY_STATS);
  useEffect(() => {
    void getLocalStats().then(setStats).catch(() => {});
  }, []);

  // ── Create / join: the hero comes next, then the lobby ───────────────────────────────────────────────────
  const goHero = useCallback(
    async (raw: string, stake?: number) => {
      const parsed = parseChallengeCode(raw);
      if (!parsed) return;
      await rememberChallenge(parsed.code);
      navigation.navigate("CharactersScreen", { mode: "expedition", duel: { code: parsed.code, seed: parsed.seed, depth: parsed.depth, stake } });
    },
    [navigation],
  );

  // ── Lobby ──────────────────────────────────────────────────────────────────────────────────────────────
  const [name, setName] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [room, setRoom] = useState<Room>({ me: null, rivals: [], full: false });
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

  // Who is here: rivals who are not gone. A rival who already started the cave means the duel is under way.
  const rivals = room.rivals.map(r => ({ ...r, status: rivalStatus(r, r.updatedAt, now) as RivalStatus }));
  const present = rivals.filter(r => r.status !== "away" && r.status !== "done");
  const underway = present.some(r => r.state === "playing");
  // The creator chose the stake; everybody else adopts it from the room.
  const adopted = present.reduce((max, r) => Math.max(max, r.stake), 0);
  const myStake = creatorStake ?? adopted;
  const pot = potOf(myStake, present.length + 1);
  const canPay = stats.embers >= myStake;

  const publish = useCallback(
    // eslint-disable-next-line react-hooks/preserve-manual-memoization
    async (state: "lobby" | "ready") => {
      if (!code || name === null || heroIndex === null) return;
      try {
        await publishDuelState(code, name, { characterIndex: heroIndex, state, level: 1, score: 0, victory: false, time: 0, stake: myStake });
        setProblem(null);
      } catch (e) {
        console.warn("[duel] could not publish:", e);
        setProblem(t("duel.offline"));
      }
    },
    // eslint-disable-next-line react-hooks/preserve-manual-memoization
    [code, name, heroIndex, myStake, t],
  );

  // Joining the room: this player appears as "in the lobby" and listens to the others.
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

  // Everybody who is here is ready (or already playing: they started the countdown a moment before and this phone follows).
  const allReady = ready && room.me?.state === "ready" && present.length >= 1 && present.every(r => r.state === "ready" || r.state === "playing");

  useEffect(() => {
    if (!allReady || started.current) return;
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
      void (async () => {
        // The stake goes into the pot the moment the cave starts.
        if (myStake > 0 && !(await spendEmbersFor(myStake))) {
          started.current = false;
          setReady(false);
          setCount(null);
          setProblem(t("duel.stakeShort", { n: myStake }));
          return;
        }
        navigation.replace("GameScreen", {
          characterIndex: heroIndex ?? 0,
          skin: route.params?.skin,
          mode: "expedition",
          ascension: challenge.depth,
          challenge: { code: challenge.code, seed: challenge.seed, depth: challenge.depth },
          duel: { code: challenge.code, name: name ?? "", stake: myStake },
        });
      })();
    }, 1000);
    return () => clearInterval(id);
  }, [allReady]); // eslint-disable-line react-hooks/exhaustive-deps

  // Somebody left before the start: back to waiting.
  useEffect(() => {
    if (count !== null && count > 0 && !allReady) setCount(null);
  }, [allReady, count]);

  const onReady = async () => {
    if (!canPay) {
      setProblem(t("duel.stakeShort", { n: myStake }));
      return;
    }
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

  const stateLabel = (state: string, status: RivalStatus) =>
    status === "away" ? t("duel.state.away") : state === "ready" ? t("duel.state.ready") : state === "playing" || state === "done" ? t("duel.state.inGame") : t("duel.state.lobby");

  const playerCard = (key: string, title: string, who: { name: string; characterIndex: number } | null, label: string, accent: string) => {
    const hero = who ? characters[who.characterIndex] || characters[0] : null;
    return (
      <View key={key} style={[styles.player, { borderColor: accent + "99" }]}>
        {hero ? (
          <SpriteImage source={hero.scoreImage} style={styles.avatar} accessibilityIgnoresInvertColors />
        ) : (
          <View style={[styles.avatar, styles.avatarEmpty]}>
            <Ionicons name="hourglass" size={22} color="#8f8aab" />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.playerTitle} maxFontSizeMultiplier={1.2}>
            {title.toLocaleUpperCase()}
          </Text>
          <Text style={styles.playerName} numberOfLines={1} maxFontSizeMultiplier={1.2}>
            {who?.name ?? t("duel.waitingRival")}
          </Text>
          <Text style={[styles.playerState, { color: accent }]} maxFontSizeMultiplier={1.2}>
            {label}
          </Text>
        </View>
      </View>
    );
  };

  const depthName = (d: number) => t(`ascension.label.${d}` as TranslationKey);

  return (
    <ImageBackground fadeDuration={0} resizeMethod="none" source={require("../assets/sprites/backgrounds/Cover_Background.png")} style={styles.root} resizeMode="cover">
      <SafeAreaView style={{ flex: 1, backgroundColor: "rgba(6,4,16,0.9)" }}>
        <ScreenHeader title={t("duel.title")} onBack={() => navigation.goBack()} />
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {inLobby && challenge ? (
            name === null ? (
              <View style={styles.narrow}>
                <PopupPanel tint={TINT} width="100%">
                  <Text style={styles.cardTitle} accessibilityRole="header">{t("duel.nameTitle").toLocaleUpperCase()}</Text>
                  <Text style={styles.hint}>{t("duel.nameHint")}</Text>
                  <TextInput value={nameDraft} onChangeText={text => { setNameDraft(text); setNameError(null); }} placeholder={t("entry.placeholder")} placeholderTextColor="#777" style={styles.input} maxLength={20} returnKeyType="done" onSubmitEditing={() => void saveName()} accessibilityLabel={t("entry.placeholder")} />
                  {nameError ? <Text style={styles.error}>{nameError}</Text> : null}
                  <PopButton label={t("duel.continue")} onPress={() => void saveName()} disabled={nameDraft.trim().length === 0} />
                </PopupPanel>
              </View>
            ) : (
              <View style={styles.cols}>
                <View style={styles.colMain}>
                  <PopupPanel tint={TINT} width="100%">
                    <Text style={styles.kicker}>{t("challenge.code").toLocaleUpperCase()}</Text>
                    <Text style={styles.code} selectable adjustsFontSizeToFit numberOfLines={1}>{formatChallengeCode(challenge.code)}</Text>
                    <Text style={styles.hint}>{t("challenge.depthLine", { depth: depthName(challenge.depth) })} {t("challenge.fair")}</Text>
                    {myStake > 0 ? (
                      <View style={styles.stakeBox}>
                        <Text style={styles.stakeText} maxFontSizeMultiplier={1.2}>🔥 {t("duel.stakeRoom", { n: myStake })}</Text>
                        <Text style={styles.stakeSub} maxFontSizeMultiplier={1.2}>{t("duel.stakeHint")}{pot > 0 ? `  ·  🏆 ${pot}` : ""}</Text>
                      </View>
                    ) : null}
                    {room.full ? <Text style={styles.error}>{t("duel.full")}</Text> : null}
                    {underway && !ready ? <Text style={styles.error}>{t("duel.underway")}</Text> : null}
                    {!canPay ? <Text style={styles.error}>{t("duel.stakeShort", { n: myStake })}</Text> : null}
                    {problem ? <Text style={styles.error} accessibilityLiveRegion="polite">{problem}</Text> : null}
                    {count !== null ? (
                      <Text style={styles.count} accessibilityLiveRegion="assertive">{count > 0 ? String(count) : t("duel.go").toLocaleUpperCase()}</Text>
                    ) : ready ? (
                      <>
                        <Text style={styles.hint}>{t("duel.waitingStart")}</Text>
                        <PopButton variant="secondary" label={t("duel.notReady")} onPress={() => void onCancelReady()} />
                      </>
                    ) : (
                      <PopButton label={t("duel.ready")} glyph="⚔️" onPress={() => void onReady()} disabled={room.full || !canPay} />
                    )}
                  </PopupPanel>
                </View>
                <View style={styles.colPlayers}>
                  <Text style={styles.section}>{t("duel.players", { n: present.length + 1, max: MAX_PLAYERS }).toLocaleUpperCase()}</Text>
                  {playerCard("me", t("duel.you"), { name, characterIndex: heroIndex ?? 0 }, ready ? t("duel.state.ready") : t("duel.state.lobby"), GOLD)}
                  {rivals.map(r => playerCard(r.pid, t("duel.rival"), { name: r.name, characterIndex: r.characterIndex }, stateLabel(r.state, r.status), TINT))}
                  {rivals.length === 0 ? playerCard("wait", t("duel.rival"), null, t("duel.state.waiting"), TINT) : null}
                  <Text style={styles.hint}>{t("duel.lobbyHint")}</Text>
                </View>
              </View>
            )
          ) : (
            <FriendCreateJoin mode="duel" embers={stats.embers} onCreate={(depth, stake) => void goHero(newChallenge(depth).code, stake)} onJoin={raw => void goHero(raw)} />
          )}
        </ScrollView>
      </SafeAreaView>
    </ImageBackground>
  );
};

export default withUiScale(DuelScreen);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  content: { padding: 14, alignItems: "center" },
  narrow: { width: "100%", maxWidth: 460 },
  cols: { width: "100%", maxWidth: 940, flexDirection: "row", flexWrap: "wrap", gap: 16, alignItems: "flex-start" },
  colMain: { flexGrow: 1, flexBasis: 300, minWidth: 0 },
  colPlayers: { flexGrow: 1, flexBasis: 300, minWidth: 0, gap: 8 },
  cardTitle: { color: TINT, fontWeight: "900", fontSize: 18, letterSpacing: 3, textAlign: "center" },
  kicker: { color: "#8f8aab", fontWeight: "900", fontSize: 11, letterSpacing: 2 },
  section: { color: GOLD, fontWeight: "900", fontSize: 13, letterSpacing: 2.2 },
  code: { color: GOLD, fontWeight: "900", fontSize: 36, letterSpacing: 5, textAlign: "center", alignSelf: "stretch" },
  hint: { color: "#c3bedb", fontSize: 13.5, lineHeight: 19, textAlign: "center" },
  input: { alignSelf: "stretch", minHeight: 52, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1.5, borderColor: "rgba(255,213,79,0.45)", color: "#fff", fontSize: 22, fontWeight: "900", letterSpacing: 3, textAlign: "center", paddingHorizontal: 12 },
  error: { color: "#FF8A80", fontSize: 12.5, fontWeight: "700", textAlign: "center" },
  count: { color: "#fff", fontWeight: "900", fontSize: 64, textAlign: "center" },
  stakeBox: { alignSelf: "stretch", alignItems: "center", gap: 2, padding: 8, borderRadius: 12, backgroundColor: "rgba(255,171,64,0.12)", borderWidth: 1, borderColor: "rgba(255,171,64,0.5)" },
  stakeText: { color: "#FFAB40", fontWeight: "900", fontSize: 14 },
  stakeSub: { color: "#d7d2ee", fontSize: 12, textAlign: "center" },
  player: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 18, borderWidth: 2, backgroundColor: "rgba(20,15,40,0.85)", padding: 12 },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: "rgba(255,255,255,0.08)" },
  avatarEmpty: { alignItems: "center", justifyContent: "center" },
  playerTitle: { color: "#8f8aab", fontWeight: "900", fontSize: 11, letterSpacing: 2 },
  playerName: { color: "#fff", fontWeight: "900", fontSize: 17 },
  playerState: { fontWeight: "800", fontSize: 13 },
});
