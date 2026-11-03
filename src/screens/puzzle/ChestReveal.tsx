import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import Text from "../../ui/components/Text";
import SpriteImage from "../../ui/components/SpriteImage";
import OverlayContainer from "../../ui/components/game/OverlayContainer";
import { PopButton, PopupPanel, popupTitleStyle } from "../../ui/components/game/popup";
import { useWindowDimensions } from "../../ui/layout/scaledWindow";
import { useT } from "../../i18n/useT";
import type { TranslationKey } from "../../i18n/en";
import { emitSound } from "../../audio/audioEventBus";
import { CHAPTER_STARS } from "../../core/stats/puzzleProgress";
import type { CosmeticId } from "../../core/cosmetics/cosmetics";
import { TIER_TINTS } from "./ChapterMap";
import { LEGEND_TIER } from "../../core/puzzles/puzzles";
import { FRAME_ART } from "../../ui/cosmeticArt";
import { useEscapeKey } from "../../ui/hotkeys";

const GOLD = "#FFD54F";
const SHUT = require("../../assets/sprites/items/Icon_Chest_Closed.webp");
const OPEN = require("../../assets/sprites/items/Icon_Chest.webp");

type Props = {
  tier: number;
  calm: boolean;
  /** Wear the chapter's prizes now (its title, and the Legend's frame). */
  onEquip: (ids: CosmeticId[]) => void;
  onClose: () => void;
};

export const chapterTitle = (tier: number): CosmeticId => `title_puzzle${tier}` as CosmeticId;

/** A mastered chapter's chest: it shakes, bursts open and gives the chapter's title, which can be worn at once. */
export default function ChestReveal({ tier, calm, onEquip, onClose }: Props) {
  useEscapeKey(onClose);
  const { t } = useT();
  const { width } = useWindowDimensions();
  const tint = TIER_TINTS[tier];
  const [opened, setOpened] = useState(calm);
  const shake = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(calm ? 1 : 0)).current;
  const reveal = useRef(new Animated.Value(calm ? 1 : 0)).current;

  useEffect(() => {
    if (calm) {
      emitSound("RELIC_PICKED");
      return;
    }
    // Three shakes, spelled out (a loop with a count never reports its end on the web).
    const wiggle = [1, 2, 3].flatMap(() => [
      Animated.timing(shake, { toValue: 1, duration: 70, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -1, duration: 140, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 70, useNativeDriver: true }),
    ]);
    Animated.sequence([Animated.delay(250), ...wiggle]).start(() => {
      setOpened(true);
      emitSound("RELIC_PICKED");
      Animated.parallel([
        Animated.timing(glow, { toValue: 1, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(reveal, { toValue: 1, duration: 500, delay: 250, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start();
    });
  }, [calm, shake, glow, reveal]);

  const id = chapterTitle(tier);
  // The Legend's chest also holds a frame.
  const frame: CosmeticId | null = tier === LEGEND_TIER ? "frame_legend" : null;
  return (
    <OverlayContainer>
      <PopupPanel tint={GOLD} width={Math.min(width * 0.9, 420)}>
        <Text style={popupTitleStyle(GOLD)} maxFontSizeMultiplier={1.15}>
          {t("puzzle.chest.title").toLocaleUpperCase()}
        </Text>
        <View style={styles.stage}>
          <Animated.View
            pointerEvents="none"
            style={[styles.glow, { backgroundColor: tint, opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0, 0.35] }), transform: [{ scale: glow.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }] }]}
          />
          <Animated.View style={{ transform: [{ rotate: shake.interpolate({ inputRange: [-1, 1], outputRange: ["-10deg", "10deg"] }) }] }}>
            <SpriteImage source={opened ? OPEN : SHUT} style={{ width: 96, height: 96 }} resizeMode="contain" />
          </Animated.View>
        </View>
        <Animated.View style={[styles.prize, { opacity: reveal, transform: [{ translateY: reveal.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }]}>
          <Text style={styles.body} maxFontSizeMultiplier={1.15}>
            {t("puzzle.chest.body", { n: CHAPTER_STARS, tier: t(`puzzle.tier.${tier}` as TranslationKey) })}
          </Text>
          <View style={[styles.title, { borderColor: tint }]}>
            <Text style={[styles.titleText, { color: tint }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} maxFontSizeMultiplier={1.15}>
              {`«${t(`cosmetic.${id}.name` as TranslationKey)}»`}
            </Text>
          </View>
          {frame && FRAME_ART[frame] ? (
            <View style={styles.frameRow}>
              <Text style={styles.body} maxFontSizeMultiplier={1.15}>
                {t("puzzle.chest.frame")}
              </Text>
              <SpriteImage source={FRAME_ART[frame]!} style={{ width: 64, height: 64 }} resizeMode="contain" />
            </View>
          ) : null}
        </Animated.View>
        <View style={styles.actions}>
          <PopButton label={t("puzzle.chest.ok")} variant="secondary" onPress={onClose} disabled={!opened} style={{ flex: 1 }} enterKey />
          <PopButton label={t("puzzle.chest.equip")} tint={GOLD} onPress={() => onEquip(frame ? [id, frame] : [id])} disabled={!opened} style={{ flex: 1 }} />
        </View>
      </PopupPanel>
    </OverlayContainer>
  );
}

const styles = StyleSheet.create({
  stage: { width: 150, height: 120, alignItems: "center", justifyContent: "center" },
  glow: { position: "absolute", width: 150, height: 150, borderRadius: 75 },
  prize: { alignItems: "center", gap: 8, alignSelf: "stretch" },
  body: { color: "#E6D6C2", fontSize: 13, textAlign: "center" },
  title: { alignSelf: "center", paddingHorizontal: 16, paddingVertical: 6, borderRadius: 14, borderWidth: 1.5, backgroundColor: "rgba(0,0,0,0.35)", maxWidth: "100%" },
  titleText: { fontWeight: "900", fontSize: 18 },
  actions: { flexDirection: "row", gap: 10, alignSelf: "stretch" },
  frameRow: { flexDirection: "row", alignItems: "center", gap: 10 },
});
