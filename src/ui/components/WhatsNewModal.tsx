import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useWindowDimensions } from "../layout/scaledWindow";
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
  { key: "puzzles", art: require("../../assets/sprites/news/News_Puzzles.png"), tint: "#4DD0E1", action: "puzzles" },
  { key: "quick", art: require("../../assets/sprites/news/News_Quick.png"), tint: "#FFD54F" },
  { key: "warden", art: require("../../assets/sprites/news/News_Warden.png"), tint: "#FF8A65" },
  { key: "pets", art: require("../../assets/sprites/news/News_Pets.png"), tint: "#81D4FA", action: "pets" },
];
const ACTION_LABEL: Record<Action, TranslationKey> = { puzzles: "whatsnew.tryPuzzle", pets: "whatsnew.pets" };

type Item = (typeof ITEMS)[number];
type Props = { onClose: () => void; onSeePuzzles: () => void; onSeePets: () => void };

/**
 * The art as a lit scene rather than an icon in a frame: a soft pool of the news' colour bleeding in from the card's edge,
 * and a painted diorama of it floating gently in the middle.
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
  const art = Math.min(width * 0.86, height * 0.72);
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
          opacity: enter,
          transform: [
            { translateY: float.interpolate({ inputRange: [0, 1], outputRange: [0, -5] }) },
            { scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.82, 1] }) },
          ],
        }}
      >
        <SpriteImage source={item.art} style={{ width: art, height: art }} resizeMode="contain" />
      </Animated.View>
    </View>
  );
};

/** The words of a page slide in a beat after its art, so the eye goes picture first, then title. */
const Reveal = ({ active, calm, children }: { active: boolean; calm: boolean; children: React.ReactNode }) => {
  const enter = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (calm || !active) return;
    enter.setValue(0);
    Animated.timing(enter, { toValue: 1, duration: 380, delay: 140, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [active, calm, enter]);
  return (
    <Animated.View style={{ opacity: enter, transform: [{ translateX: enter.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }], gap: 8 }}>
      {children}
    </Animated.View>
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

  // The rim glides from one news' colour to the next instead of jumping.
  const rim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(rim, { toValue: page, duration: calm ? 0 : 380, easing: Easing.inOut(Easing.quad), useNativeDriver: false }).start();
  }, [calm, page, rim]);
  const rimColor = ITEMS.length > 1 ? rim.interpolate({ inputRange: ITEMS.map((_, i) => i), outputRange: ITEMS.map(it => it.tint) }) : ITEMS[0].tint;

  const goTo = (next: number) => {
    const to = Math.max(0, Math.min(ITEMS.length - 1, next));
    if (to === page) return;
    emitSound("UI_TAP");
    setPage(to);
    scroller.current?.scrollTo({ x: to * cardWidth, animated: !calm });
  };
  // A swipe turns the page too.
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const at = Math.round(e.nativeEvent.contentOffset.x / cardWidth);
    if (at !== page && at >= 0 && at < ITEMS.length) {
      emitSound("UI_TAP");
      setPage(at);
    }
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
                <Reveal active={i === page} calm={calm}>
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
                </Reveal>
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
            onPress={() => (last ? onClose() : goTo(page + 1))}
            tint={item.tint}
            style={styles.next}
          />
        </View>

        <Animated.View pointerEvents="none" style={[styles.rim, { borderColor: rimColor }]} />
        <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel={t("whatsnew.close")} style={({ pressed }) => [styles.close, pressed && { opacity: 0.6 }]}>
          <Ionicons name="close" size={20} color="#CDBBA5" />
        </Pressable>
      </PopupPanel>
    </OverlayContainer>
  );
};

const styles = StyleSheet.create({
  panel: { paddingHorizontal: 0, paddingVertical: 0, gap: 0, alignItems: "stretch", borderWidth: 0 },
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
  // The panel's own border is off: this one, drawn on top, carries the gliding colour.
  rim: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderRadius: 26, borderWidth: 2 },
  close: { position: "absolute", top: 14, right: 16, width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.06)" },
});

export default WhatsNewModal;
