import { View } from "react-native";
import GlyphIcon from "../../ui/components/GlyphIcon";
import Text from "../../ui/components/Text";
import { Ionicons } from "@expo/vector-icons";
import characters from "../../data/characters";
import SpriteImage from "../../ui/components/SpriteImage";
import RelicIcon from "../../ui/components/RelicIcon";
import JoystickBase from "../../ui/components/JoystickBase";
import { ABILITY_ART } from "../../ui/toolArt";
import { Art, ClueExample } from "../../ui/components/manual/ManualParts";
import { CLUE_ART } from "../../ui/components/GridCell";
import { IMG } from "./kit";
import type { Kit } from "./kit";
import { manualStyles as styles } from "./styles";

export const MissionPane = ({ kit }: { kit: Kit }) => {
  const { t, heading, fact, icon, image } = kit;
  return (
    <>
      {heading(t("manual.mission.title"))}
      {fact("manual.mission.goal", "#B5524A", image(IMG.gem, "#7FAFC6"))}
      {fact("manual.mission.currency", "#C48B4E", icon("flame", "#C48B4E"))}
      {fact("manual.mission.survival", "#B0524A", icon("skull", "#B0524A"))}
      {fact("manual.mission.grimbur", "#B5524A", image(IMG.boss, "#9A72AC"))}
      {fact("manual.mission.relics", "#CDAA4A", <Art tint="#CDAA4A"><RelicIcon id="lantern" size={44} /></Art>)}
      {fact("manual.mission.heroes", "#C98FA3", image(characters[0].scoreImage, "#C98FA3"))}
    </>
  );
};

export const ControlsPane = ({ kit }: { kit: Kit }) => {
  const { t, heading, fact, image, tileWith } = kit;
  return (
    <>
      {heading(t("manual.controls.title"))}
      {fact(
        "manual.controls.move",
        "#C9A55A",
        <Art tint="#C9A55A">
          <JoystickBase skin="console" radius={25} thumb={{ x: 9, y: -2 }} active={null} />
        </Art>,
      )}
      {fact(
        "manual.controls.attack",
        "#B86A48",
        <Art tint="#B86A48">
          <View style={styles.attackDot}>
            <GlyphIcon name="bolt" size={24} />
          </View>
        </Art>,
      )}
      {fact("manual.controls.travel", "#7FAFC6", tileWith(IMG.revealed, "footsteps", "#fff"))}
      {fact("manual.controls.flag", "#B0524A", tileWith(IMG.hidden, "flag", "#B5524A"))}
      {fact("manual.controls.ability", "#8EAE7C", image(ABILITY_ART.scout, "#8EAE7C"))}
    </>
  );
};

export const ExplorePane = ({ kit }: { kit: Kit }) => {
  const { t, heading, fact, icon, image } = kit;
  return (
    <>
      {heading(t("manual.explore.title"))}
      <View style={styles.visual}>
        <View style={styles.visualComparison}>
          <View style={styles.visualItem}>
            <SpriteImage source={IMG.hidden} style={styles.visualImage} resizeMode="contain" accessibilityIgnoresInvertColors />
            <Text style={styles.visualText}>{t("manual.explore.hidden").toLocaleUpperCase()}</Text>
          </View>
          <Ionicons name="arrow-forward" size={26} color="#888" style={{ marginHorizontal: 22 }} />
          <View style={styles.visualItem}>
            <SpriteImage source={IMG.revealed} style={styles.visualImage} resizeMode="contain" accessibilityIgnoresInvertColors />
            <Text style={styles.visualText}>{t("manual.explore.revealed").toLocaleUpperCase()}</Text>
          </View>
        </View>
        <Text style={styles.visualDetail} maxFontSizeMultiplier={1.3}>
          {t("manual.explore.tiles")}
        </Text>
      </View>
      {fact("manual.explore.gems", "#7FAFC6", image(IMG.gem, "#7FAFC6"))}
      {fact("manual.explore.clue", "#D49242", image(CLUE_ART.roar, "#D49242"))}
      <ClueExample hidden={IMG.hidden} revealed={IMG.revealed} caption={t("manual.explore.clue.example")} />
      {fact("manual.explore.pace", "#8EAE7C", icon("footsteps", "#8EAE7C"))}
    </>
  );
};

