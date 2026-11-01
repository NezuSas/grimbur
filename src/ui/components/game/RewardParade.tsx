import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import type { ImageSourcePropType } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Text from "../Text";
import SpriteImage from "../SpriteImage";
import EmberIcon from "../EmberIcon";
import OverlayContainer from "./OverlayContainer";
import { PopButton, PopLink, PopupPanel, popupTitleStyle } from "./popup";
import { useT } from "../../../i18n/useT";
import { emitSound } from "../../../audio/audioEventBus";

/** One thing a run earned, drawn as a card of its own. */
export interface RewardItem {
  key: string;
  tint: string;
  art: ImageSourcePropType;
  /** A hero standing (tall art) rather than an icon in a medallion. */
  standing?: boolean;
  kicker: string;
  title: string;
  line?: string;
  /** Embers it pays (shown under it). */
  embers?: number;
  /** "Try it now" for an unlock. */
  onTry?: () => void;
}

type Props = {
  items: RewardItem[];
  /** Open on the grid of every reward instead of one card at a time (reopened from the end card). */
  startOnGrid?: boolean;
  /** Development only: the card to open on (for screenshots). */
  startIndex?: number;
  calm?: boolean;
  onClose: () => void;
};

/**
 * What a run earned, as a parade of cards: one at a time, big, with its art (the hero who joins, the achievement's emblem,
 * the new rank), a tap for the next; or every card at once in a grid. Before the end card, so nothing is lost in a list.
 */
