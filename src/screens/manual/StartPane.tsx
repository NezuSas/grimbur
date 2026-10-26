import React from "react";
import { ImageSourcePropType, View, TouchableOpacity } from "react-native";
import Text from "../../ui/components/Text";
import { Ionicons } from "@expo/vector-icons";
import characters from "../../data/characters";
import { LESSON_IDS } from "../../core/tutorial/lessons";
import SpriteImage from "../../ui/components/SpriteImage";
import { asKey } from "./kit";
import type { Kit } from "./kit";
import { manualStyles as styles, START_COLOR } from "./styles";

const QUICK_STEPS: { image?: ImageSourcePropType; icon?: React.ComponentProps<typeof Ionicons>["name"]; tint?: string }[] = [
  { image: require("../../assets/sprites/tiles/Tile_Hidden.png") },
  { icon: "volume-high", tint: "#ffcc80" },
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

      <TouchableOpacity
        style={styles.cta}
        onPress={() => navigation.navigate("TutorialScreen", { characterIndex: 0, replay: true })}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={t("manual.replayTutorial")}
      >
        <Ionicons name="school" size={22} color="#1a1200" />
        <Text style={styles.ctaText} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.3}>
          {t("manual.replayTutorial").toLocaleUpperCase()}
        </Text>
        <Ionicons name="chevron-forward" size={20} color="#1a1200" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.storyButton} onPress={() => navigation.navigate("StoryScreen", { replay: true })} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel={t("manual.replayStory")}>
        <Ionicons name="book" size={20} color={START_COLOR} />
        <Text style={styles.storyButtonText} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.3}>
          {t("manual.replayStory").toLocaleUpperCase()}
        </Text>
      </TouchableOpacity>

      <View>
        <Text style={styles.lessonsTitle} maxFontSizeMultiplier={1.2}>
          {t("manual.lessons").toLocaleUpperCase()}
        </Text>
        <Text style={styles.lessonsHint} maxFontSizeMultiplier={1.2}>
          {t("manual.lessons.hint")}
        </Text>
        <View style={styles.lessons}>
          {LESSON_IDS.map(id => (
            <TouchableOpacity
              key={id}
              style={[styles.lesson, wide && styles.lessonWide]}
              onPress={() => navigation.navigate("LessonScreen", { lesson: id })}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={`${t(asKey(`lesson.${id}.title`))}. ${t(asKey(`lesson.${id}.desc`))}`}
            >
              <View style={styles.lessonPlay}>
                <Ionicons name="play" size={18} color="#1a1200" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.lessonName} numberOfLines={1} maxFontSizeMultiplier={1.2}>
                  {t(asKey(`lesson.${id}.title`))}
                </Text>
                <Text style={styles.lessonDesc} numberOfLines={2} maxFontSizeMultiplier={1.2}>
                  {t(asKey(`lesson.${id}.desc`))}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <SpriteImage source={characters[1].winImage} style={styles.footerImage} resizeMode="contain" accessibilityIgnoresInvertColors />
    </>
  );
};
