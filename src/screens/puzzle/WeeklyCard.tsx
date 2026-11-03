import React, { useCallback, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import Text from "../../ui/components/Text";
import SpriteImage from "../../ui/components/SpriteImage";
import PressScale from "../../ui/components/PressScale";
import EmberIcon from "../../ui/components/EmberIcon";
import { useT } from "../../i18n/useT";
import type { FriendEntry } from "../../core/social/friends";
import type { WeeklyState } from "../../core/stats/puzzleProgress";
import { WEEKLY_EMBERS, weeklyNumber } from "../../core/puzzles/weekly";
import { loadFriendsWeekly, type WeeklyRow } from "../../services/weeklyScores";
import { formatSolveTime } from "./shareText";

const RED = "#CC5249";
const GRIMBUR = require("../../assets/sprites/enemies/Grimbur_Boss.webp");
const SHOWN = 4;

type Props = {
  week: string;
  state: WeeklyState;
  /** Time left in the week, already worded ("3 d", "5h 12m"). */
  left: string;
  friends: readonly FriendEntry[];
  onPlay: (practice: boolean) => void;
};

/**
 * The Grimbur's weekly challenge: the week's number and time left, its rules in one line (one try, one mistake ends it, no
 * hints), what the player did with it, and how friends fared. The button takes the counted try, or practice once it is spent.
 */
export default function WeeklyCard({ week, state, left, friends, onPlay }: Props) {
  const { t } = useT();
  const [board, setBoard] = useState<{ rows: WeeklyRow[]; me: string } | null>(null);
  const key = friends.map(f => f.pid).join(",");
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      loadFriendsWeekly(week, friends)
        .then(r => alive && setBoard(r))
        .catch(() => alive && setBoard(null));
      return () => {
        alive = false;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [week, key]),
  );
  const fresh = state.kind === "fresh";
  const others = board ? board.rows.filter(r => r.pid !== board.me).length : 0;

  return (
    <PressScale
      onPress={() => onPlay(!fresh)}
      style={styles.card}
      accessibilityRole="button"
      accessibilityLabel={`${t("puzzle.weekly.title")} #${weeklyNumber(week)}. ${fresh ? t("puzzle.weekly.rules") : state.solved ? t("puzzle.weekly.solvedIn", { time: formatSolveTime(state.time) }) : t("puzzle.weekly.spent")}`}
    >
      <LinearGradient colors={["rgba(70,16,16,0.96)", "rgba(20,8,8,0.97)"]} style={StyleSheet.absoluteFill} />
      <View style={styles.head}>
        <SpriteImage source={GRIMBUR} style={styles.art} resizeMode="contain" />
        <View style={{ flex: 1, gap: 1 }}>
          <Text style={styles.kicker} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} maxFontSizeMultiplier={1.1}>
            {`${t("puzzle.weekly.kicker")} #${weeklyNumber(week)}`.toLocaleUpperCase()}
          </Text>
          <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} maxFontSizeMultiplier={1.1}>
            {t("puzzle.weekly.title")}
          </Text>
          <Text style={styles.left} maxFontSizeMultiplier={1.1}>
            {t("puzzle.weekly.left", { time: left })}
          </Text>
        </View>
      </View>
      {fresh ? (
        <>
          <Text style={styles.rules} numberOfLines={3} adjustsFontSizeToFit minimumFontScale={0.8} maxFontSizeMultiplier={1.1}>
            {t("puzzle.weekly.rules")}
          </Text>
          <View style={styles.reward}>
            <EmberIcon size={13} />
            <Text style={styles.rewardText} maxFontSizeMultiplier={1.1}>
              {t("puzzle.weekly.reward", { n: WEEKLY_EMBERS })}
            </Text>
          </View>
        </>
      ) : (
        <Text style={[styles.status, state.solved && { color: "#A3BF7C" }]} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.8} maxFontSizeMultiplier={1.1}>
          {state.solved ? t("puzzle.weekly.solvedIn", { time: formatSolveTime(state.time) }) : t("puzzle.weekly.spent")}
        </Text>
      )}
      {board && others > 0 ? (
        <View style={styles.board}>
          {board.rows.slice(0, SHOWN).map((r, i) => {
            const mine = r.pid === board.me;
            return (
              <View key={r.pid} style={[styles.row, mine && styles.rowMine]}>
                <Text style={styles.rank} maxFontSizeMultiplier={1}>
                  {i + 1}
                </Text>
                <Text style={styles.name} numberOfLines={1} maxFontSizeMultiplier={1}>
                  {mine ? t("puzzle.friends.you") : r.name}
                </Text>
                <Text style={[styles.time, !r.solved && { color: "#a88" }]} maxFontSizeMultiplier={1}>
                  {r.solved ? formatSolveTime(r.time) : "✗"}
                </Text>
              </View>
            );
          })}
        </View>
      ) : null}
      <View style={[styles.button, !fresh && styles.buttonPractice]}>
        <Text style={[styles.buttonText, !fresh && { color: "#E3C7C4" }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} maxFontSizeMultiplier={1.1}>
          {(fresh ? t("puzzle.weekly.accept") : t("puzzle.weekly.practice")).toLocaleUpperCase()}
        </Text>
      </View>
    </PressScale>
  );
}

const styles = StyleSheet.create({
  card: { alignSelf: "stretch", gap: 8, padding: 12, borderRadius: 20, borderWidth: 2, borderColor: RED + "AA", overflow: "hidden", backgroundColor: "#1a0808" },
  head: { flexDirection: "row", alignItems: "center", gap: 10 },
  art: { width: 58, height: 58 },
  kicker: { color: RED, fontWeight: "900", letterSpacing: 1.6, fontSize: 11 },
  title: { color: "#FFEBEE", fontWeight: "900", fontSize: 18 },
  left: { color: "#d7b3b3", fontWeight: "800", fontSize: 11 },
  rules: { color: "#F3D9D9", fontSize: 11.5, textAlign: "center" },
  reward: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4 },
  rewardText: { color: "#E2BE8C", fontWeight: "800", fontSize: 12 },
  status: { color: "#E3C7C4", fontWeight: "800", fontSize: 12.5, textAlign: "center" },
  board: { gap: 2, padding: 6, borderRadius: 12, backgroundColor: "rgba(0,0,0,0.35)" },
  row: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 4, paddingVertical: 2, borderRadius: 6 },
  rowMine: { backgroundColor: RED + "22" },
  rank: { color: "#a88", fontWeight: "900", fontSize: 11, width: 12, textAlign: "center" },
  name: { flex: 1, color: "#F3D9D9", fontWeight: "800", fontSize: 11.5 },
  time: { color: "#E8D2B2", fontWeight: "900", fontSize: 11.5 },
  button: { minHeight: 42, borderRadius: 14, backgroundColor: RED, alignItems: "center", justifyContent: "center", paddingHorizontal: 10, borderBottomWidth: 3, borderBottomColor: "#B71C1C" },
  buttonPractice: { backgroundColor: "rgba(204, 82, 73,0.15)", borderWidth: 1.5, borderColor: RED, borderBottomWidth: 1.5 },
  buttonText: { color: "#1a0505", fontWeight: "900", letterSpacing: 1, fontSize: 14 },
});
