import { View } from "react-native";
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
      {fact("manual.mission.goal", "#ff5252", image(IMG.gem, "#4fc3f7"))}
      {fact("manual.mission.currency", "#ffab40", icon("flame", "#ffab40"))}
      {fact("manual.mission.survival", "#ef5350", icon("skull", "#ef5350"))}
      {fact("manual.mission.grimbur", "#ff5252", image(IMG.boss, "#ba68c8"))}
      {fact("manual.mission.relics", "#ffd700", <Art tint="#ffd700"><RelicIcon id="lantern" size={44} /></Art>)}
      {fact("manual.mission.heroes", "#f48fb1", image(characters[0].scoreImage, "#f48fb1"))}
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
        "#ffd54f",
        <Art tint="#ffd54f">
          <JoystickBase skin="console" radius={25} thumb={{ x: 9, y: -2 }} active={null} />
        </Art>,
      )}
      {fact(
        "manual.controls.attack",
        "#ff7043",
        <Art tint="#ff7043">
          <View style={styles.attackDot}>
            <Ionicons name="flash" size={22} color="#fff" />
          </View>
        </Art>,
      )}
      {fact("manual.controls.travel", "#4fc3f7", tileWith(IMG.revealed, "footsteps", "#fff"))}
      {fact("manual.controls.flag", "#ef5350", tileWith(IMG.hidden, "flag", "#ff5252"))}
      {fact("manual.controls.ability", "#81c784", image(ABILITY_ART.scout, "#81c784"))}
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
      {fact("manual.explore.gems", "#4fc3f7", image(IMG.gem, "#4fc3f7"))}
      {fact("manual.explore.clue", "#ffa726", image(CLUE_ART.roar, "#ffa726"))}
      <ClueExample hidden={IMG.hidden} revealed={IMG.revealed} caption={t("manual.explore.clue.example")} />
      {fact("manual.explore.pace", "#81c784", icon("footsteps", "#81c784"))}
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
      {fact("manual.hazards.guardianInfo", "#ef5350", image(IMG.guardian, "#ef5350"))}
      {fact("manual.hazards.stalker", "#ba68c8", image(IMG.stalker, "#ba68c8"))}
      {fact("manual.hazards.sleeper", "#90a4ae", image(IMG.sleeper, "#90a4ae"))}
      {fact("manual.hazards.vortexInfo", "#ce93d8", image(IMG.vortex, "#ce93d8"))}
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
      {fact("manual.combat.strike", "#ff5252", image(IMG.arrows, "#ff5252"))}
      {fact("manual.combat.turn", "#ffa726", icon("hourglass", "#ffa726"))}
      {fact("manual.combat.ammo", "#ef5350", image(IMG.arrows, "#ef5350"))}
      {fact("manual.combat.combo", "#ff7043", icon("trending-up", "#ff7043"))}
    </>
  );
};

export const PowerupsPane = ({ kit }: { kit: Kit }) => {
  const { t, heading, fact, image } = kit;
  return (
    <>
      {heading(t("manual.powerups.title"))}
      {fact("manual.powerups.gem", "#4fc3f7", image(IMG.gem, "#4fc3f7"))}
      {fact("manual.powerups.shield", "#4fc3f7", image(IMG.shield, "#4fc3f7"))}
      {fact("manual.powerups.ammo", "#ffb74d", image(IMG.arrows, "#ffb74d"))}
      {fact("manual.powerups.traps", "#ffb74d", image(IMG.trap, "#ffb74d"))}
    </>
  );
};
