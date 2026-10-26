import { View } from "react-native";
import Text from "../../ui/components/Text";
import { Ionicons } from "@expo/vector-icons";
import { GAME_CONFIG } from "../../config/gameConfig";
import { MAX_ASCENSION } from "../../core/engine/ascension";
import { coinValue, levelClearBonus } from "../../core/engine/scoring";
import { UPGRADES } from "../../core/stats/forge";
import { forgeText } from "../../i18n/keys";
import RelicIcon from "../../ui/components/RelicIcon";
import { BIOME_ART } from "../../ui/biomeArt";
import { Art, ScoreTable, SubHeading } from "../../ui/components/manual/ManualParts";
import { asKey, IMG, S } from "./kit";
import type { Kit } from "./kit";
import { manualStyles as styles } from "./styles";

const TIPS = ["vortex", "shield", "ammo", "route", "grimbur", "flags", "known", "turn", "shop", "forge"];

export const WorldsPane = ({ kit }: { kit: Kit }) => {
  const { t, heading, fact, icon, image } = kit;
  return (
    <>
      {heading(t("manual.worlds.title"))}
      {fact("manual.worlds.intro", "#80cbc4", icon("planet", "#80cbc4"))}
      {fact("manual.worlds.cave", "#a1887f", image(BIOME_ART.cave.tileRevealed, "#a1887f"))}
      {fact("manual.worlds.crystal", "#4fc3f7", image(BIOME_ART.crystal.tileRevealed, "#4fc3f7"))}
      {fact("manual.worlds.magma", "#ff7043", image(BIOME_ART.magma.tileRevealed, "#ff7043"))}
      {fact("manual.worlds.lair", "#ba68c8", image(BIOME_ART.lair.tileRevealed, "#ba68c8"))}
      {fact("manual.worlds.boss", "#ff5252", image(IMG.boss, "#ff5252"))}
      {fact("manual.worlds.fury", "#ff7043", icon("flame", "#ff7043"))}
      {fact("manual.worlds.calls", "#ba68c8", image(IMG.stalker, "#ba68c8"))}
    </>
  );
};

