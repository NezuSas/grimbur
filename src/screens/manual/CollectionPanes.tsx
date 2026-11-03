import { View } from "react-native";
import Text from "../../ui/components/Text";
import { Ionicons } from "@expo/vector-icons";
import characters from "../../data/characters";
import { abilityCooldown } from "../../core/engine/shop";
import type { ShopItem } from "../../core/engine/shop";
import { HEROES } from "../../core/engine/heroes";
import { FAMILY_COLOR } from "../../ui/familyLook";
import { RELICS, NORMAL_RELICS, CURSED_RELICS, ALL_RELICS, RELIC_FAMILIES, RELIC_FAMILY, FAMILY_SET } from "../../core/engine/relics";
import type { RelicId } from "../../core/engine/relics";
import { heroText, omenText, relicText, unlockText } from "../../i18n/keys";
import type { TranslationKey } from "../../i18n/en";
import SpriteImage from "../../ui/components/SpriteImage";
import RelicIcon from "../../ui/components/RelicIcon";
import { ABILITY_ART, ALTAR_ART, SHOP_ART, TOOL_ART } from "../../ui/toolArt";
import { Art, FactCard, SubHeading } from "../../ui/components/manual/ManualParts";
import { asKey } from "./kit";
import type { Kit } from "./kit";
import { manualStyles as styles } from "./styles";

export const HeroesPane = ({ kit }: { kit: Kit }) => {
  const { t, heading, fact, icon } = kit;
  return (
    <>
      {heading(t("manual.heroes.title"))}
      {fact("manual.heroes.intro", "#C98FA3", icon("people", "#C98FA3"))}
      {HEROES.map((hero, i) => {
        const ability = hero.perks.ability;
        const lock = unlockText(t, i);
        return (
          <View key={i} style={styles.hero}>
            <View style={styles.heroTop}>
              <SpriteImage source={characters[i].scoreImage} style={styles.heroPortrait} resizeMode="cover" accessibilityIgnoresInvertColors />
              <View style={{ flex: 1 }}>
                <Text style={styles.heroName} maxFontSizeMultiplier={1.3}>
                  {heroText(t, i, "name")}
                </Text>
                <Text style={styles.heroTitle} maxFontSizeMultiplier={1.3}>
                  {heroText(t, i, "title")}
                </Text>
              </View>
              <View style={[styles.lockChip, !lock && styles.lockFree]}>
                <Ionicons name={lock ? "lock-closed" : "checkmark-circle"} size={14} color={lock ? "#E2BE8C" : "#A5BC9E"} />
                <Text style={[styles.lockText, !lock && { color: "#A5BC9E" }]} numberOfLines={2} maxFontSizeMultiplier={1.2}>
                  {lock || t("skin.tier.free")}
                </Text>
              </View>
            </View>
            <Text style={styles.heroStory} maxFontSizeMultiplier={1.3}>
              {t(`story.bio.${i}` as TranslationKey)}
            </Text>
            <View style={styles.heroLine}>
              <View style={styles.heroTag}>
                <Text style={styles.heroTagText}>{t("manual.heroes.perk").toLocaleUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroLineTitle} maxFontSizeMultiplier={1.3}>
                  {heroText(t, i, "perk")}
                </Text>
                <Text style={styles.heroLineBody} maxFontSizeMultiplier={1.3}>
                  {heroText(t, i, "desc")}
                </Text>
              </View>
            </View>
            {ability ? (
              <View style={styles.heroLine}>
                <SpriteImage source={ABILITY_ART[ability]} style={styles.abilityIcon} resizeMode="contain" accessibilityIgnoresInvertColors />
                <View style={{ flex: 1 }}>
                  <Text style={styles.heroLineTitle} maxFontSizeMultiplier={1.3}>
                    {t(asKey(`ability.${ability}.name`))} · {t("manual.heroes.recharge", { n: abilityCooldown(ability) })}
                  </Text>
                  <Text style={styles.heroLineBody} maxFontSizeMultiplier={1.3}>
                    {t(asKey(`ability.${ability}.desc`))}
                  </Text>
                </View>
              </View>
            ) : null}
          </View>
        );
      })}
    </>
  );
};

