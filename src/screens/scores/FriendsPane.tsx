import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Share, StyleSheet, TextInput, TouchableOpacity, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { Ionicons } from "@expo/vector-icons";
import Text from "../../ui/components/Text";
import PressScale from "../../ui/components/PressScale";
import GlyphIcon from "../../ui/components/GlyphIcon";
import { PlayerPortrait, PlayerTitle } from "../../ui/components/PlayerPortrait";
import characters from "../../data/characters";
import { useT } from "../../i18n/useT";
import type { TranslationKey } from "../../i18n/en";
import { getPlayerId } from "../../services/playerProfile";
import { addFriendCode, getLocalStats, markFriendsSeen, removeFriendCode } from "../../services/localStats";
import { loadFriendCards, type FriendCard } from "../../services/friends";
import { MAX_FRIENDS } from "../../core/social/friends";
import { seasonKeyOf } from "../../core/stats/season";
import { dailyKey } from "../../core/engine/seed";
import { haptic } from "../../shared/haptics";

const GOLD = "#D9B45A";

/**
 * Friends: this player's friend code (to copy or share), a box to add a friend's code, and every friend with their best run and
 * their points this season. A friend who beat their best since the last look wears a "new record" badge (once).
 */
/** `embedded`: drawn inside a screen that already scrolls (no scroll view of its own). */
const FriendsPane = ({ bottomInset = 0, embedded = false, onCount }: { bottomInset?: number; embedded?: boolean; onCount?: (n: number) => void }) => {
  const { t, n } = useT();
  const [myCode, setMyCode] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [cards, setCards] = useState<FriendCard[] | null>(null);
  const [offline, setOffline] = useState(false);
  const [count, setCount] = useState(0);

  const Frame = useCallback(
    ({ children }: { children: React.ReactNode }) =>
      embedded ? (
        <View style={{ gap: 8 }}>{children}</View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 8, paddingBottom: 24 + bottomInset }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      ),
    [embedded, bottomInset],
  );

  const load = useCallback(async () => {
    setOffline(false);
    const stats = await getLocalStats();
    setCount(stats.friends.length);
    onCount?.(stats.friends.length);
    if (stats.friends.length === 0) {
      setCards([]);
      return;
    }
    setCards(null);
    try {
      const loaded = await loadFriendCards(stats.friends, seasonKeyOf(dailyKey()));
      setCards(loaded);
      void markFriendsSeen(Object.fromEntries(loaded.map(c => [c.pid, c.best])));
    } catch {
      setOffline(true);
      setCards([]);
    }
  }, []);

  useEffect(() => {
    void getPlayerId().then(setMyCode).catch(() => {});
    void load();
  }, [load]);

  const add = async () => {
    const { error: why } = await addFriendCode(typed, myCode);
    if (why) {
      setError(t(`friends.error.${why}` as TranslationKey, { n: MAX_FRIENDS }));
      return;
    }
    haptic.impact();
    setTyped("");
    setError(null);
    void load();
  };
  const remove = async (pid: string) => {
    await removeFriendCode(pid);
    void load();
  };
  const copy = async () => {
    if (!myCode) return;
    await Clipboard.setStringAsync(myCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };
  const share = () => {
    if (myCode) void Share.share({ message: t("friends.shareText", { code: myCode }) }).catch(() => {});
  };

  return (
    <Frame>
      <View style={styles.codeBox}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.kicker} maxFontSizeMultiplier={1.1}>{t("friends.myCode").toLocaleUpperCase()}</Text>
          <Text style={styles.code} numberOfLines={1} adjustsFontSizeToFit selectable maxFontSizeMultiplier={1.1}>
            {myCode ?? "…"}
          </Text>
        </View>
        <TouchableOpacity style={styles.iconButton} onPress={copy} accessibilityRole="button" accessibilityLabel={t("friends.copy")}>
          <Ionicons name={copied ? "checkmark" : "copy-outline"} size={18} color="#2A2016" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconButton} onPress={share} accessibilityRole="button" accessibilityLabel={t("friends.share")}>
          <Ionicons name="share-social-outline" size={18} color="#2A2016" />
        </TouchableOpacity>
      </View>

      <View style={styles.addRow}>
        <TextInput
          style={styles.input}
          value={typed}
          onChangeText={v => {
            setTyped(v);
            setError(null);
          }}
          placeholder={t("friends.placeholder")}
          placeholderTextColor="#8C7A68"
          autoCapitalize="none"
          autoCorrect={false}
          onSubmitEditing={add}
          accessibilityLabel={t("friends.placeholder")}
        />
        <PressScale onPress={add} disabled={!typed.trim()} style={[styles.addButton, !typed.trim() && { opacity: 0.5 }]} accessibilityRole="button" accessibilityLabel={t("friends.add")}>
          <Ionicons name="person-add" size={16} color="#2A2016" />
          <Text style={styles.addText} maxFontSizeMultiplier={1.1}>{t("friends.add").toLocaleUpperCase()}</Text>
        </PressScale>
      </View>
      {error ? <Text style={styles.error} maxFontSizeMultiplier={1.2}>{error}</Text> : null}

      {cards === null ? (
        <ActivityIndicator color={GOLD} style={{ marginTop: 16 }} />
      ) : offline ? (
        <Text style={styles.empty} maxFontSizeMultiplier={1.2}>{t("scores.error")}</Text>
      ) : count === 0 ? (
        <Text style={styles.empty} maxFontSizeMultiplier={1.2}>{t("friends.empty")}</Text>
      ) : (
        cards.map(c => {
          const hero = characters[c.characterIndex] || characters[0];
          return (
            <View key={c.pid} style={[styles.row, c.newRecord && styles.rowNew]}>
              <PlayerPortrait source={hero.scoreImage} size={c.frame ? 50 : 40} frame={c.frame} />
              <View style={{ flex: 1 }}>
                <Text style={styles.name} numberOfLines={1} maxFontSizeMultiplier={1.2}>
                  {c.name ?? t("friends.unknown", { code: c.pid.slice(0, 6) })}
                </Text>
                <PlayerTitle title={c.title} />
                <Text style={styles.sub} numberOfLines={1} maxFontSizeMultiplier={1.2}>
                  {c.level > 0 ? `${t("scores.floorShort", { n: c.level })}  ·  ` : ""}
                  <GlyphIcon name="trophy" size={11} /> {c.seasonPoints !== null ? t("friends.season", { n: n(c.seasonPoints) }) : t("friends.noSeason")}
                </Text>
              </View>
              <View style={{ alignItems: "flex-end", gap: 2 }}>
                {c.newRecord ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText} maxFontSizeMultiplier={1.05}>{t("friends.newRecord").toLocaleUpperCase()}</Text>
                  </View>
                ) : null}
                <Text style={styles.score} numberOfLines={1} maxFontSizeMultiplier={1.2}>{n(c.best)}</Text>
              </View>
              <TouchableOpacity onPress={() => remove(c.pid)} hitSlop={8} accessibilityRole="button" accessibilityLabel={t("friends.remove")}>
                <Ionicons name="close" size={16} color="#C4AA91" />
              </TouchableOpacity>
            </View>
          );
        })
      )}
    </Frame>
  );
};

