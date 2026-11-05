import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import type { ImageSourcePropType } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import GameIcon from "../../ui/components/GameIcon";
import Text from "../../ui/components/Text";
import SpriteImage from "../../ui/components/SpriteImage";
import OverlayContainer from "../../ui/components/game/OverlayContainer";
import { PopButton, PopupPanel, popupTitleStyle } from "../../ui/components/game/popup";
import { BEAST_ART } from "../../ui/beastArt";
import { RELIC_IMAGES } from "../../ui/relicImages";
import { useWindowDimensions } from "../../ui/layout/scaledWindow";
import { formatTime } from "../../shared/utils/formatTime";
import { BEASTS, type BeastId } from "../../core/stats/bestiary";
import { RELICS, type RelicId } from "../../core/engine/relics";
import type { RunBoard } from "../../core/stats/runLog";
import type { RunRecord } from "../../core/stats/runStats";
import characters from "../../data/characters";
import { useT } from "../../i18n/useT";
import { heroText } from "../../i18n/keys";
import type { TranslationKey } from "../../i18n/en";
import { ENCOUNTERS, type EncounterId } from "../../core/engine/encounters";
import { isAncientLair } from "../../core/engine/generator";
import { ENCOUNTER_ART, ENCOUNTER_TINT } from "../../ui/components/game/EncounterModal";
import { useEscapeKey } from "../../ui/hotkeys";

const GEM = require("../../assets/sprites/items/Icon_Gem.webp");
const WIN = "#C9A356";
const LOSS = "#CF6F68";

const artOf = (kind: string): ImageSourcePropType | null => {
  if (kind === "coin") return GEM;
  return (BEASTS as readonly string[]).includes(kind) ? BEAST_ART[kind as BeastId] : null;
};