export const RelicsPane = ({ kit }: { kit: Kit }) => {
  const { t, wide, heading, fact, icon } = kit;
  const relicCard = (id: RelicId) => {
    const cursed = RELICS[id].cursed;
    return (
      <View key={id} style={[styles.relic, wide && styles.relicWide, cursed && styles.relicCursed]}>
        <Art size={48} tint={cursed ? "#C4534A" : "#B08DBE"}>
          <RelicIcon id={id} size={38} />
        </Art>
        <View style={{ flex: 1 }}>
          <Text style={styles.relicName} maxFontSizeMultiplier={1.3}>
            {relicText(t, id, "name")}
            {cursed ? `  ·  ${t("relic.cursed").toUpperCase()}` : ""}
          </Text>
          <Text style={styles.relicDesc} maxFontSizeMultiplier={1.3}>
            {relicText(t, id, "desc")}
          </Text>
        </View>
      </View>
    );
  };
  const omenIcons: Record<string, { icon: keyof typeof Ionicons.glyphMap; tint: string }> = {
    bounty: { icon: "cash", tint: "#D9B45A" },
    calm: { icon: "leaf", tint: "#8EAE7C" },
    arsenal: { icon: "flash", tint: "#CC6E44" },
    elite: { icon: "skull", tint: "#CC5249" },
    dark: { icon: "moon", tint: "#7E87B0" },
    shortcut: { icon: "arrow-down-circle", tint: "#A1887F" },
  };
  return (
    <>
      {heading(t("manual.relics.title"))}
      {fact("manual.relics.intro", "#B08DBE", <Art tint="#B08DBE"><RelicIcon id="quiver" size={44} /></Art>)}
      <SubHeading text={t("manual.relics.all")} color="#B08DBE" />
      <View style={styles.relicGrid}>{NORMAL_RELICS.map(relicCard)}</View>
      <SubHeading text={t("manual.relics.families")} color="#D9B45A" />
      {RELIC_FAMILIES.map(f => (
        <FactCard
          key={f}
          label={`${t(`family.${f}.name` as TranslationKey)} · ${FAMILY_SET}`}
          detail={`${t(`family.${f}.bonus` as TranslationKey)}. ${t("manual.relics.familyHow")}`}
          color={FAMILY_COLOR[f]}
          art={<Art tint={FAMILY_COLOR[f]}><RelicIcon id={ALL_RELICS.find(r => RELIC_FAMILY[r] === f)!} size={44} /></Art>}
        />
      ))}
      {fact("manual.tools.cursed", "#C4534A", icon("skull", "#C4534A"))}
      <View style={styles.relicGrid}>{CURSED_RELICS.map(relicCard)}</View>
      <SubHeading text={t("manual.relics.omens.label")} color="#D9B45A" />
      {fact("manual.relics.omens", "#D9B45A", icon("partly-sunny", "#D9B45A"))}
      {(["bounty", "calm", "arsenal", "elite", "dark", "shortcut"] as const).map(id => (
        <FactCard key={id} label={omenText(t, id, "name")} detail={omenText(t, id, "rule")} color={omenIcons[id].tint} art={icon(omenIcons[id].icon, omenIcons[id].tint)} />
      ))}
    </>
  );
};

export const ToolsPane = ({ kit }: { kit: Kit }) => {
  const { t, wide, heading, fact, icon, image } = kit;
  const shopItems: ShopItem[] = ["arrows", "shield", "detector", "bomb"];
  return (
    <>
      {heading(t("manual.tools.title"))}
      {fact("manual.tools.shop", "#7FAFC6", icon("cart", "#7FAFC6"))}
      <View style={styles.relicGrid}>
        {shopItems.map(item => (
          <View key={item} style={[styles.relic, wide && styles.relicWide]}>
            <Art size={48} tint="#7FAFC6" image={SHOP_ART[item]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.relicName} maxFontSizeMultiplier={1.3}>
                {t(asKey(`shop.${item}.name`))}
              </Text>
              <Text style={styles.relicDesc} maxFontSizeMultiplier={1.3}>
                {t(asKey(`shop.${item}.desc`))}
              </Text>
            </View>
          </View>
        ))}
      </View>
      {fact("manual.tools.doors", "#D9B45A", icon("git-branch", "#D9B45A"))}
      {fact("manual.tools.altar", "#B08DBE", image(ALTAR_ART, "#B08DBE"))}
      {fact("manual.tools.ability", "#8EAE7C", image(ABILITY_ART.volley, "#8EAE7C"))}
      {fact("manual.tools.items", "#DCA45A", image(TOOL_ART.detector, "#DCA45A"))}
      {fact("manual.tools.undo", "#9A72AC", image(TOOL_ART.undo, "#9A72AC"))}
    </>
  );
};
