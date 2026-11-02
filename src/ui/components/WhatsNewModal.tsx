import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import type { ImageSourcePropType, NativeScrollEvent, NativeSyntheticEvent } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Text from "./Text";
import SpriteImage from "./SpriteImage";
import OverlayContainer from "./game/OverlayContainer";
import { PopButton, PopupPanel } from "./game/popup";
import { useT } from "../../i18n/useT";
import type { TranslationKey } from "../../i18n/en";
import { useSettingsStore } from "../../state/settings/store";
import { emitSound } from "../../audio/audioEventBus";

/** Bump when a new set of news ships: a returning player sees the card once per version. */
export const WHATS_NEW_ID = "whatsnew-2";

type Action = "puzzles" | "pets";
/** Any number of news fit: one per page. `action` adds a quiet link to try it right away. */
const ITEMS: { key: string; art: ImageSourcePropType; tint: string; action?: Action }[] = [
  { key: "puzzles", art: require("../../assets/sprites/ui/Icon_Riddle.png"), tint: "#4DD0E1", action: "puzzles" },
  { key: "quick", art: require("../../assets/sprites/ui/Icon_Bolt.png"), tint: "#FFD54F" },
  { key: "warden", art: require("../../assets/sprites/enemies/Warden_Boss.png"), tint: "#FF8A65" },
  { key: "pets", art: require("../../assets/sprites/cosmetics/PetAdult_Fox_A.png"), tint: "#81D4FA", action: "pets" },
];
const ACTION_LABEL: Record<Action, TranslationKey> = { puzzles: "whatsnew.tryPuzzle", pets: "whatsnew.pets" };

type Item = (typeof ITEMS)[number];
type Props = { onClose: () => void; onSeePuzzles: () => void; onSeePets: () => void };

/**
 * The art as a lit scene rather than an icon in a frame: a soft pool of the news' colour bleeding in from the card's edge,
 * a shadow on the floor, and the art floating gently above it.
 */
const ArtScene = ({ item, width, height, active, calm }: { item: Item; width: number; height: number; active: boolean; calm: boolean }) => {
  const float = useRef(new Animated.Value(0)).current;
  const enter = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (calm || !active) return;
    enter.setValue(0);
    Animated.timing(enter, { toValue: 1, duration: 420, easing: Easing.out(Easing.back(1.4)), useNativeDriver: true }).start();
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(float, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(float, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [active, calm, enter, float]);
  const art = Math.min(width * 0.68, height * 0.54);
  const glow = art * 1.5;
  return (
    <View style={{ width, height, alignItems: "center", justifyContent: "center" }}>
      <LinearGradient colors={[item.tint + "38", item.tint + "12", item.tint + "00"]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
      {/* A radial glow, built from a few soft discs (no blur on every platform). */}
      {[1, 0.74, 0.5].map(k => (
        <View key={k} style={{ position: "absolute", width: glow * k, height: glow * k, borderRadius: glow, backgroundColor: item.tint, opacity: 0.07 }} />
      ))}
      <Animated.View
        style={{
          position: "absolute",
          top: height / 2 + art * 0.4,
          width: art * 0.5,
          height: art * 0.07,
          borderRadius: art,
          backgroundColor: "rgba(0,0,0,0.28)",
          shadowColor: "#000",
          shadowOpacity: 0.6,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 0 },
          transform: [{ scaleX: float.interpolate({ inputRange: [0, 1], outputRange: [1, 0.86] }) }],
        }}
      />
      <Animated.View
        style={{
          opacity: enter,
          transform: [
            { translateY: float.interpolate({ inputRange: [0, 1], outputRange: [0, -6] }) },
            { scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.82, 1] }) },
          ],
        }}
      >
        <SpriteImage source={item.art} style={{ width: art, height: art }} resizeMode="contain" />
      </Animated.View>
    </View>
  );
};

