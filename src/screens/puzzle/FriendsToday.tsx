import React, { useCallback, useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import Text from "../../ui/components/Text";
import SpriteImage from "../../ui/components/SpriteImage";
import { useT } from "../../i18n/useT";
import type { FriendEntry } from "../../core/social/friends";
import { loadFriendsPuzzle, type PuzzleRow } from "../../services/puzzleScores";
import { formatSolveTime } from "./shareText";

const STAR = require("../../assets/sprites/ui/Icon_Star.webp");
const TINT = "#6CB0B9";
const SHOWN = 6;

/**
 * The puzzle of the day among friends: who solved it, with how many stars and how fast (the player among them). Without friends
 * it offers the way to add some; when the board cannot be read it stays out of the way.
 */
export default function FriendsToday({ date, friends, onAddFriends }: { date: string; friends: readonly FriendEntry[]; onAddFriends: () => void }) {
  const { t } = useT();
  const [state, setState] = useState<{ rows: PuzzleRow[]; me: string } | "loading" | "offline">("loading");
  const key = friends.map(f => f.pid).join(",");

  useFocusEffect(
    useCallback(() => {
      if (friends.length === 0) return;
      let alive = true;
      loadFriendsPuzzle(date, friends)
        .then(r => alive && setState(r))
        .catch(() => alive && setState("offline"));
      return () => {
        alive = false;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [date, key]),
  );

  if (friends.length === 0) {
    return (
      <TouchableOpacity onPress={onAddFriends} style={styles.invite} accessibilityRole="button" accessibilityLabel={t("puzzle.friends.invite")}>
        <Ionicons name="people" size={16} color={TINT} />
        <Text style={styles.inviteText} maxFontSizeMultiplier={1.15}>
          {t("puzzle.friends.invite")}
        </Text>
        <Ionicons name="chevron-forward" size={14} color={TINT} />
      </TouchableOpacity>
    );
  }
  if (state === "offline") return null;

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Ionicons name="people" size={14} color={TINT} />
        <Text style={styles.kicker} maxFontSizeMultiplier={1.1}>
          {t("puzzle.friends.title").toLocaleUpperCase()}
        </Text>
      </View>
      {state === "loading" ? (
        <Text style={styles.note} maxFontSizeMultiplier={1.15}>
          …
        </Text>
      ) : state.rows.filter(r => r.pid !== state.me).length === 0 ? (
        <Text style={styles.note} maxFontSizeMultiplier={1.15}>
          {t("puzzle.friends.none")}
        </Text>
      ) : (
        state.rows.slice(0, SHOWN).map((r, i) => {
          const mine = r.pid === state.me;
          return (
            <View
              key={r.pid}
              style={[styles.row, mine && styles.rowMine]}
              accessible
              accessibilityLabel={`${i + 1}. ${mine ? t("puzzle.friends.you") : r.name}: ${t("puzzle.stars", { n: r.stars })}, ${formatSolveTime(r.time)}`}
            >
              <Text style={styles.rank} maxFontSizeMultiplier={1.1}>
                {i + 1}
              </Text>
              <Text style={[styles.name, mine && { color: "#F3EADB" }]} numberOfLines={1} maxFontSizeMultiplier={1.1}>
                {mine ? t("puzzle.friends.you") : r.name}
              </Text>
              <View style={styles.stars}>
                {[1, 2, 3].map(n => (
                  <SpriteImage key={n} source={STAR} style={{ width: 11, height: 11, opacity: n <= r.stars ? 1 : 0.16 }} resizeMode="contain" />
                ))}
              </View>
              <Text style={styles.time} maxFontSizeMultiplier={1.1}>
                {formatSolveTime(r.time)}
              </Text>
            </View>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { alignSelf: "stretch", gap: 4, padding: 10, borderRadius: 16, borderWidth: 1, borderColor: TINT + "55", backgroundColor: "rgba(0,0,0,0.35)" },
  head: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 },
  kicker: { color: TINT, fontWeight: "900", letterSpacing: 1.6, fontSize: 11 },
  note: { color: "#bfb3a6", fontSize: 12 },
  row: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 3, paddingHorizontal: 6, borderRadius: 8 },
  rowMine: { backgroundColor: TINT + "22" },
  rank: { color: "#8d8178", fontWeight: "900", fontSize: 12, width: 14, textAlign: "center" },
  name: { flex: 1, color: "#E6D6C2", fontWeight: "800", fontSize: 12 },
  stars: { flexDirection: "row", gap: 1 },
  time: { color: "#E8D2B2", fontWeight: "800", fontSize: 12, minWidth: 34, textAlign: "right" },
  invite: { alignSelf: "stretch", flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 14, borderWidth: 1, borderColor: TINT + "44", backgroundColor: "rgba(0,0,0,0.3)" },
  inviteText: { flex: 1, color: "#cfe9ee", fontSize: 12, fontWeight: "700" },
});
