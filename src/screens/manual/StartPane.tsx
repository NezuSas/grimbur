import React from "react";
import GlyphIcon from "../../ui/components/GlyphIcon";
import { ImageSourcePropType, View, TouchableOpacity } from "react-native";
import Text from "../../ui/components/Text";
import { Ionicons } from "@expo/vector-icons";
import characters from "../../data/characters";
import SpriteImage from "../../ui/components/SpriteImage";
import { asKey } from "./kit";
import type { Kit } from "./kit";
import { manualStyles as styles } from "./styles";

const QUICK_STEPS: { image?: ImageSourcePropType; icon?: React.ComponentProps<typeof Ionicons>["name"]; tint?: string }[] = [
  { image: require("../../assets/sprites/tiles/Tile_Hidden.png") },
  { image: require("../../assets/sprites/ui/Clue_Guardian.png") },
  { image: require("../../assets/sprites/items/Icon_Gem.png") },
  { image: require("../../assets/sprites/enemies/Grimbur_Boss.png") },
];

export const StartPane = ({ kit }: { kit: Kit }) => {
  const { t, wide, navigation, heading } = kit;
  return (
    <>
      {heading(t("manual.quick.title"))}
      <View style={styles.steps}>
        {QUICK_STEPS.map((step, i) => (
          <View key={i} style={[styles.step, !wide && styles.stepNarrow]} accessible accessibilityLabel={`${i + 1}. ${t(asKey(`manual.quick.${i + 1}`))}`}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>{i + 1}</Text>
            </View>
            <View style={styles.stepArt}>
              {step.image ? (
                <SpriteImage source={step.image} style={{ width: 58, height: 58 }} resizeMode="contain" accessibilityIgnoresInvertColors />
              ) : (
                <View style={[styles.stepIcon, { backgroundColor: step.tint }]}>
                  <Ionicons name={step.icon!} size={24} color="#bf360c" />
                </View>
              )}
            </View>
            <Text style={styles.stepText} maxFontSizeMultiplier={1.2}>
              {t(asKey(`manual.quick.${i + 1}`))}
            </Text>
          </View>
        ))}
      </View>


      <TouchableOpacity style={styles.storyButton} onPress={() => navigation.navigate("StoryScreen", { replay: true })} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel={t("manual.replayStory")}>
        <GlyphIcon name="book" size={24} />
        <Text style={styles.storyButtonText} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.3}>
          {t("manual.replayStory").toLocaleUpperCase()}
        </Text>
      </TouchableOpacity>

      <SpriteImage source={characters[1].winImage} style={styles.footerImage} resizeMode="contain" accessibilityIgnoresInvertColors />
    </>
  );
};