/** What is new in the cave, shown once to a player who already knew it (a newcomer meets it all by playing). */
const WhatsNewModal = ({ onClose, onSeePuzzles, onSeePets }: Props) => {
  const { t } = useT();
  const calm = useSettingsStore(s => s.reduceFlash);
  const { width, height } = useWindowDimensions();
  const [page, setPage] = useState(0);
  const scroller = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const cardWidth = Math.round(Math.min(width * 0.9, 760));
  const cardHeight = Math.round(Math.max(250, Math.min(height * 0.86, 340)));
  const artWidth = Math.round(cardWidth * 0.42);
  const item = ITEMS[page];
  const last = page === ITEMS.length - 1;

  const goTo = (next: number) => {
    const to = Math.max(0, Math.min(ITEMS.length - 1, next));
    if (to === page) return;
    setPage(to);
    scroller.current?.scrollTo({ x: to * cardWidth, animated: !calm });
  };
  // A swipe turns the page too.
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const at = Math.round(e.nativeEvent.contentOffset.x / cardWidth);
    if (at !== page && at >= 0 && at < ITEMS.length) setPage(at);
  };
  const act = (a: Action) => (a === "puzzles" ? onSeePuzzles() : onSeePets());

  return (
    <OverlayContainer>
      <PopupPanel tint={item.tint} width={cardWidth} style={[styles.panel, { height: cardHeight }]}>
        <ScrollView ref={scroller} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onScroll={onScroll} scrollEventThrottle={32} style={StyleSheet.absoluteFill}>
          {ITEMS.map((it, i) => (
            <View key={it.key} style={[styles.page, { width: cardWidth, height: cardHeight }]}>
              <ArtScene item={it} width={artWidth} height={cardHeight} active={i === page} calm={calm} />
              <View style={styles.copy}>
                <Text style={[styles.eyebrow, { color: it.tint }]} maxFontSizeMultiplier={1.1}>
                  {t("whatsnew.title").toLocaleUpperCase()}
                </Text>
                <Text style={styles.title} maxFontSizeMultiplier={1.15}>
                  {t(`whatsnew.${it.key}.title` as TranslationKey)}
                </Text>
                <View style={[styles.rule, { backgroundColor: it.tint }]} />
                <Text style={styles.body} maxFontSizeMultiplier={1.15}>
                  {t(`whatsnew.${it.key}.body` as TranslationKey)}
                </Text>
                {it.action ? (
                  <Pressable onPress={() => act(it.action!)} hitSlop={8} accessibilityRole="button" style={({ pressed }) => [styles.action, pressed && { opacity: 0.6 }]}>
                    <Text style={[styles.actionText, { color: it.tint }]} maxFontSizeMultiplier={1.15}>
                      {t(ACTION_LABEL[it.action])}
                    </Text>
                    <Ionicons name="arrow-forward" size={15} color={it.tint} />
                  </Pressable>
                ) : null}
              </View>
            </View>
          ))}
        </ScrollView>

        {/* The controls stay put while the pages slide under them: progress, back, and one clear way forward. */}
        <View style={[styles.footer, { left: artWidth + 24 }]} pointerEvents="box-none">
          <View style={styles.dots} accessibilityLabel={`${page + 1} / ${ITEMS.length}`}>
            {ITEMS.map((it, i) => (
              <Pressable key={it.key} onPress={() => goTo(i)} hitSlop={8} accessibilityRole="button" accessibilityLabel={t(`whatsnew.${it.key}.title` as TranslationKey)}>
                <View style={[styles.dot, i === page && { width: 20, backgroundColor: item.tint }]} />
              </Pressable>
            ))}
          </View>
          <View style={{ flex: 1 }} />
          {page > 0 ? (
            <Pressable onPress={() => goTo(page - 1)} hitSlop={8} accessibilityRole="button" accessibilityLabel={t("whatsnew.prev")} style={({ pressed }) => [styles.back, pressed && { opacity: 0.6 }]}>
              <Ionicons name="chevron-back" size={20} color="#CDBBA5" />
            </Pressable>
          ) : null}
          <PopButton
            label={last ? t("whatsnew.go") : t("whatsnew.next")}
            onPress={() => (last ? onClose() : (emitSound("UI_TAP"), goTo(page + 1)))}
            tint={item.tint}
            style={styles.next}
          />
        </View>

        <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel={t("whatsnew.close")} style={({ pressed }) => [styles.close, pressed && { opacity: 0.6 }]}>
          <Ionicons name="close" size={20} color="#CDBBA5" />
        </Pressable>
      </PopupPanel>
    </OverlayContainer>
  );
};

const styles = StyleSheet.create({
  panel: { paddingHorizontal: 0, paddingVertical: 0, gap: 0, alignItems: "stretch" },
  page: { flexDirection: "row" },
  copy: { flex: 1, justifyContent: "center", paddingLeft: 24, paddingRight: 40, paddingBottom: 64, paddingTop: 20, gap: 8 },
  eyebrow: { fontSize: 11, fontWeight: "900", letterSpacing: 2.2, opacity: 0.9 },
  title: { color: "#FFF3E0", fontSize: 26, fontWeight: "900", lineHeight: 30 },
  rule: { width: 36, height: 3, borderRadius: 2, opacity: 0.8 },
  body: { color: "#CDBBA5", fontSize: 14.5, lineHeight: 21 },
  action: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", marginTop: 2 },
  actionText: { fontSize: 14, fontWeight: "800" },
  footer: { position: "absolute", right: 22, bottom: 18, flexDirection: "row", alignItems: "center", gap: 10 },
  dots: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.22)" },
  back: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.06)" },
  next: { width: 150 },
  close: { position: "absolute", top: 14, right: 16, width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.06)" },
});

export default WhatsNewModal;
