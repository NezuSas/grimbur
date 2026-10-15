import React, { useEffect, useRef, useState } from "react";
import { Animated, ImageBackground, ImageSourcePropType, StyleSheet, TouchableOpacity, View, useWindowDimensions } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Text from "../ui/components/Text";
import SpriteImage from "../ui/components/SpriteImage";
import characters from "../data/characters";
import { RootStackParamList } from "../navigation/types";
import { MIN_TOUCH } from "../ui/layout/useGameLayout";
import { useT } from "../i18n/useT";
import type { TranslationKey } from "../i18n/en";
import { useSettingsStore } from "../state/settings/store";
import { BIOME_ART } from "../ui/biomeArt";

type Props = NativeStackScreenProps<RootStackParamList, "StoryScreen">;

type Scene = { background: ImageSourcePropType; art: "cave" | "boss" | "heroes" };
const SCENES: Scene[] = [
  { background: BIOME_ART.cave.background, art: "cave" },
  { background: BIOME_ART.lair.background, art: "boss" },
  { background: BIOME_ART.crystal.background, art: "heroes" },
];

/**
 * The opening story: three short scenes before the first descent (also reachable again from the manual). Tapping anywhere or
 * the button moves on; Skip leaves at once. What it shows is the world the player will descend into, not rules.
 */
const StoryScreen: React.FC<Props> = ({ navigation, route }) => {
  const { t } = useT();
  const { width, height } = useWindowDimensions();
  const setStorySeen = useSettingsStore(s => s.setStorySeen);
  const calm = useSettingsStore(s => s.reduceFlash);
  const [index, setIndex] = useState(0);
  const fade = useRef(new Animated.Value(0)).current;
  const last = index === SCENES.length - 1;
  const scene = SCENES[index];

  useEffect(() => {
    fade.setValue(calm ? 1 : 0);
    if (!calm) Animated.timing(fade, { toValue: 1, duration: 520, useNativeDriver: true }).start();
  }, [index, calm, fade]);

  const finish = () => {
    setStorySeen(true);
    if (route.params?.replay) navigation.goBack();
    else navigation.replace("CharactersScreen", { mode: "expedition" });
  };
  const next = () => (last ? finish() : setIndex(i => i + 1));

  const wide = width >= 560;
  const art = Math.min(height * 0.62, wide ? width * 0.36 : width * 0.5, 280);

  const sceneArt =
    scene.art === "boss" ? (
      <SpriteImage source={require("../assets/sprites/enemies/Wumpus_Boss.png")} style={{ width: art, height: art }} resizeMode="contain" accessibilityIgnoresInvertColors />
    ) : scene.art === "heroes" ? (
      <View style={styles.heroGrid}>
        {characters.map((c, i) => (
          <SpriteImage key={i} source={c.scoreImage} style={{ width: art / 3.4, height: art / 3.4, borderRadius: art / 6.8, borderWidth: 2, borderColor: "rgba(255,255,255,0.35)" }} resizeMode="cover" accessibilityIgnoresInvertColors />
        ))}
      </View>
    ) : (
      <SpriteImage source={require("../assets/sprites/items/Icon_Gem.png")} style={{ width: art * 0.8, height: art * 0.8 }} resizeMode="contain" accessibilityIgnoresInvertColors />
    );

  return (
    <ImageBackground source={scene.background} resizeMode="cover" style={styles.root} fadeDuration={0}>
      <SafeAreaView style={styles.dim}>
        <TouchableOpacity activeOpacity={1} onPress={next} style={styles.touch} accessibilityRole="button" accessibilityLabel={last ? t("story.begin") : t("story.next")}>
          <Animated.View style={[styles.scene, wide ? styles.sceneWide : styles.sceneNarrow, { opacity: fade }]}>
            <View style={[styles.artBox, { width: art, height: art }]}>{sceneArt}</View>
            <View style={styles.text}>
              <Text style={styles.title} accessibilityRole="header" maxFontSizeMultiplier={1.3}>
                {t(`story.${index + 1}.title` as TranslationKey).toLocaleUpperCase()}
              </Text>
              <Text style={styles.body} maxFontSizeMultiplier={1.3}>
                {t(`story.${index + 1}.body` as TranslationKey)}
              </Text>
            </View>
          </Animated.View>
        </TouchableOpacity>

        <View style={styles.bottom}>
          <View style={styles.dots}>
            {SCENES.map((_, i) => (
              <View key={i} style={[styles.dot, i === index && styles.dotOn]} />
            ))}
          </View>
          <TouchableOpacity style={styles.cta} onPress={next} activeOpacity={0.85} accessibilityRole="button">
            <Text style={styles.ctaText} maxFontSizeMultiplier={1.2}>
              {(last ? t("story.begin") : t("story.next")).toLocaleUpperCase()}
            </Text>
            <Ionicons name="chevron-forward" size={20} color="#1a1200" />
          </TouchableOpacity>
        </View>

        {!last ? (
          <TouchableOpacity style={styles.skip} onPress={finish} hitSlop={10} accessibilityRole="button" accessibilityLabel={t("story.skip")}>
            <Text style={styles.skipText} maxFontSizeMultiplier={1.2}>
              {t("story.skip").toLocaleUpperCase()}
            </Text>
          </TouchableOpacity>
        ) : null}
      </SafeAreaView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  dim: { flex: 1, backgroundColor: "rgba(6,4,16,0.78)" },
  touch: { flex: 1, justifyContent: "center", paddingHorizontal: 28 },
  scene: { alignItems: "center", gap: 24 },
  sceneWide: { flexDirection: "row", justifyContent: "center" },
  sceneNarrow: { flexDirection: "column" },
  artBox: { alignItems: "center", justifyContent: "center", borderRadius: 28, backgroundColor: "rgba(255,213,79,0.08)", borderWidth: 1.5, borderColor: "rgba(255,213,79,0.35)" },
  heroGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center", padding: 10 },
  text: { flex: 1, maxWidth: 460, gap: 10 },
  title: { color: "#FFD54F", fontWeight: "900", fontSize: 26, letterSpacing: 3 },
  body: { color: "#efeaff", fontSize: 18, lineHeight: 27, fontWeight: "600" },
  bottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 28, paddingBottom: 18 },
  dots: { flexDirection: "row", gap: 8 },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: "rgba(255,255,255,0.25)" },
  dotOn: { width: 26, backgroundColor: "#FFD54F" },
  cta: { minHeight: MIN_TOUCH + 4, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#FFD54F", paddingHorizontal: 22, borderRadius: 16, borderBottomWidth: 4, borderBottomColor: "rgba(0,0,0,0.3)" },
  ctaText: { color: "#1a1200", fontWeight: "900", letterSpacing: 1.5, fontSize: 15 },
  skip: { position: "absolute", top: 14, right: 22, paddingHorizontal: 12, paddingVertical: 8 },
  skipText: { color: "#b9b4d4", fontWeight: "900", letterSpacing: 2, fontSize: 12 },
});

export default StoryScreen;