export default FriendsPane;

const styles = StyleSheet.create({
  codeBox: { flexDirection: "row", alignItems: "center", gap: 8, padding: 10, borderRadius: 14, borderWidth: 1.5, borderColor: "rgba(217, 180, 90,0.35)", backgroundColor: "rgba(34,26,18,0.92)" },
  kicker: { color: GOLD, fontWeight: "900", fontSize: 11, letterSpacing: 1.2 },
  code: { color: "#FFF4DE", fontWeight: "800", fontSize: 14, letterSpacing: 0.5 },
  iconButton: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: GOLD },
  addRow: { flexDirection: "row", gap: 8 },
  input: { flex: 1, minHeight: 40, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.15)", backgroundColor: "rgba(0,0,0,0.35)", color: "#FFF4DE", fontSize: 14 },
  addButton: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, borderRadius: 12, backgroundColor: GOLD },
  addText: { color: "#2A2016", fontWeight: "900", fontSize: 12 },
  error: { color: "#D58A7E", fontSize: 12, fontWeight: "700" },
  empty: { color: "#C2A88F", fontSize: 13, fontWeight: "600", textAlign: "center", marginTop: 12, paddingHorizontal: 12 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, padding: 8, borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.09)", backgroundColor: "rgba(34,26,18,0.9)" },
  rowNew: { borderColor: GOLD, backgroundColor: "rgba(217, 180, 90,0.1)" },
  name: { color: "#FFF4DE", fontWeight: "900", fontSize: 14 },
  sub: { color: "#B99A7C", fontSize: 12, fontWeight: "600" },
  score: { color: GOLD, fontWeight: "900", fontSize: 16 },
  badge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6, backgroundColor: GOLD },
  badgeText: { color: "#2A2016", fontWeight: "900", fontSize: 10 },
});
