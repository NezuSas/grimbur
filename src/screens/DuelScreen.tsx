import React, { useCallback, useEffect, useRef, useState } from "react";
import { ImageBackground, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Text from "../ui/components/Text";
import EmberIcon from "../ui/components/EmberIcon";
import GlyphIcon from "../ui/components/GlyphIcon";
import ScreenHeader from "../ui/components/ScreenHeader";
import FriendCreateJoin from "../ui/components/friends/FriendCreateJoin";
import { PopButton, PopupPanel } from "../ui/components/game/popup";
import { RootStackParamList } from "../navigation/types";
import { useT } from "../i18n/useT";
import characters from "../data/characters";
import { creditEmbersFor, getLocalStats, peekLocalStats, spendEmbersFor } from "../services/localStats";
import { EMPTY_STATS, type LocalStats } from "../core/stats/runStats";
import { newChallenge, parseChallengeCode } from "../core/challenge/code";
import { COUNTDOWN_SECONDS, DUEL_FEE_PERCENT, HEARTBEAT_MS, MAX_PLAYERS, prizeOf, rivalStatus } from "../core/duel/duel";
import type { RivalStatus } from "../core/duel/duel";
import { getPlayerId, getPlayerName, setPlayerName } from "../services/playerProfile";
import { EMPTY_ROOM, openDuelRoom, publishDuelState, watchDuelStake, watchRoom, type Room } from "../services/duel";
import { rememberChallenge } from "../services/challenges";
import { useWindowDimensions, withUiScale } from "../ui/layout/scaledWindow";
import { useEntitlements } from "../state/entitlements/useEntitlements";
import { PlayerPortrait, PlayerTitle } from "../ui/components/PlayerPortrait";
import { lookOf } from "../core/cosmetics/look";
import CodeTicket from "../ui/components/friends/CodeTicket";
import Rise, { riseDelay } from "../ui/components/Rise";

type Props = NativeStackScreenProps<RootStackParamList, "DuelScreen">;

const GOLD = "#FFD54F";
const TINT = "#FF8A80";
const STATE_COLOR = { ready: "#9EE37D", lobby: "#D6C4B2", away: "#FF8A80", inGame: "#4FC3F7", waiting: "#8D7B69" } as const;
type Tone = keyof typeof STATE_COLOR;

/**
 * Live duel for two to four players. Without a code: create a duel (a code to send, a difficulty and an optional stake of embers) or join
 * one. With a code and a hero (chosen on the hero screen): the lobby, where everybody sees each other, presses Ready and, when all are
 * ready, a short countdown starts the same cave on every phone. A stake is paid when the cave starts; the winner takes the pot.
 */
const DuelScreen: React.FC<Props> = ({ navigation, route }) => {
  const { t, n } = useT();
  const code = route.params?.code ?? null;
  const heroIndex = route.params?.characterIndex ?? null;
  const creatorStake = route.params?.stake;
  const challenge = code ? parseChallengeCode(code) : null;
  const inLobby = !!challenge && heroIndex !== null;

  const { width } = useWindowDimensions();
  const narrow = width < 600;
  const [stats, setStats] = useState<LocalStats>(() => peekLocalStats() ?? EMPTY_STATS);
  const { hasFullGame } = useEntitlements();
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
  const [room, setRoom] = useState<Room>(EMPTY_ROOM);
  const [roomStake, setRoomStake] = useState<number | null>(null);
  const [wallNow, setWallNow] = useState(() => Date.now());
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

  // Who is here: rivals who are not disconnected (by the server's clock, so a phone with a wrong clock sees the same room as the others).
  const now = room.serverNow ?? wallNow;
  const rivals = room.rivals.map(r => ({ ...r, status: rivalStatus(r, r.updatedAt, now) as RivalStatus }));
  const present = rivals.filter(r => r.status !== "away" && r.status !== "done");
  const underway = present.some(r => r.state === "playing");
  // The creator chose the stake and wrote it in the room (`duels/<code>`); everybody plays for that one and cannot get ready (or even
  // appear in the room: the rules check the stake) before it is known.
  const stakeKnown = roomStake !== null;
  const myStake = roomStake ?? creatorStake ?? 0;
  const pot = prizeOf(myStake, present.length + 1);
  // Without the full game a run ends at the free floors: staking embers on it would be throwing them away.
  const stakeAllowed = myStake === 0 || hasFullGame;
  const canPay = stats.embers >= myStake;

  // The latest values for timers and the publisher: the publisher must never overwrite "ready" with an older "lobby".
  const readyRef = useRef(ready);
  readyRef.current = ready;
  const stakeRef = useRef(myStake);
  stakeRef.current = myStake;
  const stakeKnownRef = useRef(stakeKnown);
  stakeKnownRef.current = stakeKnown;
  const presentRef = useRef(present);
  presentRef.current = present;

  const publish = useCallback(
    async (state: "lobby" | "ready") => {
      if (!code || name === null || heroIndex === null || !stakeKnownRef.current) return;
      try {
        await publishDuelState(code, name, { characterIndex: heroIndex, state, level: 1, score: 0, victory: false, time: 0, stake: stakeRef.current });
        setProblem(null);
      } catch (e) {
        console.warn("[duel] could not publish:", e);
        setProblem(t("duel.offline"));
      }
    },
    [code, name, heroIndex, t],
  );

  // Joining the room: this player appears in it and listens to the others; a heartbeat keeps the player "here".
  useEffect(() => {
    if (!inLobby || !code || name === null) return;
    let off: (() => void) | undefined;
    let cancelled = false;
    void getPlayerId().then(id => {
      if (cancelled) return;
      off = watchRoom(code, id, setRoom, e => {
        console.warn("[duel] room error:", e);
        setProblem(t("duel.offline"));
      });
    });
    const tick = setInterval(() => setWallNow(Date.now()), 2000);
    const beat = setInterval(() => void publish(readyRef.current ? "ready" : "lobby"), HEARTBEAT_MS);
    return () => {
      cancelled = true;
      off?.();
      clearInterval(tick);
      clearInterval(beat);
    };
  }, [inLobby, code, name, publish, t]);

  // The room's stake: the creator writes it (unless a rematch room was already opened by another player), everybody listens to it.
  useEffect(() => {
    if (!inLobby || !code) return;
    if (creatorStake !== undefined) {
      void openDuelRoom(code, creatorStake)
        .then(setRoomStake)
        .catch(e => {
          console.warn("[duel] could not open the room:", e);
          setProblem(t("duel.offline"));
        });
    }
    return watchDuelStake(code, stake => {
      if (stake !== null) setRoomStake(stake);
    }, e => console.warn("[duel] room stake error:", e));
  }, [inLobby, code, creatorStake, t]);

  // What this player is (in the lobby or ready) is published whenever it changes, in order: the latest write is always the true state.
  useEffect(() => {
    if (!inLobby || !code || name === null) return;
    void publish(ready ? "ready" : "lobby");
  }, [inLobby, code, name, ready, myStake, stakeKnown, publish]);

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
      const stake = stakeRef.current;
      const members = presentRef.current.map(r => r.pid);
      void (async () => {
        // The stake goes into the pot the moment the cave starts.
        const paid = stake > 0 ? await spendEmbersFor(stake) : true;
        if (left.current) {
          if (paid && stake > 0) void creditEmbersFor(stake); // left during the payment: nothing was played, the stake goes back
          return;
        }
        if (!paid) {
          started.current = false;
          setReady(false);
          setCount(null);
          setProblem(t("duel.stakeShort", { n: stake }));
          return;
        }
        navigation.replace("GameScreen", {
          characterIndex: heroIndex ?? 0,
          skin: route.params?.skin,
          mode: "expedition",
          ascension: challenge.depth,
          challenge: { code: challenge.code, seed: challenge.seed, depth: challenge.depth },
          duel: { code: challenge.code, name: name ?? "", stake, members, matchId: String(Date.now()) },
        });
      })();
    }, 1000);
    return () => clearInterval(id);
  }, [allReady]); // eslint-disable-line react-hooks/exhaustive-deps

  // Somebody left before the start: back to waiting.
  useEffect(() => {
    if (count !== null && count > 0 && !allReady) setCount(null);
  }, [allReady, count]);

  const onReady = () => {
    if (!canPay) {
      setProblem(t("duel.stakeShort", { n: myStake }));
      return;
    }
    setReady(true);
  };
  const onCancelReady = () => {
    setReady(false);
    setCount(null);
  };
  useEffect(() => {
    left.current = false;
    return () => {
      left.current = true;
    };
  }, []);

  const stateLabel = (state: string, status: RivalStatus) =>
    status === "away" ? t("duel.state.away") : state === "ready" ? t("duel.state.ready") : state === "playing" || state === "done" ? t("duel.state.inGame") : t("duel.state.lobby");

  const playerCard = (key: string, index: number, who: { name: string; characterIndex: number; frame?: string; title?: string; me?: boolean } | null, label: string, tone: Tone) => {
    const hero = who ? characters[who.characterIndex] || characters[0] : null;
    const color = STATE_COLOR[tone];
    return (
      <Rise key={key} delay={riseDelay(index)} style={[styles.slot, narrow && { flexBasis: "100%" }, who ? (who.me ? styles.slotMe : styles.slotRival) : styles.slotEmpty]}>
        {hero ? (
          <PlayerPortrait source={hero.scoreImage} size={54} frame={who?.frame} />
        ) : (
          <View style={styles.avatarEmpty}>
            <Ionicons name="person-add" size={20} color="#8D7B69" />
          </View>
        )}
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[styles.playerName, !who && { color: "#8D7B69", fontSize: 14 }]} numberOfLines={1} maxFontSizeMultiplier={1.15}>
            {who ? (who.me ? `${who.name} · ${t("duel.you")}` : who.name) : t("duel.slotOpen")}
          </Text>
          <PlayerTitle title={who?.title} />
          <View style={[styles.statePill, { borderColor: color + "AA", backgroundColor: color + "1F" }]}>
            <View style={[styles.stateDot, { backgroundColor: color }]} />
            <Text style={[styles.playerState, { color }]} numberOfLines={1} maxFontSizeMultiplier={1.1}>
              {label}
            </Text>
          </View>
        </View>
      </Rise>
    );
  };
  const toneOf = (state: string, status: RivalStatus): Tone =>
    status === "away" ? "away" : state === "ready" ? "ready" : state === "playing" || state === "done" ? "inGame" : "lobby";


  return (
    <ImageBackground fadeDuration={0} resizeMethod="none" source={require("../assets/sprites/backgrounds/Cover_Background.png")} style={styles.root} resizeMode="cover">
      <SafeAreaView style={{ flex: 1, backgroundColor: "rgba(13, 10, 7,0.9)" }}>
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
              <View style={[styles.cols, narrow && { flexDirection: "column", alignItems: "stretch" }]}>
                <View style={[styles.colMain, narrow && { width: "100%", maxWidth: undefined }]}>
                  <CodeTicket mode="duel" code={challenge.code} depth={challenge.depth}>
                    {myStake > 0 ? (
                      <View style={styles.stakeBox}>
                        <Text style={styles.stakeText} maxFontSizeMultiplier={1.2}><EmberIcon size={13} /> {t("duel.stakeRoom", { n: myStake })}</Text>
                        <Text style={styles.stakeSub} maxFontSizeMultiplier={1.2}>{t("duel.stakeHint", { fee: DUEL_FEE_PERCENT })}{pot > 0 ? <>{"  ·  "}<GlyphIcon name="trophy" size={12} /> {n(pot)}</> : ""}</Text>
                      </View>
                    ) : null}
                    {room.full ? <Text style={styles.error}>{t("duel.full")}</Text> : null}
                    {underway && !ready ? <Text style={styles.error}>{t("duel.underway")}</Text> : null}
                    {!stakeKnown ? <Text style={styles.hint}>{t("duel.waitingHost")}</Text> : null}
                    {!canPay ? <Text style={styles.error}>{t("duel.stakeShort", { n: myStake })}</Text> : null}
                    {!stakeAllowed ? <Text style={styles.error}>{t("duel.stakeLocked")}</Text> : null}
                    {problem ? <Text style={styles.error} accessibilityLiveRegion="polite">{problem}</Text> : null}
                    {count !== null ? (
                      <Text style={styles.count} accessibilityLiveRegion="assertive">{count > 0 ? String(count) : t("duel.go").toLocaleUpperCase()}</Text>
                    ) : ready ? (
                      <>
                        <Text style={styles.hint}>{t("duel.waitingStart")}</Text>
                        <PopButton variant="secondary" label={t("duel.notReady")} onPress={onCancelReady} />
                      </>
                    ) : (
                      <PopButton label={t("duel.ready")} art="swords" onPress={onReady} disabled={room.full || !canPay || !stakeKnown || underway || !stakeAllowed} />
                    )}
                  </CodeTicket>
                </View>
                <View style={styles.colPlayers}>
                  <View style={styles.playersHead}>
                    <Text style={styles.section}>{t("duel.players", { n: present.length + 1, max: MAX_PLAYERS }).toLocaleUpperCase()}</Text>
                    <View style={styles.seats}>
                      {Array.from({ length: MAX_PLAYERS }, (_, i) => (
                        <View key={i} style={[styles.seat, i < present.length + 1 && { backgroundColor: TINT }]} />
                      ))}
                    </View>
                  </View>
                  <View style={styles.slots}>
                    {playerCard("me", 0, { name, characterIndex: heroIndex ?? 0, ...lookOf(peekLocalStats()), me: true }, ready ? t("duel.state.ready") : t("duel.state.lobby"), ready ? "ready" : "lobby")}
                    {rivals.slice(0, MAX_PLAYERS - 1).map((r, i) => playerCard(r.pid, i + 1, { name: r.name, characterIndex: r.characterIndex, frame: r.frame, title: r.title }, stateLabel(r.state, r.status), toneOf(r.state, r.status)))}
                    {Array.from({ length: Math.max(0, MAX_PLAYERS - 1 - rivals.length) }, (_, i) => playerCard(`open${i}`, rivals.length + 1 + i, null, t("duel.state.waiting"), "waiting"))}
                  </View>
                  <Text style={[styles.hint, { textAlign: "left" }]}>{t("duel.lobbyHint")}</Text>
                </View>
              </View>
            )
          ) : (
            <FriendCreateJoin mode="duel" embers={hasFullGame ? stats.embers : 0} onCreate={(depth, stake) => void goHero(newChallenge(depth).code, stake)} onJoin={raw => void goHero(raw)} />
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
  cols: { width: "100%", maxWidth: 980, flexDirection: "row", gap: 14, alignItems: "flex-start" },
  colMain: { width: "40%", maxWidth: 380 },
  colPlayers: { flex: 1, gap: 8 },
  playersHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  seats: { flexDirection: "row", gap: 4 },
  seat: { width: 18, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.15)" },
  slots: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  slot: { flexBasis: "48%", flexGrow: 1, flexDirection: "row", alignItems: "center", gap: 10, minHeight: 74, borderRadius: 16, borderWidth: 1.5, padding: 10 },
  slotMe: { borderColor: "rgba(255,213,79,0.7)", backgroundColor: "rgba(255,213,79,0.08)" },
  slotRival: { borderColor: "rgba(255,138,128,0.55)", backgroundColor: "rgba(36,28,19,0.9)" },
  slotEmpty: { borderColor: "rgba(255,255,255,0.16)", borderStyle: "dashed", backgroundColor: "rgba(36,28,19,0.5)" },
  statePill: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, borderWidth: 1 },
  stateDot: { width: 6, height: 6, borderRadius: 3 },
  cardTitle: { color: TINT, fontWeight: "900", fontSize: 18, letterSpacing: 3, textAlign: "center" },
  kicker: { color: "#B99A7C", fontWeight: "900", fontSize: 11, letterSpacing: 2 },
  section: { color: GOLD, fontWeight: "900", fontSize: 13, letterSpacing: 2.2 },
  code: { color: GOLD, fontWeight: "900", fontSize: 36, letterSpacing: 5, textAlign: "center", alignSelf: "stretch" },
  hint: { color: "#DCCCBD", fontSize: 13.5, lineHeight: 19, textAlign: "center" },
  input: { alignSelf: "stretch", minHeight: 52, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1.5, borderColor: "rgba(255,213,79,0.45)", color: "#fff", fontSize: 22, fontWeight: "900", letterSpacing: 3, textAlign: "center", paddingHorizontal: 12 },
  error: { color: "#FF8A80", fontSize: 12.5, fontWeight: "700", textAlign: "center" },
  count: { color: "#fff", fontWeight: "900", fontSize: 64, textAlign: "center" },
  stakeBox: { alignSelf: "stretch", alignItems: "center", gap: 2, padding: 8, borderRadius: 12, backgroundColor: "rgba(255,171,64,0.12)", borderWidth: 1, borderColor: "rgba(255,171,64,0.5)" },
  stakeText: { color: "#FFAB40", fontWeight: "900", fontSize: 14 },
  stakeSub: { color: "#E9E0D7", fontSize: 12, textAlign: "center" },
  avatarEmpty: { width: 54, height: 54, borderRadius: 27, borderWidth: 1.5, borderStyle: "dashed", borderColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  playerName: { color: "#fff", fontWeight: "900", fontSize: 17 },
  playerState: { fontWeight: "900", fontSize: 11 },
});
