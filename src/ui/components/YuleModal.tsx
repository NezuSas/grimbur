import React from "react";
import { StyleSheet, View } from "react-native";
import { useWindowDimensions } from "../layout/scaledWindow";
import Text from "./Text";
import SpriteImage from "./SpriteImage";
import OverlayContainer from "./game/OverlayContainer";
import { PopButton, PopupPanel, popupTitleStyle } from "./game/popup";
import { useT } from "../../i18n/useT";
import { FRAME_ART, PET_ADULT_ART } from "../cosmeticArt";
import { YULE_FLOORS, YULE_PUZZLES, yuleProgress, type EventProgress } from "../../core/events/yule";

const PINE = "#81C784";
const GOLD = "#FFD54F";

type Props = { events: EventProgress | undefined; today: string; onClose: () => void; onPuzzles: () => void };

/** Christmas in the cave: what can be earned this December and how far the player is. */
export default function YuleModal({ events, today, onClose, onPuzzles }: Props) {
  const { t } = useT();
  const { width, height } = useWindowDimensions();
  const p = yuleProgress(events, today);
  // A small landscape phone: tighter rows, and the gift is told in the subtitle line instead of its own.
  const short = height < 400;
  const daysLeft = Math.max(1, 32 - Number(today.slice(8, 10)));
  const floorsDone = p.floors >= YULE_FLOORS;
  const puzzlesDone = p.puzzles >= YULE_PUZZLES;
  const rows = [
    { key: "frame", art: FRAME_ART.frame_yule, name: t("cosmetic.frame_yule.name"), goal: t("yule.goal.floors", { n: YULE_FLOORS }), now: Math.min(p.floors, YULE_FLOORS), max: YULE_FLOORS },
    { key: "pet", art: PET_ADULT_ART.pet_reindeer?.[0], name: t("cosmetic.pet_reindeer.name"), goal: t("yule.goal.puzzles", { n: YULE_PUZZLES }), now: Math.min(p.puzzles, YULE_PUZZLES), max: YULE_PUZZLES },
    { key: "title", art: undefined, name: `«${t("cosmetic.title_yule.name")}»`, goal: t("yule.goal.both"), now: (floorsDone ? 1 : 0) + (puzzlesDone ? 1 : 0), max: 2 },
  ];
  return (
    <OverlayContainer>
      <PopupPanel tint={PINE} width={Math.min(width * 0.92, 640)} style={[{ maxHeight: height * 0.96 }, short && { gap: 6, paddingVertical: 12 }]}>
        <Text style={popupTitleStyle(GOLD)} maxFontSizeMultiplier={1.15}>
          {`❄ ${t("yule.title").toLocaleUpperCase()} ❄`}
        </Text>
        <Text style={styles.sub} maxFontSizeMultiplier={1.15}>
          {short ? t("yule.subShort", { n: daysLeft }) : t("yule.sub", { n: daysLeft })}
        </Text>
        <View style={[styles.rows, short && { gap: 5 }]}>
          {rows.map(r => {
            const done = r.now >= r.max;
            return (
              <View key={r.key} style={[styles.row, short && styles.rowShort, done && styles.rowDone]} accessible accessibilityLabel={`${r.name}. ${r.goal}. ${r.now}/${r.max}`}>
                <View style={[styles.art, short && styles.artShort]}>
                  {r.art ? <SpriteImage source={r.art} style={{ width: short ? 34 : 46, height: short ? 34 : 46 }} resizeMode="contain" /> : <Text style={styles.titleArt}>✦</Text>}
                </View>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={styles.name} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} maxFontSizeMultiplier={1.15}>
                    {r.name}
                  </Text>
                  <Text style={styles.goal} numberOfLines={short ? 1 : 2} maxFontSizeMultiplier={1.15}>
                    {r.goal}
                  </Text>
                  <View style={styles.bar}>
                    <View style={[styles.fill, { width: `${Math.round((r.now / r.max) * 100)}%` }, done && { backgroundColor: GOLD }]} />
                  </View>
                </View>
                <Text style={[styles.count, done && { color: GOLD }]} maxFontSizeMultiplier={1.15}>
                  {done ? "✓" : `${r.now}/${r.max}`}
                </Text>
              </View>
            );
          })}
        </View>
        {short ? null : (
          <Text style={styles.gift} maxFontSizeMultiplier={1.15}>
            {t("yule.gift")}
          </Text>
        )}
        <View style={styles.actions}>
          <PopButton label={t("yule.puzzle")} variant="secondary" onPress={onPuzzles} style={{ flex: 1 }} />
          <PopButton label={t("yule.go")} tint={PINE} onPress={onClose} style={{ flex: 1 }} />
        </View>
      </PopupPanel>
    </OverlayContainer>
  );
}

const styles = StyleSheet.create({
  sub: { color: "#E6D6C2", fontSize: 13, textAlign: "center", marginTop: -4 },
  rows: { alignSelf: "stretch", gap: 8 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, padding: 8, borderRadius: 14, borderWidth: 1.5, borderColor: PINE + "66", backgroundColor: "rgba(0,0,0,0.3)" },
  rowShort: { paddingVertical: 4 },
  artShort: { width: 38, height: 38 },
  rowDone: { borderColor: GOLD + "AA" },
  art: { width: 50, height: 50, borderRadius: 25, alignItems: "center", justifyContent: "center", backgroundColor: PINE + "22" },
  titleArt: { color: GOLD, fontSize: 26, fontWeight: "900" },
  name: { color: "#FFF3E0", fontWeight: "900", fontSize: 14 },
  goal: { color: "#CDBBA5", fontSize: 12 },
  bar: { height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.12)", overflow: "hidden" },
  fill: { height: 6, borderRadius: 3, backgroundColor: PINE },
  count: { color: "#E6D6C2", fontWeight: "900", fontSize: 14, minWidth: 40, textAlign: "right" },
  gift: { color: GOLD, fontSize: 12, fontWeight: "800", textAlign: "center" },
  actions: { flexDirection: "row", gap: 10, alignSelf: "stretch" },
});
