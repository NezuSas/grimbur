import React from "react";
import { StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import GameIcon from "../../ui/components/GameIcon";
import Text from "../../ui/components/Text";
import SpriteImage from "../../ui/components/SpriteImage";
import OverlayContainer from "../../ui/components/game/OverlayContainer";
import { PopButton, PopupPanel, popupTitleStyle } from "../../ui/components/game/popup";
import { useWindowDimensions } from "../../ui/layout/scaledWindow";
import { useT } from "../../i18n/useT";
import { PUZZLE_COUNT, PUZZLE_TIERS } from "../../core/puzzles/puzzles";
import { MAX_STARS, puzzlesSolved, totalPuzzleStars, type PuzzleProgress } from "../../core/stats/puzzleProgress";
import { formatSolveTime } from "./shareText";
import { useEscapeKey } from "../../ui/hotkeys";

const TINT = "#6CB0B9";
const GOLD = "#C9A55A";
const STAR = require("../../assets/sprites/ui/Icon_Star.webp");

type Props = { puzzles: PuzzleProgress | undefined; onClose: () => void };

/**
 * The player's puzzle numbers, Wordle-style: the path (solved, stars, crowns, chests, average best time), the puzzle of the day
 * (days solved, streaks, days from the archive, and how the days' stars spread), the weekly challenge and the endless puzzles.
 */
export default function PuzzleStats({ puzzles, onClose }: Props) {
  useEscapeKey(onClose);
  const { t } = useT();
  const { width, height } = useWindowDimensions();
  const p = puzzles;
  const times = (p?.times ?? []).filter(x => x > 0);
  const average = times.length ? Math.round(times.reduce((a, x) => a + x, 0) / times.length) : 0;
  const days = Object.values(p?.archive ?? {});
  const spread = [3, 2, 1].map(n => ({ n, count: days.filter(d => d === n).length }));
  const most = Math.max(1, ...spread.map(s => s.count));
  const short = height < 400;

  const tile = (value: string, label: string, icon?: React.ReactNode) => (
    <View style={styles.tile}>
      <View style={styles.tileTop}>
        {icon}
        <Text style={styles.tileValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} maxFontSizeMultiplier={1.1}>
          {value}
        </Text>
      </View>
      <Text style={styles.tileLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} maxFontSizeMultiplier={1.1}>
        {label.toLocaleUpperCase()}
      </Text>
    </View>
  );

  return (
    <OverlayContainer>
      <PopupPanel tint={TINT} width={Math.min(width * 0.94, 720)} style={short ? { gap: 6, paddingVertical: 10 } : undefined}>
        <Text style={popupTitleStyle(TINT)} maxFontSizeMultiplier={1.15}>
          {t("puzzle.stats.title").toLocaleUpperCase()}
        </Text>
        <View style={styles.columns}>
          <View style={styles.column}>
            <Text style={styles.section} maxFontSizeMultiplier={1.1}>
              {t("puzzle.stats.path").toLocaleUpperCase()}
            </Text>
            <View style={styles.grid}>
              {tile(`${puzzlesSolved(p)}/${PUZZLE_COUNT}`, t("puzzle.stats.solved"))}
              {tile(`${totalPuzzleStars(p)}/${PUZZLE_COUNT * MAX_STARS}`, t("puzzle.stats.stars"), <SpriteImage source={STAR} style={{ width: 15, height: 15 }} resizeMode="contain" />)}
              {tile(`${p?.crowns?.length ?? 0}/${PUZZLE_COUNT}`, t("puzzle.stats.crowns"), <MaterialCommunityIcons name="crown" size={15} color={GOLD} />)}
              {tile(`${p?.chests?.length ?? 0}/${PUZZLE_TIERS.length}`, t("puzzle.stats.chests"))}
              {tile(average ? formatSolveTime(average) : "—", t("puzzle.stats.average"), <GameIcon name="timer-outline" size={14} color="#E8D2B2" />)}
              {tile(`${p?.endless?.solved ?? 0}`, t("puzzle.stats.endless"), <GameIcon name="infinite" size={15} color="#B08DBE" />)}
            </View>
          </View>
          <View style={styles.column}>
            <Text style={styles.section} maxFontSizeMultiplier={1.1}>
              {t("puzzle.stats.daily").toLocaleUpperCase()}
            </Text>
            <View style={styles.grid}>
              {tile(`${p?.dailySolved ?? 0}`, t("puzzle.stats.days"))}
              {tile(`${p?.streak ?? 0}`, t("puzzle.stats.streak"), <GameIcon name="flame" size={14} />)}
              {tile(`${p?.bestStreak ?? 0}`, t("puzzle.stats.bestStreak"))}
              {tile(`${p?.weeklyWins ?? 0}`, t("puzzle.stats.weekly"), <GameIcon name="skull" size={14} color="#D58A7E" />)}
            </View>
            <Text style={styles.section} maxFontSizeMultiplier={1.1}>
              {t("puzzle.stats.spread").toLocaleUpperCase()}
            </Text>
            <View style={styles.bars}>
              {spread.map(s => (
                <View key={s.n} style={styles.barRow} accessible accessibilityLabel={`${t("puzzle.stars", { n: s.n })}: ${s.count}`}>
                  <View style={styles.barStars}>
                    {Array.from({ length: s.n }, (_, k) => (
                      <SpriteImage key={k} source={STAR} style={{ width: 12, height: 12 }} resizeMode="contain" />
                    ))}
                  </View>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { width: `${Math.max(8, (s.count / most) * 100)}%`, backgroundColor: s.n === 3 ? GOLD : TINT, opacity: s.count ? 1 : 0.25 }]}>
                      <Text style={styles.barCount} maxFontSizeMultiplier={1}>
                        {s.count}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>
        <PopButton label={t("common.close")} variant="secondary" onPress={onClose} style={{ alignSelf: "stretch" }} enterKey />
      </PopupPanel>
    </OverlayContainer>
  );
}

const styles = StyleSheet.create({
  columns: { flexDirection: "row", gap: 16, alignSelf: "stretch" },
  column: { flex: 1, gap: 6 },
  section: { color: TINT, fontWeight: "900", fontSize: 11, letterSpacing: 1.6 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tile: { flexBasis: "30%", flexGrow: 1, alignItems: "center", gap: 1, paddingVertical: 6, paddingHorizontal: 4, borderRadius: 12, backgroundColor: "rgba(0,0,0,0.35)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  tileTop: { flexDirection: "row", alignItems: "center", gap: 4 },
  tileValue: { color: "#FFF3E0", fontWeight: "900", fontSize: 17 },
  tileLabel: { color: "#a8978a", fontWeight: "900", fontSize: 9.5, letterSpacing: 0.8 },
  flame: { fontSize: 13 },
  bars: { gap: 4 },
  barRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  barStars: { width: 40, flexDirection: "row", justifyContent: "flex-end" },
  barTrack: { flex: 1, height: 18 },
  barFill: { height: 18, borderRadius: 6, justifyContent: "center", alignItems: "flex-end", paddingHorizontal: 6, minWidth: 22 },
  barCount: { color: "#14101F", fontWeight: "900", fontSize: 11 },
});