export const ModesPane = ({ kit }: { kit: Kit }) => {
  const { t, heading, fact, icon } = kit;
  return (
    <>
      {heading(t("manual.modes.title"))}
      {fact("manual.modes.expedition", "#7986cb", icon("map", "#7986cb"))}
      {fact("manual.modes.daily", "#4fc3f7", icon("calendar", "#4fc3f7"))}
      {fact("manual.modes.streak", "#ffab40", icon("flame", "#ffab40"))}
      {fact("manual.modes.missions", "#4fc3f7", icon("flag", "#4fc3f7"))}
      {fact("manual.modes.rank", "#FFD54F", icon("medal", "#FFD54F"))}
      {fact("manual.modes.endless", "#ce93d8", icon("infinite", "#ce93d8"))}
      {fact("manual.modes.depth", "#ef5350", icon("speedometer", "#ef5350"))}
      <View style={{ gap: 8 }}>
        {Array.from({ length: MAX_ASCENSION }, (_, k) => k + 1).map(n => (
          <View key={n} style={styles.depthRow}>
            <View style={styles.depthNumber}>
              <Text style={styles.depthNumberText}>{n}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroLineTitle} maxFontSizeMultiplier={1.3}>
                {t(asKey(`ascension.label.${n}`))}
              </Text>
              <Text style={styles.heroLineBody} maxFontSizeMultiplier={1.3}>
                {t(asKey(`ascension.${n}`))}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </>
  );
};

export const ForgePane = ({ kit }: { kit: Kit }) => {
  const { t, wide, heading, fact, icon, image } = kit;
  const upgradeGroups = [
    { id: "power", label: t("forge.cat.power"), color: "#ff7043" },
    { id: "economy", label: t("forge.cat.economy"), color: "#ffd54f" },
    { id: "relics", label: t("forge.cat.relics"), color: "#ce93d8" },
  ] as const;
  return (
    <>
      {heading(t("manual.forge.title"))}
      {fact("manual.forge.embers", "#ffab40", icon("flame", "#ffab40"))}
      {fact("manual.forge.upgrades", "#ffd54f", icon("hammer", "#ffd54f"))}
      <SubHeading text={t("manual.forge.all")} color="#ffd54f" />
      {upgradeGroups.map(group => (
        <View key={group.id} style={{ gap: 8 }}>
          <Text style={[styles.groupTitle, { color: group.color }]} maxFontSizeMultiplier={1.2}>
            {group.label.toLocaleUpperCase()}
          </Text>
          <View style={styles.relicGrid}>
            {UPGRADES.filter(u => u.category === group.id).map(u => (
              <View key={u.id} style={[styles.relic, wide && styles.relicWide]}>
                <Art size={44} tint={group.color}>
                  {u.relic ? <RelicIcon id={u.relic} size={34} /> : <Text style={styles.upgradeEmoji}>{u.icon}</Text>}
                </Art>
                <View style={{ flex: 1 }}>
                  <Text style={styles.relicName} maxFontSizeMultiplier={1.3}>
                    {forgeText(t, u.id, "name")}
                  </Text>
                  <Text style={styles.relicDesc} maxFontSizeMultiplier={1.3}>
                    {forgeText(t, u.id, "desc")}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      ))}
      {fact("manual.forge.revive", "#ff8a80", icon("heart", "#ff8a80"))}
      {fact("manual.forge.arrows", "#ffab40", image(IMG.arrows, "#ffab40"))}
      {fact("manual.forge.daily", "#4fc3f7", icon("calendar", "#4fc3f7"))}
      {fact("manual.forge.collection", "#f48fb1", icon("shirt", "#f48fb1"))}
      {fact("manual.forge.achievements", "#81c784", icon("ribbon", "#81c784"))}
    </>
  );
};

export const ScoringPane = ({ kit }: { kit: Kit }) => {
  const { t, heading, fact, icon } = kit;
  return (
    <>
      {heading(t("manual.scoring.title"))}
      {fact("manual.scoring.points", "#81c784", icon("star", "#81c784"))}
      <ScoreTable
        rows={[
          { label: t("manual.score.tile"), value: `+${S.newTile}`, good: true },
          { label: t("manual.score.gem"), value: `+${coinValue(1)}`, good: true, note: t("manual.score.gemValue", { top: coinValue(GAME_CONFIG.expedition.floors) }) },
          { label: t("manual.score.kill"), value: `+${S.killEnemy}`, good: true, note: t("manual.score.killValue", { max: S.killEnemy * GAME_CONFIG.multipliers.maxCombo }) },
          { label: t("manual.score.pickup"), value: `+${S.pickup}`, good: true },
          { label: t("manual.score.clear"), value: `+${levelClearBonus(1)}`, good: true, note: t("manual.score.clearValue", { top: levelClearBonus(GAME_CONFIG.expedition.floors - 1) }) },
          { label: t("manual.score.bossHit"), value: `+${GAME_CONFIG.boss.hitScore}`, good: true },
          { label: t("manual.score.bossKill"), value: `+${GAME_CONFIG.boss.killScore}`, good: true },
          { label: t("manual.score.step"), value: `${S.stepCost}`, good: false },
          { label: t("manual.score.miss"), value: `${S.missPenalty}`, good: false },
          { label: t("manual.score.trap"), value: `${S.trapPenalty}`, good: false },
        ]}
      />
      {fact("manual.scoring.board", "#ffd54f", icon("podium", "#ffd54f"))}
      {fact("manual.scoring.pause", "#90a4ae", icon("pause-circle", "#90a4ae"))}
    </>
  );
};

export const TipsPane = ({ kit }: { kit: Kit }) => {
  const { t, heading } = kit;
  return (
    <>
      {heading(t("manual.tips.title"))}
      {TIPS.map(tip => (
        <View key={tip} style={styles.tip}>
          <View style={styles.tipIcon}>
            <Ionicons name="bulb" size={18} color="#4db6ac" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.tipTitle} maxFontSizeMultiplier={1.3}>
              {t(asKey(`manual.tips.${tip}.title`))}
            </Text>
            <Text style={styles.factDetail} maxFontSizeMultiplier={1.3}>
              {t(asKey(`manual.tips.${tip}.body`))}
            </Text>
          </View>
        </View>
      ))}
    </>
  );
};