const RewardParade = ({ items, startOnGrid = false, startIndex = 0, calm = false, onClose }: Props) => {
  const { t } = useT();
  const { width, height } = useWindowDimensions();
  const [index, setIndex] = useState(startIndex);
  const [grid, setGrid] = useState(startOnGrid);
  const enter = useRef(new Animated.Value(0)).current;
  const shine = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (grid) return;
    enter.setValue(0);
    shine.setValue(0);
    emitSound(index === 0 ? "RELIC_PICKED" : "EMBER_GAIN");
    if (calm) {
      enter.setValue(1);
      return;
    }
    Animated.parallel([
      Animated.spring(enter, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }),
      Animated.timing(shine, { toValue: 1, duration: 900, delay: 150, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();
  }, [index, grid, calm, enter, shine]);

  if (items.length === 0) return null;
  const item = items[Math.min(index, items.length - 1)];
  const last = index >= items.length - 1;
  const next = () => (last ? onClose() : setIndex(i => i + 1));

  // ── Every reward at once ───────────────────────────────────────────────────
  if (grid) {
    const cardW = Math.min(width * 0.96, 900);
    const cols = cardW >= 760 ? 5 : cardW >= 560 ? 4 : 3;
    // The panel's padding and rim take 44: the tiles share what is left (floored, so a row never spills over).
    const tile = Math.floor((cardW - 48 - (cols - 1) * 8) / cols);
    return (
      <OverlayContainer fadeMs={0}>
        <PopupPanel tint="#FFD54F" width={cardW} style={styles.gridPanel} animate={!calm}>
          <Text style={popupTitleStyle("#FFD54F")} accessibilityRole="header" maxFontSizeMultiplier={1.15}>
            {t("parade.all", { n: items.length }).toLocaleUpperCase()}
          </Text>
          <ScrollView style={{ maxHeight: height * 0.62, alignSelf: "stretch" }} contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
            {items.map(it => (
              <View key={it.key} style={[styles.mini, { width: tile, borderColor: it.tint + "99" }]} accessible accessibilityLabel={`${it.kicker}. ${it.title}${it.line ? `. ${it.line}` : ""}`}>
                <View style={[styles.miniWell, { borderColor: it.tint + "AA", backgroundColor: it.tint + "22" }]}>
                  <SpriteImage source={it.art} style={it.standing ? styles.miniStanding : styles.miniArt} resizeMode="contain" />
                </View>
                <Text style={[styles.miniKicker, { color: it.tint }]} numberOfLines={1} maxFontSizeMultiplier={1.05}>
                  {it.kicker.toLocaleUpperCase()}
                </Text>
                <Text style={styles.miniTitle} numberOfLines={2} maxFontSizeMultiplier={1.05}>
                  {it.title}
                </Text>
                {it.embers ? (
                  <Text style={styles.miniEmbers} maxFontSizeMultiplier={1.05}>
                    <EmberIcon size={11} /> +{it.embers}
                  </Text>
                ) : null}
                {it.onTry ? (
                  <Pressable onPress={it.onTry} hitSlop={8} accessibilityRole="button" accessibilityLabel={`${t("over.unlock.try")}: ${it.title}`} style={[styles.miniTry, { borderColor: it.tint }]}>
                    <Text style={[styles.miniTryText, { color: it.tint }]} maxFontSizeMultiplier={1.05}>
                      {t("over.unlock.try").toLocaleUpperCase()}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            ))}
          </ScrollView>
          <PopButton label={t("parade.continue")} icon="arrow-forward" onPress={onClose} style={{ maxWidth: 360, alignSelf: "center" }} />
        </PopupPanel>
      </OverlayContainer>
    );
  }

  // ── One card at a time ─────────────────────────────────────────────────────
  const cardW = Math.min(width * 0.9, 560);
  const artSize = Math.min(height * 0.42, 170);
  const wide = width > height;
  return (
    <OverlayContainer fadeMs={index === 0 ? 220 : 0}>
      <Pressable onPress={next} accessibilityRole="button" accessibilityLabel={`${item.kicker}. ${item.title}${item.line ? `. ${item.line}` : ""}. ${t(last ? "parade.continue" : "parade.next")}`}>
        <Animated.View style={{ opacity: enter, transform: [{ scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }, { translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }] }}>
          <PopupPanel key={item.key} tint={item.tint} width={cardW} style={[styles.panel, wide && styles.panelRow]} animate={false}>
            <View style={[styles.artBox, { width: artSize * 1.15, height: artSize }]}>
              {/* Rays turning slowly behind the art. */}
              <Animated.View
                style={[
                  styles.glow,
                  { width: artSize * 1.1, height: artSize * 1.1, borderRadius: artSize, backgroundColor: item.tint },
                  { opacity: shine.interpolate({ inputRange: [0, 1], outputRange: [0, 0.22] }), transform: [{ scale: shine.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }] },
                ]}
              />
              {item.standing ? (
                <SpriteImage source={item.art} style={{ width: artSize * 1.1, height: artSize * 1.05 }} resizeMode="contain" />
              ) : (
                <View style={[styles.medal, { width: artSize * 0.86, height: artSize * 0.86, borderRadius: artSize * 0.43, borderColor: item.tint, backgroundColor: item.tint + "26", shadowColor: item.tint }]}>
                  <SpriteImage source={item.art} style={{ width: artSize * 0.66, height: artSize * 0.66 }} resizeMode="contain" />
                </View>
              )}
            </View>
            <View style={[styles.texts, wide && { flex: 1, alignItems: "flex-start" }]}>
              <Text style={[styles.kicker, { color: item.tint }]} maxFontSizeMultiplier={1.1}>
                {item.kicker.toLocaleUpperCase()}
              </Text>
              <Text style={[popupTitleStyle(item.tint), styles.title, wide && { textAlign: "left" }]} numberOfLines={2} adjustsFontSizeToFit maxFontSizeMultiplier={1.15}>
                {item.title.toLocaleUpperCase()}
              </Text>
              {item.line ? (
                <Text style={[styles.line, wide && { textAlign: "left" }]} numberOfLines={3} maxFontSizeMultiplier={1.15}>
                  {item.line}
                </Text>
              ) : null}
              {item.embers ? (
                <View style={styles.embers}>
                  <EmberIcon size={15} />
                  <Text style={styles.embersText} maxFontSizeMultiplier={1.1}>
                    +{item.embers}
                  </Text>
                </View>
              ) : null}
              {item.onTry ? <PopButton label={t("over.unlock.try")} icon="play" variant="secondary" onPress={item.onTry} style={{ alignSelf: "stretch" }} /> : null}
              <View style={styles.footer}>
                <View style={styles.dots}>
                  {items.length <= 12
                    ? items.map((it, i) => <View key={it.key} style={[styles.dot, i === index && { backgroundColor: item.tint, width: 16 }]} />)
                    : null}
                  {items.length > 12 ? (
                    <Text style={styles.count} maxFontSizeMultiplier={1.1}>
                      {`${index + 1} / ${items.length}`}
                    </Text>
                  ) : null}
                </View>
                <Text style={[styles.tap, { color: item.tint }]} maxFontSizeMultiplier={1.1}>
                  {t(last ? "parade.continue" : "parade.next").toLocaleUpperCase()} ›
                </Text>
              </View>
            </View>
            <LinearGradient pointerEvents="none" colors={["transparent", item.tint + "18"]} style={StyleSheet.absoluteFill} />
          </PopupPanel>
        </Animated.View>
      </Pressable>
      {items.length > 1 ? (
        <View style={styles.links}>
          <PopLink label={t("parade.seeAll", { n: items.length })} onPress={() => setGrid(true)} />
          <PopLink label={t("parade.skip")} onPress={onClose} />
        </View>
      ) : null}
    </OverlayContainer>
  );
};

export default RewardParade;

const styles = StyleSheet.create({
  panel: { gap: 14, paddingVertical: 20 },
  panelRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 24 },
  artBox: { alignItems: "center", justifyContent: "center" },
  glow: { position: "absolute" },
  medal: { borderWidth: 3, alignItems: "center", justifyContent: "center", shadowOpacity: 0.8, shadowRadius: 16, shadowOffset: { width: 0, height: 0 }, elevation: 8 },
  texts: { alignItems: "center", gap: 6 },
  kicker: { fontWeight: "900", fontSize: 12.5, letterSpacing: 2.5 },
  title: { fontSize: 22 },
  line: { color: "#E6D6C4", fontSize: 13.5, fontWeight: "700", textAlign: "center" },
  embers: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 3, paddingHorizontal: 10, borderRadius: 12, backgroundColor: "rgba(255,171,64,0.15)", borderWidth: 1, borderColor: "rgba(255,171,64,0.5)" },
  embersText: { color: "#FFCC80", fontWeight: "900", fontSize: 14 },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", alignSelf: "stretch", marginTop: 4, gap: 10 },
  dots: { flexDirection: "row", alignItems: "center", gap: 5, flexShrink: 1, flexWrap: "wrap" },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.22)" },
  count: { color: "#C2A88F", fontWeight: "900", fontSize: 12 },
  tap: { fontWeight: "900", fontSize: 12.5, letterSpacing: 1.5 },
  links: { flexDirection: "row", gap: 18, marginTop: 6 },
  gridPanel: { alignItems: "center", gap: 12 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center", paddingVertical: 2 },
  mini: { alignItems: "center", gap: 2, padding: 6, borderRadius: 14, borderWidth: 1.5, backgroundColor: "rgba(0,0,0,0.3)" },
  miniTry: { marginTop: 2, paddingVertical: 3, paddingHorizontal: 8, borderRadius: 10, borderWidth: 1 },
  miniTryText: { fontWeight: "900", fontSize: 9.5, letterSpacing: 1 },
  miniWell: { width: 52, height: 52, borderRadius: 26, borderWidth: 2, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  miniArt: { width: 38, height: 38 },
  miniStanding: { width: 50, height: 50 },
  miniKicker: { fontWeight: "900", fontSize: 9.5, letterSpacing: 1 },
  miniTitle: { color: "#fff", fontWeight: "800", fontSize: 11.5, textAlign: "center" },
  miniEmbers: { color: "#FFCC80", fontWeight: "900", fontSize: 11 },
});
