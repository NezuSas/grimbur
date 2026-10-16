import { View } from "react-native";
import Text from "../../ui/components/Text";
import { Ionicons } from "@expo/vector-icons";
import characters from "../../data/characters";
import { abilityCooldown } from "../../core/engine/shop";
import type { ShopItem } from "../../core/engine/shop";
import { HEROES } from "../../core/engine/heroes";
import { RELICS, NORMAL_RELICS, CURSED_RELICS } from "../../core/engine/relics";
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
      {fact("manual.heroes.intro", "#f48fb1", icon("people", "#f48fb1"))}
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
                <Ionicons name={lock ? "lock-closed" : "checkmark-circle"} size={14} color={lock ? "#ffcc80" : "#a5d6a7"} />
                <Text style={[styles.lockText, !lock && { color: "#a5d6a7" }]} numberOfLines={2} maxFontSizeMultiplier={1.2}>
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
        <Art size={48} tint={cursed ? "#ef5350" : "#ce93d8"}>
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
    bounty: { icon: "cash", tint: "#FFD54F" },
    calm: { icon: "leaf", tint: "#81C784" },
    arsenal: { icon: "flash", tint: "#FF7043" },
  };
  return (
    <>
      {heading(t("manual.relics.title"))}
      {fact("manual.relics.intro", "#ce93d8", <Art tint="#ce93d8"><RelicIcon id="quiver" size={44} /></Art>)}
      <SubHeading text={t("manual.relics.all")} color="#ce93d8" />
      <View style={styles.relicGrid}>{NORMAL_RELICS.map(relicCard)}</View>
      {fact("manual.tools.cursed", "#ef5350", icon("skull", "#ef5350"))}
      <View style={styles.relicGrid}>{CURSED_RELICS.map(relicCard)}</View>
      <SubHeading text={t("manual.relics.omens.label")} color="#ffd54f" />
      {fact("manual.relics.omens", "#ffd54f", icon("partly-sunny", "#ffd54f"))}
      {(["bounty", "calm", "arsenal"] as const).map(id => (
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
      {fact("manual.tools.shop", "#4fc3f7", icon("cart", "#4fc3f7"))}
      <View style={styles.relicGrid}>
        {shopItems.map(item => (
          <View key={item} style={[styles.relic, wide && styles.relicWide]}>
            <Art size={48} tint="#4fc3f7" image={SHOP_ART[item]} />
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
      {fact("manual.tools.doors", "#ffd54f", icon("git-branch", "#ffd54f"))}
      {fact("manual.tools.altar", "#ce93d8", image(ALTAR_ART, "#ce93d8"))}
      {fact("manual.tools.ability", "#81c784", image(ABILITY_ART.volley, "#81c784"))}
      {fact("manual.tools.items", "#ffb74d", image(TOOL_ART.detector, "#ffb74d"))}
      {fact("manual.tools.undo", "#ba68c8", image(TOOL_ART.undo, "#ba68c8"))}
    </>
  );
};
