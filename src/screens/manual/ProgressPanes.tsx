import { View } from "react-native";
import GlyphIcon from "../../ui/components/GlyphIcon";
import Text from "../../ui/components/Text";
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
      {fact("manual.worlds.intro", "#8EB7B0", icon("planet", "#8EB7B0"))}
      {fact("manual.worlds.cave", "#a1887f", image(BIOME_ART.cave.tileRevealed, "#a1887f"))}
      {fact("manual.worlds.crystal", "#7FAFC6", image(BIOME_ART.crystal.tileRevealed, "#7FAFC6"))}
      {fact("manual.worlds.magma", "#CC6E44", image(BIOME_ART.magma.tileRevealed, "#CC6E44"))}
      {fact("manual.worlds.lair", "#9A72AC", image(BIOME_ART.lair.tileRevealed, "#9A72AC"))}
      {fact("manual.worlds.boss", "#CC5249", image(IMG.boss, "#CC5249"))}
      {fact("manual.worlds.fury", "#CC6E44", icon("flame", "#CC6E44"))}
      {fact("manual.worlds.calls", "#9A72AC", image(IMG.stalker, "#9A72AC"))}
    </>
  );
};

export const ModesPane = ({ kit }: { kit: Kit }) => {
  const { t, heading, fact, icon } = kit;
  return (
    <>
      {heading(t("manual.modes.title"))}
      {fact("manual.modes.expedition", "#7E87B0", icon("map", "#7E87B0"))}
      {fact("manual.modes.daily", "#7FAFC6", icon("calendar", "#7FAFC6"))}
      {fact("manual.modes.streak", "#D89A4C", icon("flame", "#D89A4C"))}
      {fact("manual.modes.missions", "#7FAFC6", icon("flag", "#7FAFC6"))}
      {fact("manual.modes.rank", "#D9B45A", icon("medal", "#D9B45A"))}
      {fact("manual.modes.endless", "#B08DBE", icon("infinite", "#B08DBE"))}
      {fact("manual.modes.depth", "#C4534A", icon("speedometer", "#C4534A"))}
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
    { id: "power", label: t("forge.cat.power"), color: "#CC6E44" },
    { id: "economy", label: t("forge.cat.economy"), color: "#D9B45A" },
    { id: "relics", label: t("forge.cat.relics"), color: "#B08DBE" },
  ] as const;
  return (
    <>
      {heading(t("manual.forge.title"))}
      {fact("manual.forge.embers", "#D89A4C", icon("flame", "#D89A4C"))}
      {fact("manual.forge.upgrades", "#D9B45A", icon("hammer", "#D9B45A"))}
      <SubHeading text={t("manual.forge.all")} color="#D9B45A" />
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
      {fact("manual.forge.revive", "#D58A7E", icon("heart", "#D58A7E"))}
      {fact("manual.forge.arrows", "#D89A4C", image(IMG.arrows, "#D89A4C"))}
      {fact("manual.forge.daily", "#7FAFC6", icon("calendar", "#7FAFC6"))}
      {fact("manual.forge.collection", "#C98FA3", icon("shirt", "#C98FA3"))}
      {fact("manual.forge.achievements", "#8EAE7C", icon("ribbon", "#8EAE7C"))}
    </>
  );
};

export const ScoringPane = ({ kit }: { kit: Kit }) => {
  const { t, heading, fact, icon } = kit;
  return (
    <>
      {heading(t("manual.scoring.title"))}
      {fact("manual.scoring.points", "#8EAE7C", icon("star", "#8EAE7C"))}
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
      {fact("manual.scoring.stars", "#D9B45A", icon("star", "#D9B45A"))}
      {fact("manual.scoring.board", "#D9B45A", icon("podium", "#D9B45A"))}
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
            <GlyphIcon name="lantern" size={22} />
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