/** The last floor of a run, drawn small: the tiles walked lit, what hid in the fog shown, the hero where the run ended. */
export const RunBoardMap = ({ board, size, victory, heroArt }: { board: RunBoard; size: number; victory: boolean; heroArt: ImageSourcePropType }) => {
  const cell = Math.floor(Math.min(size / board.cols, (size * 0.62) / board.rows));
  const walked = new Set(board.visited);
  const order = new Map(board.visited.map((v, i) => [v, i]));
  const things = new Map(board.things);
  return (
    <View style={[styles.map, { width: cell * board.cols + 4, height: cell * board.rows + 4 }]}>
      {Array.from({ length: board.rows * board.cols }, (_, i) => {
        const kind = things.get(i);
        const art = kind ? artOf(kind) : null;
        const on = walked.has(i);
        const here = i === board.player;
        // The path brightens towards its end: where the hero went last stands out.
        const step = order.get(i);
        const glow = step === undefined ? 0 : 0.18 + 0.5 * (step / Math.max(1, board.visited.length - 1));
        return (
          <View key={i} style={[styles.cell, { width: cell, height: cell, left: 2 + (i % board.cols) * cell, top: 2 + Math.floor(i / board.cols) * cell }]}>
            <View style={[StyleSheet.absoluteFill, styles.tile, on ? { backgroundColor: `rgba(201, 165, 90,${glow.toFixed(2)})` } : null]} />
            {art && !here ? <SpriteImage source={art} style={{ width: cell * 0.8, height: cell * 0.8, opacity: on ? 1 : 0.8 }} resizeMode="contain" /> : null}
            {here ? (
              <View style={[styles.hero, { width: cell, height: cell, borderRadius: cell / 2, borderColor: victory ? WIN : LOSS }]}>
                <SpriteImage source={heroArt} style={{ width: cell * 0.9, height: cell * 0.9, borderRadius: cell / 2 }} resizeMode="cover" />
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
};

type Props = { run: RunRecord | null; onClose: () => void };

/** One run of the history in full: the last floor, the score, what ended it and the relics it gathered. */
const RunDetail = ({ run, onClose }: Props) => {
  const { t, n } = useT();
  useEscapeKey(onClose, !!run);
  const { width, height } = useWindowDimensions();
  if (!run) return null;
  const tint = run.victory ? WIN : LOSS;
  const hero = run.hero !== undefined ? characters[run.hero] : undefined;
  const cardW = Math.min(width * 0.94, 760);
  const wide = cardW >= 560;
  const mapSize = wide ? Math.min(cardW * 0.46, height * 0.95) : cardW - 40;
  const relics = [...new Set((run.relics ?? []).filter((r): r is RelicId => r in RELICS))];
  const modeLabel = run.mode === "daily" ? t("history.mode.daily") : run.mode === "endless" ? t("history.mode.endless") : run.mode === "quick" ? t("history.mode.quick") : t("history.mode.expedition");
  // The Ancestral Grimbur rules the lair on the hardest depths: it is named apart, as on the game over card.
  const ancient = run.cause === "boss" && isAncientLair(run.depth ?? 0, run.level, run.mode === "endless");
  const cause = !run.victory && run.cause ? (ancient ? t("boss.ancient.name") : t(`over.killer.${run.cause}` as TranslationKey)) : null;

  const facts: { icon: React.ComponentProps<typeof Ionicons>["name"]; color: string; text: string }[] = [
    { icon: "trophy", color: WIN, text: run.mode === "endless" ? t("history.endlessFloor", { n: run.level }) : `${n(run.score)} ${t("history.points")}` },
    { icon: "arrow-down-circle", color: "#B08DBE", text: t("scores.floorShort", { n: run.level }) },
  ];
  if (run.time !== undefined) facts.push({ icon: "time", color: "#A397BF", text: formatTime(run.time) });
  if (run.gems !== undefined) facts.push({ icon: "diamond", color: "#7FAFC6", text: t("history.gems", { n: run.gems }) });

  return (
    <OverlayContainer>
      <PopupPanel tint={tint} width={cardW} style={[styles.card, wide && styles.cardRow]}>
        {run.board && hero ? (
          <View style={styles.left}>
            <RunBoardMap board={run.board} size={mapSize} victory={run.victory} heroArt={hero.scoreImage} />
            <Text style={styles.mapCaption} maxFontSizeMultiplier={1.1}>
              {t("history.mapCaption")}
            </Text>
          </View>
        ) : null}
        {/* On a short window the details scroll under a Close button that always stays in sight. */}
        <View style={[styles.right, { maxHeight: height - 56 }]}>
          <ScrollView style={styles.info} contentContainerStyle={styles.infoContent} showsVerticalScrollIndicator={false}>
          <View style={styles.head}>
            {hero ? <SpriteImage source={hero.scoreImage} style={[styles.portrait, { borderColor: tint }]} resizeMode="cover" /> : null}
            <View style={{ flex: 1 }}>
              <Text style={[styles.kicker, { color: tint }]} maxFontSizeMultiplier={1.1}>
                {`${modeLabel} · ${run.day}`.toLocaleUpperCase()}
              </Text>
              <Text style={[popupTitleStyle(tint), { fontSize: 18 }]} numberOfLines={2} adjustsFontSizeToFit maxFontSizeMultiplier={1.15}>
                {(run.victory ? t("history.won") : t("history.fell", { n: run.level })).toLocaleUpperCase()}
              </Text>
              {hero ? (
                <Text style={styles.heroName} maxFontSizeMultiplier={1.1}>
                  {heroText(t, run.hero!, "name")}
                  {run.depth ? `  ·  ${t(`ascension.label.${run.depth}` as TranslationKey)}` : ""}
                </Text>
              ) : null}
            </View>
          </View>
          <View style={styles.facts}>
            {facts.map(f => (
              <View key={f.icon} style={styles.fact}>
                <GameIcon name={f.icon} size={15} color={f.color} />
                <Text style={styles.factText} maxFontSizeMultiplier={1.1}>
                  {f.text}
                </Text>
              </View>
            ))}
          </View>
          {cause ? (
            <View style={styles.cause}>
              <Text style={styles.causeLabel} maxFontSizeMultiplier={1.1}>
                {t("over.killedBy").toLocaleUpperCase()}
              </Text>
              <Text style={styles.causeName} maxFontSizeMultiplier={1.1}>
                {cause}
              </Text>
            </View>
          ) : null}
          {run.event ? (
            <Text style={styles.event} maxFontSizeMultiplier={1.1}>
              {t("event.played", { name: t(`event.${run.event}.name` as TranslationKey) })}
            </Text>
          ) : null}
          {(run.encounters?.length ?? 0) > 0 || run.secrets ? (
            <>
              <Text style={styles.section} maxFontSizeMultiplier={1.1}>
                {t("history.story").toLocaleUpperCase()}
              </Text>
              <View style={styles.story}>
                {(run.encounters ?? []).map(([id, outcome, floor], k) => {
                  const known = (ENCOUNTERS as readonly string[]).includes(id);
                  if (!known) return null;
                  const eid = id as EncounterId;
                  return (
                    <View key={`${id}-${k}`} style={styles.storyRow}>
                      <SpriteImage source={ENCOUNTER_ART[eid]} style={styles.storyArt} resizeMode="contain" />
                      <Text style={styles.storyText} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.7} maxFontSizeMultiplier={1.1}>
                        <Text style={{ color: ENCOUNTER_TINT[eid], fontWeight: "900" }}>{floor > 0 ? `${t("scores.floorShort", { n: floor })} · ` : ""}</Text>
                        {t(`encounter.${eid}.title` as TranslationKey)}
                        {"  —  "}
                        {t(`history.outcome.${outcome === "win" || outcome === "lose" || outcome === "done" ? outcome : "skip"}` as TranslationKey)}
                      </Text>
                    </View>
                  );
                })}
                {run.secrets ? (
                  <View style={styles.storyRow}>
                    <GameIcon name="sparkles" size={18} color="#DCC48E" style={styles.storyIcon} />
                    <Text style={styles.storyText} maxFontSizeMultiplier={1.1}>
                      {run.secrets === 1 ? t("history.secret.one") : t("history.secret.other", { n: run.secrets })}
                    </Text>
                  </View>
                ) : null}
              </View>
            </>
          ) : null}
          <Text style={styles.section} maxFontSizeMultiplier={1.1}>
            {t("history.relics", { n: relics.length }).toLocaleUpperCase()}
          </Text>
          {relics.length > 0 ? (
            <View style={styles.relics}>
              {relics.map(r => (
                <View key={r} style={styles.relic} accessible accessibilityLabel={t(`relic.${r}.name` as TranslationKey)}>
                  <SpriteImage source={RELIC_IMAGES[r]} style={styles.relicArt} resizeMode="contain" />
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.none} maxFontSizeMultiplier={1.1}>
              {t("history.noRelics")}
            </Text>
          )}
          {!run.board ? (
            <Text style={styles.none} maxFontSizeMultiplier={1.1}>
              {t("history.oldRun")}
            </Text>
          ) : null}
          </ScrollView>
          <PopButton label={t("common.close")} variant="secondary" onPress={onClose} enterKey />
        </View>
      </PopupPanel>
    </OverlayContainer>
  );
};

export default RunDetail;

const styles = StyleSheet.create({
  card: { alignItems: "stretch", gap: 14 },
  cardRow: { flexDirection: "row", alignItems: "center" },
  left: { alignItems: "center", gap: 6 },
  right: { flex: 1, gap: 8 },
  info: { flexGrow: 0, flexShrink: 1 },
  infoContent: { gap: 8 },
  map: { borderRadius: 8, backgroundColor: "rgba(0,0,0,0.45)", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)" },
  cell: { position: "absolute", alignItems: "center", justifyContent: "center" },
  tile: { margin: 1, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.05)" },
  hero: { position: "absolute", borderWidth: 2, alignItems: "center", justifyContent: "center", overflow: "hidden", backgroundColor: "#1A140E" },
  mapCaption: { color: "#A8927D", fontSize: 11, fontWeight: "700" },
  head: { flexDirection: "row", alignItems: "center", gap: 10 },
  portrait: { width: 52, height: 52, borderRadius: 26, borderWidth: 2 },
  kicker: { fontWeight: "900", fontSize: 11, letterSpacing: 1.5 },
  heroName: { color: "#E6D6C4", fontSize: 13, fontWeight: "800" },
  facts: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  fact: { flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 4, paddingHorizontal: 9, borderRadius: 12, backgroundColor: "rgba(0,0,0,0.35)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  factText: { color: "#F3EADB", fontWeight: "900", fontSize: 13 },
  cause: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 12, backgroundColor: "rgba(207, 111, 104,0.12)", borderWidth: 1, borderColor: "rgba(207, 111, 104,0.45)" },
  causeLabel: { color: "#FFB3B3", fontSize: 11, fontWeight: "900", letterSpacing: 1.2 },
  causeName: { color: "#F3EADB", fontSize: 13, fontWeight: "900" },
  event: { color: "#C9A55A", fontSize: 12, fontWeight: "800" },
  section: { color: "#C2A88F", fontSize: 11, fontWeight: "900", letterSpacing: 1.5, marginTop: 2 },
  relics: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  relic: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(201, 165, 90,0.12)", borderWidth: 1, borderColor: "rgba(201, 165, 90,0.4)" },
  relicArt: { width: 30, height: 30 },
  none: { color: "#A8927D", fontSize: 12, fontStyle: "italic" },
  story: { gap: 4 },
  storyRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  storyArt: { width: 26, height: 26 },
  storyIcon: { width: 26, textAlign: "center" },
  storyText: { flex: 1, color: "#E6D6C4", fontSize: 12.5, fontWeight: "700" },
});
