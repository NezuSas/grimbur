import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import type { ImageSourcePropType, NativeScrollEvent, NativeSyntheticEvent } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Text from "./Text";
import SpriteImage from "./SpriteImage";
import OverlayContainer from "./game/OverlayContainer";
import { PopButton, PopLink, PopupPanel, popupTitleStyle } from "./game/popup";
import { useT } from "../../i18n/useT";
import type { TranslationKey } from "../../i18n/en";
import { useSettingsStore } from "../../state/settings/store";
import { emitSound } from "../../audio/audioEventBus";

/** Bump when a new set of news ships: a returning player sees the card once per version. */
export const WHATS_NEW_ID = "whatsnew-2";

const GOLD = "#FFD54F";
const SPARKLES = require("../../assets/sprites/ui/Icon_Sparkles.png");
/** Any number of news fit: one per page, turned with the arrows, the dots or a swipe. */
const ITEMS: { key: string; art: ImageSourcePropType; tint: string }[] = [
  { key: "puzzles", art: require("../../assets/sprites/ui/Icon_Riddle.png"), tint: "#4DD0E1" },
  { key: "quick", art: require("../../assets/sprites/ui/Icon_Bolt.png"), tint: "#FFD54F" },
  { key: "warden", art: require("../../assets/sprites/enemies/Warden_Boss.png"), tint: "#FF8A65" },
  { key: "pets", art: require("../../assets/sprites/cosmetics/PetAdult_Fox_A.png"), tint: "#81D4FA" },
];

type Item = (typeof ITEMS)[number];
type Props = { onClose: () => void; onSeePuzzles: () => void };

/** The art of one piece of news on a glowing stage that breathes, popping in each time its page comes up. */
const Stage = ({ item, size, active, calm }: { item: Item; size: number; active: boolean; calm: boolean }) => {
  const pop = useRef(new Animated.Value(1)).current;
  const glow = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (calm || !active) return;
    pop.setValue(0.6);
    Animated.spring(pop, { toValue: 1, friction: 5, tension: 90, useNativeDriver: true }).start();
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 1300, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0, duration: 1300, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [active, calm, glow, pop]);
  const art = size * 0.78;
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Animated.View
        style={[
          styles.halo,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: item.tint + "38",
            shadowColor: item.tint,
            opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }),
            transform: [{ scale: glow.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1.04] }) }],
          },
        ]}
      />
      <View style={[styles.ring, { width: size * 0.9, height: size * 0.9, borderRadius: size, borderColor: item.tint + "88" }]} />
      <Animated.View style={{ transform: [{ scale: pop }, { translateY: glow.interpolate({ inputRange: [0, 1], outputRange: [3, -4] }) }] }}>
        <SpriteImage source={item.art} style={{ width: art, height: art }} resizeMode="contain" />
      </Animated.View>
    </View>
  );
};

const Arrow = ({ dir, enabled, onPress, label }: { dir: "back" | "forward"; enabled: boolean; onPress: () => void; label: string }) => (
  <Pressable
    onPress={onPress}
    disabled={!enabled}
    accessibilityRole="button"
    accessibilityLabel={label}
    hitSlop={10}
    style={({ pressed }) => [styles.arrow, { opacity: enabled ? 1 : 0.25, transform: [{ scale: pressed ? 0.9 : 1 }] }]}
  >
    <Ionicons name={dir === "back" ? "chevron-back" : "chevron-forward"} size={26} color={GOLD} />
  </Pressable>
);