export const HazardsPane = ({ kit }: { kit: Kit }) => {
  const { t, heading, fact, image } = kit;
  return (
    <>
      {heading(t("manual.hazards.title"))}
      <View style={[styles.visual, { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 40 }]}>
        <View style={styles.visualItem}>
          <SpriteImage source={IMG.guardian} style={styles.visualImage} resizeMode="contain" accessibilityIgnoresInvertColors />
          <Text style={styles.visualText}>{t("manual.hazards.guardian").toLocaleUpperCase()}</Text>
          <SpriteImage source={CLUE_ART.roar} style={styles.clueToken} resizeMode="contain" accessibilityIgnoresInvertColors />
        </View>
        <View style={styles.visualItem}>
          <SpriteImage source={IMG.vortex} style={styles.visualImage} resizeMode="contain" accessibilityIgnoresInvertColors />
          <Text style={styles.visualText}>{t("manual.hazards.vortex").toLocaleUpperCase()}</Text>
          <SpriteImage source={CLUE_ART.vortex} style={styles.clueToken} resizeMode="contain" accessibilityIgnoresInvertColors />
        </View>
      </View>
      {fact("manual.hazards.guardianInfo", "#B0524A", image(IMG.guardian, "#B0524A"))}
      {fact("manual.hazards.stalker", "#9A72AC", image(IMG.stalker, "#9A72AC"))}
      {fact("manual.hazards.sleeper", "#90a4ae", image(IMG.sleeper, "#90a4ae"))}
      {fact("manual.hazards.mimic", "#7FAFC6", image(IMG.mimic, "#7FAFC6"))}
      {fact("manual.hazards.thief", "#C9A55A", image(IMG.thief, "#C9A55A"))}
      {fact("manual.hazards.lieutenant", "#B86A48", image(IMG.lieutenant, "#B86A48"))}
      {fact("manual.hazards.chest", "#D6AA48", image(IMG.chest, "#D6AA48"))}
      {fact("manual.hazards.secret", "#DCC48E", image(IMG.secret, "#DCC48E"))}
      {fact("manual.hazards.merchant", "#C47268", image(IMG.merchant, "#C47268"))}
      {fact("manual.hazards.vortexInfo", "#B08DBE", image(IMG.vortex, "#B08DBE"))}
      <Text style={styles.note} maxFontSizeMultiplier={1.3}>
        {t("manual.hazards.note")}
      </Text>
    </>
  );
};

export const CombatPane = ({ kit }: { kit: Kit }) => {
  const { t, heading, fact, icon, image } = kit;
  return (
    <>
      {heading(t("manual.combat.title"))}
      {fact("manual.combat.strike", "#B5524A", image(IMG.arrows, "#B5524A"))}
      {fact("manual.combat.turn", "#D49242", icon("hourglass", "#D49242"))}
      {fact("manual.combat.ammo", "#B0524A", image(IMG.arrows, "#B0524A"))}
      {fact("manual.combat.combo", "#B86A48", icon("trending-up", "#B86A48"))}
    </>
  );
};

export const PowerupsPane = ({ kit }: { kit: Kit }) => {
  const { t, heading, fact, image } = kit;
  return (
    <>
      {heading(t("manual.powerups.title"))}
      {fact("manual.powerups.gem", "#7FAFC6", image(IMG.gem, "#7FAFC6"))}
      {fact("manual.powerups.shield", "#7FAFC6", image(IMG.shield, "#7FAFC6"))}
      {fact("manual.powerups.ammo", "#C99A5C", image(IMG.arrows, "#C99A5C"))}
      {fact("manual.powerups.traps", "#C99A5C", image(IMG.trap, "#C99A5C"))}
    </>
  );
};
