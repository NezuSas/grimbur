import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View, useWindowDimensions } from "react-native";
import type { ImageSourcePropType } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Text from "./Text";
import SpriteImage from "./SpriteImage";
import OverlayContainer from "./game/OverlayContainer";
import { PopButton, PopLink, PopupPanel, popupTitleStyle } from "./game/popup";
import { useT } from "../../i18n/useT";
import type { TranslationKey } from "../../i18n/en";
import { useSettingsStore } from "../../state/settings/store";

/** Bump when a new set of news ships: a returning player sees the card once per version. */
export const WHATS_NEW_ID = "whatsnew-2";

const GOLD = "#FFD54F";
const SPARKLES = require("../../assets/sprites/ui/Icon_Sparkles.png");
const ITEMS: { key: string; art: ImageSourcePropType; tint: string }[] = [
  { key: "puzzles", art: require("../../assets/sprites/ui/Icon_Riddle.png"), tint: "#4DD0E1" },
  { key: "quick", art: require("../../assets/sprites/ui/Icon_Bolt.png"), tint: "#FFD54F" },
  { key: "warden", art: require("../../assets/sprites/enemies/Warden_Boss.png"), tint: "#FF8A65" },
  { key: "pets", art: require("../../assets/sprites/cosmetics/PetAdult_Fox_A.png"), tint: "#81D4FA" },
];

type Props = { onClose: () => void; onSeePuzzles: () => void };

/**
 * One piece of news as a showcase: its art large on a glowing stage, a NEW tag, a name and one line.
 * The tiles deal in one after another and the art breathes, so the eye lands on the pictures first.
 */
const NewsTile = ({ item, index, artSize, width, calm }: { item: (typeof ITEMS)[number]; index: number; artSize: number; width?: `${number}%`; calm: boolean }) => {
  const { t } = useT();
  const enter = useRef(new Animated.Value(calm ? 1 : 0)).current;
  const glow = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (calm) return;
    Animated.sequence([
      Animated.delay(140 + index * 120),
      Animated.spring(enter, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }),
    ]).start();
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 1300, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0, duration: 1300, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    // Each tile breathes a little out of step with its neighbours.
    const start = setTimeout(() => loop.start(), 600 + index * 330);
    return () => {
      clearTimeout(start);
      loop.stop();
    };
  }, [calm, enter, glow, index]);

  const halo = artSize * 1.25;
  return (
    <Animated.View
      style={{
        ...(width ? { width } : { flex: 1, minWidth: 0 }),
        opacity: enter,
        transform: [
          { translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [26, 0] }) },
          { scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) },
        ],
      }}
    >
      <LinearGradient colors={[item.tint + "4D", item.tint + "14", "rgba(0,0,0,0.35)"]} locations={[0, 0.55, 1]} style={[styles.tile, { borderColor: item.tint + "AA" }]}>
        <View style={[styles.stage, { width: halo, height: halo }]}>
          <Animated.View
            style={[
              styles.halo,
              {
                width: halo,
                height: halo,
                borderRadius: halo / 2,
                backgroundColor: item.tint + "40",
                shadowColor: item.tint,
                opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] }),
                transform: [{ scale: glow.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.06] }) }],
              },
            ]}
          />
          <View style={[styles.ring, { width: halo * 0.86, height: halo * 0.86, borderRadius: halo, borderColor: item.tint + "88" }]} />
          <Animated.View style={{ transform: [{ translateY: glow.interpolate({ inputRange: [0, 1], outputRange: [2, -3] }) }] }}>
            <SpriteImage source={item.art} style={{ width: artSize, height: artSize }} resizeMode="contain" />
          </Animated.View>
        </View>
        <View style={[styles.tag, { backgroundColor: item.tint }]}>
          <Text style={styles.tagText} maxFontSizeMultiplier={1.1}>
            {t("whatsnew.new").toLocaleUpperCase()}
          </Text>
        </View>
        <Text style={[styles.name, { color: item.tint }]} numberOfLines={2} maxFontSizeMultiplier={1.15}>
          {t(`whatsnew.${item.key}.title` as TranslationKey)}
        </Text>
        <Text style={styles.body} maxFontSizeMultiplier={1.15}>
          {t(`whatsnew.${item.key}.body` as TranslationKey)}
        </Text>
      </LinearGradient>
    </Animated.View>
  );
};

/** What is new in the cave, shown once to a player who already knew it (a newcomer meets it all by playing). */
const WhatsNewModal = ({ onClose, onSeePuzzles }: Props) => {
  const { t } = useT();
  const calm = useSettingsStore(s => s.reduceFlash);
  const { width, height } = useWindowDimensions();
  const panelWidth = Math.min(width * 0.96, 880);
  // Four in a row on a landscape screen; two by two if the window is ever narrower.
  const perRow = width >= 600 ? ITEMS.length : 2;
  const gap = 8;
  // The panel's own padding is not ours to know: share the row in percent, and size the art from an estimate.
  const tileWidth = perRow === 2 ? ("48%" as const) : undefined;
  const artSize = Math.round(Math.max(52, Math.min(96, height * 0.19, (panelWidth * 0.85 / perRow) * 0.55)));
  return (
    <OverlayContainer>
      <PopupPanel tint={GOLD} width={panelWidth} style={{ maxHeight: height * 0.94 }}>
        <View style={styles.header}>
          <SpriteImage source={SPARKLES} style={styles.sparkle} resizeMode="contain" />
          <Text style={popupTitleStyle(GOLD)} maxFontSizeMultiplier={1.15}>
            {t("whatsnew.title").toLocaleUpperCase()}
          </Text>
          <SpriteImage source={SPARKLES} style={[styles.sparkle, { transform: [{ scaleX: -1 }] }]} resizeMode="contain" />
        </View>
        <View style={[styles.grid, { gap, flexWrap: perRow === 2 ? "wrap" : "nowrap" }]}>
          {ITEMS.map((item, i) => (
            <NewsTile key={item.key} item={item} index={i} artSize={artSize} width={tileWidth} calm={calm} />
          ))}
        </View>
        {/* Side by side: every line of height goes to the news on a small phone. */}
        <View style={styles.actions}>
          <PopLink label={t("whatsnew.tryPuzzle")} onPress={onSeePuzzles} />
          <PopButton label={t("whatsnew.go")} onPress={onClose} tint={GOLD} style={styles.button} />
        </View>
      </PopupPanel>
    </OverlayContainer>
  );
};

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  sparkle: { width: 26, height: 26 },
  grid: { flexDirection: "row", justifyContent: "center", alignSelf: "stretch" },
  tile: { alignItems: "center", paddingTop: 8, paddingBottom: 10, paddingHorizontal: 8, borderRadius: 16, borderWidth: 1.5, gap: 3, flexGrow: 1 },
  stage: { alignItems: "center", justifyContent: "center" },
  halo: { position: "absolute", shadowOpacity: 0.9, shadowRadius: 16, shadowOffset: { width: 0, height: 0 } },
  ring: { position: "absolute", borderWidth: 1.5, borderStyle: "dashed" },
  tag: { position: "absolute", top: 6, right: 6, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 8, transform: [{ rotate: "6deg" }] },
  tagText: { color: "#1A120B", fontSize: 9, fontWeight: "900", letterSpacing: 0.6 },
  name: { fontSize: 14, fontWeight: "900", textAlign: "center", lineHeight: 17 },
  body: { color: "#E6D6C2", fontSize: 11.5, lineHeight: 15, textAlign: "center" },
  actions: { flexDirection: "row", alignItems: "center", gap: 14, alignSelf: "stretch" },
  button: { flex: 1 },
});

export default WhatsNewModal;