/** What is new in the cave, shown once to a player who already knew it (a newcomer meets it all by playing). */
const WhatsNewModal = ({ onClose, onSeePuzzles }: Props) => {
  const { t } = useT();
  const calm = useSettingsStore(s => s.reduceFlash);
  const { width, height } = useWindowDimensions();
  const [pageWidth, setPageWidth] = useState(0);
  const [page, setPage] = useState(0);
  const scroller = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const stageSize = Math.round(Math.max(96, Math.min(180, height * 0.34)));
  const item = ITEMS[page];

  const goTo = (next: number) => {
    const to = Math.max(0, Math.min(ITEMS.length - 1, next));
    if (to === page) return;
    emitSound("UI_TAP");
    setPage(to);
    scroller.current?.scrollTo({ x: to * pageWidth, animated: !calm });
  };
  // A swipe turns the page too.
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!pageWidth) return;
    const at = Math.round(e.nativeEvent.contentOffset.x / pageWidth);
    if (at !== page && at >= 0 && at < ITEMS.length) setPage(at);
  };

  return (
    <OverlayContainer>
      <PopupPanel tint={GOLD} width={Math.min(width * 0.92, 720)} style={{ maxHeight: height * 0.94 }}>
        <View style={styles.header}>
          <SpriteImage source={SPARKLES} style={styles.sparkle} resizeMode="contain" />
          <Text style={popupTitleStyle(GOLD)} maxFontSizeMultiplier={1.15}>
            {t("whatsnew.title").toLocaleUpperCase()}
          </Text>
          <SpriteImage source={SPARKLES} style={[styles.sparkle, { transform: [{ scaleX: -1 }] }]} resizeMode="contain" />
        </View>

        <View style={styles.carousel}>
          <Arrow dir="back" enabled={page > 0} onPress={() => goTo(page - 1)} label={t("whatsnew.prev")} />
          <View style={{ flex: 1 }} onLayout={e => setPageWidth(e.nativeEvent.layout.width)}>
            {pageWidth > 0 ? (
              <ScrollView ref={scroller} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onScroll={onScroll} scrollEventThrottle={32}>
                {ITEMS.map((it, i) => (
                  <View key={it.key} style={{ width: pageWidth }}>
                    <LinearGradient
                      colors={[it.tint + "33", it.tint + "0D", "rgba(0,0,0,0.3)"]}
                      start={{ x: 0, y: 0.5 }}
                      end={{ x: 1, y: 0.5 }}
                      style={[styles.page, { borderColor: it.tint + "99" }]}
                    >
                      <Stage item={it} size={stageSize} active={i === page} calm={calm} />
                      <View style={styles.copy}>
                        <View style={[styles.tag, { backgroundColor: it.tint }]}>
                          <Text style={styles.tagText} maxFontSizeMultiplier={1.1}>
                            {t("whatsnew.new").toLocaleUpperCase()}
                          </Text>
                        </View>
                        <Text style={[styles.name, { color: it.tint }]} maxFontSizeMultiplier={1.15}>
                          {t(`whatsnew.${it.key}.title` as TranslationKey)}
                        </Text>
                        <Text style={styles.body} maxFontSizeMultiplier={1.15}>
                          {t(`whatsnew.${it.key}.body` as TranslationKey)}
                        </Text>
                      </View>
                    </LinearGradient>
                  </View>
                ))}
              </ScrollView>
            ) : (
              <View style={{ height: stageSize + 20 }} />
            )}
          </View>
          <Arrow dir="forward" enabled={page < ITEMS.length - 1} onPress={() => goTo(page + 1)} label={t("whatsnew.next")} />
        </View>

        <View style={styles.dots} accessibilityLabel={`${page + 1} / ${ITEMS.length}`}>
          {ITEMS.map((it, i) => (
            <Pressable key={it.key} onPress={() => goTo(i)} hitSlop={8}>
              <View style={[styles.dot, i === page ? { width: 22, backgroundColor: item.tint } : null]} />
            </Pressable>
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
  carousel: { flexDirection: "row", alignItems: "center", alignSelf: "stretch", gap: 6 },
  arrow: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.35)", borderWidth: 1.5, borderColor: GOLD + "88" },
  page: { flexDirection: "row", alignItems: "center", gap: 16, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 18, borderWidth: 1.5 },
  halo: { position: "absolute", shadowOpacity: 0.9, shadowRadius: 18, shadowOffset: { width: 0, height: 0 } },
  ring: { position: "absolute", borderWidth: 1.5, borderStyle: "dashed" },
  copy: { flex: 1, gap: 6, alignItems: "flex-start" },
  tag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  tagText: { color: "#1A120B", fontSize: 10, fontWeight: "900", letterSpacing: 0.8 },
  name: { fontSize: 20, fontWeight: "900", lineHeight: 24 },
  body: { color: "#E6D6C2", fontSize: 14, lineHeight: 19 },
  dots: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.25)" },
  actions: { flexDirection: "row", alignItems: "center", gap: 14, alignSelf: "stretch" },
  button: { flex: 1 },
});

export default WhatsNewModal;
