import React, { useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Text from "../../ui/components/Text";
import SpriteImage from "../../ui/components/SpriteImage";
import OverlayContainer from "../../ui/components/game/OverlayContainer";
import { PopButton, PopupPanel, popupTitleStyle } from "../../ui/components/game/popup";
import { useWindowDimensions } from "../../ui/layout/scaledWindow";
import { useT } from "../../i18n/useT";
import type { TranslationKey } from "../../i18n/en";
import { dailyPuzzleTier } from "../../core/puzzles/puzzles";
import { MAX_STARS, PUZZLE_EPOCH, archiveStars, type PuzzleProgress } from "../../core/stats/puzzleProgress";
import { TIER_TINTS } from "./ChapterMap";
import { useEscapeKey } from "../../ui/hotkeys";

const TINT = "#6CB0B9";
const STAR = require("../../assets/sprites/ui/Icon_Star.webp");

type Props = {
  today: string;
  puzzles: PuzzleProgress | undefined;
  /** Play the puzzle of that day (today's is the real puzzle of the day). */
  onPlay: (date: string) => void;
  onClose: () => void;
};

const pad = (n: number) => String(n).padStart(2, "0");
const keyOf = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;
const monthOf = (key: string) => ({ y: Number(key.slice(0, 4)), m: Number(key.slice(5, 7)) });

/**
 * The archive of the puzzles of the day: a month as a calendar, every day since the first puzzle with its stars (or waiting to
 * be played), today ringed. A past day is played for its stars alone: no embers, no streak.
 */
export default function ArchiveModal({ today, puzzles, onPlay, onClose }: Props) {
  useEscapeKey(onClose);
  const { t } = useT();
  const { width, height } = useWindowDimensions();
  const first = monthOf(PUZZLE_EPOCH);
  const last = monthOf(today);
  const [shown, setShown] = useState(last);
  const canBack = shown.y > first.y || (shown.y === first.y && shown.m > first.m);
  const canNext = shown.y < last.y || (shown.y === last.y && shown.m < last.m);
  const step = (by: number) => setShown(({ y, m }) => (m + by < 1 ? { y: y - 1, m: 12 } : m + by > 12 ? { y: y + 1, m: 1 } : { y, m: m + by }));

  const days = new Date(shown.y, shown.m, 0).getDate();
  const lead = new Date(shown.y, shown.m - 1, 1).getDay();
  const letters = t("puzzle.weekdays");
  const solvedAll = Object.keys(puzzles?.archive ?? {}).length;
  const short = height < 400;
  const cell = Math.floor(Math.min(46, (Math.min(width * 0.92, 520) - 40) / 7, (height - (short ? 150 : 210)) / 6.4));
  const month = t(`season.month.${shown.m}` as TranslationKey);

  return (
    <OverlayContainer>
      <PopupPanel tint={TINT} width={Math.min(width * 0.92, 520)} style={short ? { gap: 6, paddingVertical: 10 } : undefined}>
        <Text style={popupTitleStyle(TINT)} maxFontSizeMultiplier={1.15}>
          {t("puzzle.archive.title").toLocaleUpperCase()}
        </Text>
        {!short ? (
          <Text style={styles.note} maxFontSizeMultiplier={1.15}>
            {t("puzzle.archive.note")}
          </Text>
        ) : null}
        <View style={styles.monthRow}>
          <TouchableOpacity onPress={() => step(-1)} disabled={!canBack} style={[styles.arrow, !canBack && { opacity: 0.25 }]} accessibilityRole="button" accessibilityLabel={t("puzzle.archive.prev")}>
            <Ionicons name="chevron-back" size={18} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.month} maxFontSizeMultiplier={1.15}>
            {`${month.charAt(0).toLocaleUpperCase()}${month.slice(1)} ${shown.y}`}
          </Text>
          <TouchableOpacity onPress={() => step(1)} disabled={!canNext} style={[styles.arrow, !canNext && { opacity: 0.25 }]} accessibilityRole="button" accessibilityLabel={t("puzzle.archive.next")}>
            <Ionicons name="chevron-forward" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
        <View style={{ width: cell * 7 }}>
          <View style={styles.week}>
            {Array.from({ length: 7 }, (_, k) => (
              <Text key={k} style={[styles.weekday, { width: cell }]} maxFontSizeMultiplier={1}>
                {letters[k] ?? ""}
              </Text>
            ))}
          </View>
          <View style={styles.grid}>
            {Array.from({ length: lead }, (_, k) => (
              <View key={`e${k}`} style={{ width: cell, height: cell }} />
            ))}
            {Array.from({ length: days }, (_, k) => {
              const date = keyOf(shown.y, shown.m, k + 1);
              const playable = date >= PUZZLE_EPOCH && date <= today;
              const isToday = date === today;
              const stars = archiveStars(puzzles, date);
              const tint = playable ? TIER_TINTS[dailyPuzzleTier(date)] : "#555";
              return (
                <TouchableOpacity
                  key={date}
                  disabled={!playable}
                  onPress={() => onPlay(date)}
                  style={{ width: cell, height: cell, padding: 2 }}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !playable }}
                  accessibilityLabel={`${k + 1} ${month}${isToday ? `, ${t("puzzle.archive.today")}` : ""}${stars ? `, ${t("puzzle.stars", { n: stars })}` : ""}`}
                >
                  <View
                    style={[
                      styles.day,
                      playable && { borderColor: tint + (stars ? "CC" : "55"), backgroundColor: stars ? tint + "26" : "rgba(255,255,255,0.05)" },
                      isToday && { borderColor: TINT, borderWidth: 2 },
                      !playable && { opacity: 0.25 },
                    ]}
                  >
                    <Text style={[styles.dayNumber, { fontSize: cell * 0.3 }, isToday && { color: "#F3EADB" }]} maxFontSizeMultiplier={1}>
                      {k + 1}
                    </Text>
                    {stars ? (
                      <View style={styles.dayStars}>
                        {Array.from({ length: MAX_STARS }, (_, s) => (
                          <SpriteImage key={s} source={STAR} style={{ width: cell * 0.2, height: cell * 0.2, opacity: s < stars ? 1 : 0.2 }} resizeMode="contain" />
                        ))}
                      </View>
                    ) : null}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
        <Text style={styles.count} maxFontSizeMultiplier={1.15}>
          {t("puzzle.archive.link", { n: solvedAll })}
        </Text>
        <PopButton label={t("common.close")} variant="secondary" onPress={onClose} style={{ alignSelf: "stretch" }} enterKey />
      </PopupPanel>
    </OverlayContainer>
  );
}

const styles = StyleSheet.create({
  note: { color: "#cfe9ee", fontSize: 12, textAlign: "center" },
  monthRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  arrow: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.1)" },
  month: { color: "#F3EADB", fontWeight: "900", fontSize: 16, minWidth: 150, textAlign: "center" },
  week: { flexDirection: "row" },
  weekday: { color: "#7fa3a8", fontWeight: "900", fontSize: 11, textAlign: "center" },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  day: { flex: 1, borderRadius: 10, borderWidth: 1, borderColor: "transparent", alignItems: "center", justifyContent: "center" },
  dayNumber: { color: "#E6D6C2", fontWeight: "900" },
  dayStars: { flexDirection: "row" },
  count: { color: "#E8D2B2", fontWeight: "800", fontSize: 12 },
});
