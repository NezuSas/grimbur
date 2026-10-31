import React, { useEffect, useState } from "react";
import { ImageBackground, Pressable, StyleSheet, TouchableOpacity, View, useWindowDimensions } from "react-native";
import type { ImageSourcePropType } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import SpriteImage from "../SpriteImage";
import { ALTAR_ART, SHOP_ART } from "../../toolArt";
import { BIOME_ART } from "../../biomeArt";
import Text from "../Text";
import OverlayContainer from "./OverlayContainer";
import { PopButton } from "./popup";
import { useT } from "../../../i18n/useT";
import { omenText } from "../../../i18n/keys";
import { SHOP_ITEMS, SHOP_PRICES, MAX_ITEMS, type Door, type ShopItem } from "../../../core/engine/shop";
import type { BiomeId } from "../../../core/engine/biomes";
import type { TranslationKey } from "../../../i18n/en";

const ITEM_COLOR: Record<ShopItem, string> = { arrows: "#FFB74D", shield: "#4FC3F7", detector: "#81C784", bomb: "#FF7043" };
const GEM = require("../../../assets/sprites/items/Icon_Gem.png");
/** Each omen's door wears the art and colour of what it brings. */
const OMEN_LOOK: Record<string, { art: ImageSourcePropType; color: string }> = {
  bounty: { art: require("../../../assets/sprites/items/Icon_Gem.png"), color: "#4FC3F7" },
  calm: { art: require("../../../assets/sprites/relics/lantern.png"), color: "#9EE37D" },
  arsenal: { art: require("../../../assets/sprites/items/Icon_Arrows.png"), color: "#FF8A65" },
};

type Props = {
  visible: boolean;
  /** The floor about to be entered. */
  nextFloor: number;
  nextIsLair: boolean;
  /** Set when that floor starts a new cave type. */
  newBiome: BiomeId | null;
  gems: number;
  shield: boolean;
  items: { detector: number; bomb: number };
  /** The two doors, or null when the floor has no fork. */
  doors: [Door, Door] | null;
  /** Index of the chosen door. */
  chosen: 0 | 1;
  onChoose: (index: 0 | 1) => void;
  onBuy: (item: ShopItem) => void;
  altarUsed: boolean;
  /** The shield comes back every floor anyway, so the altar would be free: it is not offered. */
  altarFree?: boolean;
  onAltar: () => void;
  onGo: () => void;
};

/**
 * Between two floors, over the next cave: the way down so far and the gems on top, the shop as four cards with the ware
 * big, and below the two doors as portals in the colour of their omen (or the floor ahead) beside the button down.
 */
const IntermissionOverlay = ({ visible, nextFloor, nextIsLair, newBiome, gems, shield, items, doors, chosen, onChoose, onBuy, altarUsed, altarFree, onAltar, onGo }: Props) => {
  const { t } = useT();
  const { width } = useWindowDimensions();
  // The button only works a moment after the overlay appears, so a leftover tap from the level card cannot skip it.
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!visible) {
      setArmed(false);
      return;
    }
    const timer = setTimeout(() => setArmed(true), 350);
    return () => clearTimeout(timer);
  }, [visible]);

  if (!visible) return null;

  const cardW = Math.min(width * 0.97, 900);
  const narrow = cardW < 560;
  const reason = (item: ShopItem): string | null => {
    if (item === "shield" && shield) return t("shop.shielded");
    if ((item === "detector" || item === "bomb") && items[item] >= MAX_ITEMS) return t("shop.bagFull");
    return null;
  };
  const biomeArt = BIOME_ART[nextIsLair ? "lair" : newBiome ?? "cave"];
  const biomeLine =
    newBiome && newBiome !== "cave" && newBiome !== "lair" ? `${t(`biome.${newBiome}.name` as TranslationKey)}: ${t(`biome.${newBiome}.rule` as TranslationKey)}` : null;
  const goLabel = nextIsLair ? t("shop.goLair") : t("shop.go", { floor: nextFloor });
  // The doors to draw: the two of the fork, or a single one showing the floor ahead.
  const portals: { key: string; door?: Door; fork: boolean }[] = doors ? doors.map((door, i) => ({ key: `d${i}`, door, fork: true })) : [{ key: "ahead", fork: false }];

  return (
    <OverlayContainer>
      <View style={[styles.card, { width: cardW }]}>
        <ImageBackground source={biomeArt.background} style={StyleSheet.absoluteFill} resizeMode="cover" imageStyle={{ opacity: 0.32 }} />
        <LinearGradient colors={["rgba(40,28,16,0.78)", "rgba(16,11,7,0.96)"]} style={StyleSheet.absoluteFill} pointerEvents="none" />

        {/* ── Header: the way down so far, and the gems to spend ─────────────── */}
        <View style={styles.header}>
          <View style={styles.journey}>
            <Text style={styles.journeyFrom} numberOfLines={1} maxFontSizeMultiplier={1.1}>
              {t("floor.banner", { n: nextFloor - 1 }).toLocaleUpperCase()}
            </Text>
            <Ionicons name="chevron-forward" size={16} color="#B99A7C" />
            <Text style={styles.journeyTo} numberOfLines={1} maxFontSizeMultiplier={1.1}>
              {(nextIsLair ? t("floor.banner.lair") : t("floor.banner", { n: nextFloor })).toLocaleUpperCase()}
            </Text>
          </View>
          <Text style={styles.title} accessibilityRole="header" numberOfLines={1} maxFontSizeMultiplier={1.15}>
            {t("shop.title").toLocaleUpperCase()}
          </Text>
          <View style={styles.purse} accessible accessibilityLabel={t("shop.purse", { count: gems })}>
            <SpriteImage source={GEM} style={{ width: 22, height: 22 }} resizeMode="contain" />
            <Text style={styles.purseText} maxFontSizeMultiplier={1.15}>
              {gems}
            </Text>
          </View>
        </View>

        {/* ── The shop: four cards, the ware big ────────────────────────────── */}
        <View style={[styles.shop, narrow && { flexWrap: "wrap" }]}>
          {SHOP_ITEMS.map(item => {
            const price = SHOP_PRICES[item];
            const blocked = reason(item);
            const canBuy = gems >= price && !blocked;
            const color = ITEM_COLOR[item];
            const name = t(`shop.${item}.name` as TranslationKey);
            const desc = t(`shop.${item}.desc` as TranslationKey);
            return (
              <Pressable
                key={item}
                disabled={!canBuy}
                onPress={() => onBuy(item)}
                accessibilityRole="button"
                accessibilityLabel={`${name}. ${desc}. ${blocked ?? t("shop.purse", { count: price })}`}
                accessibilityState={{ disabled: !canBuy }}
                style={({ pressed }) => [styles.ware, narrow && { flexBasis: "47%" }, { borderColor: canBuy ? color + "CC" : "rgba(255,255,255,0.1)" }, pressed && { transform: [{ scale: 0.96 }] }]}
              >
                <View style={[styles.wareGlow, { backgroundColor: color, opacity: canBuy ? 0.16 : 0.05 }]} />
                <SpriteImage source={SHOP_ART[item]} style={[styles.wareArt, !canBuy && { opacity: 0.4 }]} resizeMode="contain" />
                <Text style={[styles.wareName, !canBuy && { color: "#A8978A" }]} numberOfLines={1} maxFontSizeMultiplier={1.1}>
                  {name}
                </Text>
                <Text style={styles.wareDesc} numberOfLines={2} maxFontSizeMultiplier={1.05}>
                  {blocked ?? desc}
                </Text>
                <View style={[styles.wareBuy, { backgroundColor: canBuy ? color : "rgba(255,255,255,0.1)" }]}>
                  <SpriteImage source={GEM} style={{ width: 13, height: 13 }} resizeMode="contain" />
                  <Text style={[styles.wareBuyText, !canBuy && { color: "#C9B49C" }]} allowFontScaling={false}>
                    {price}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
        {(shield || altarUsed) && !altarFree ? (
          <TouchableOpacity
            disabled={!shield || altarUsed}
            onPress={onAltar}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={`${t("shop.altar.name")}. ${t("shop.altar.desc")}`}
            style={[styles.altar, altarUsed && { opacity: 0.55 }]}
          >
            <SpriteImage source={ALTAR_ART} style={{ width: 28, height: 28 }} resizeMode="contain" />
            <Text style={styles.altarText} numberOfLines={1} maxFontSizeMultiplier={1.1}>
              {altarUsed ? t("shop.altar.done") : `${t("shop.altar.name")}: ${t("shop.altar.desc")}`}
            </Text>
          </TouchableOpacity>
        ) : null}

        {/* ── The way on: two portals (or the floor ahead) and the button ───── */}
        <View style={[styles.wayRow, narrow && { flexDirection: "column" }]}>
          <View style={styles.doors}>
            {portals.map((p, i) => {
              const on = !p.fork || chosen === i;
              const look = p.door ? OMEN_LOOK[p.door] ?? { art: biomeArt.tileHidden, color: "#C9B49C" } : { art: biomeArt.tileHidden, color: p.fork ? "#C9B49C" : "#FFD54F" };
              const name = p.fork
                ? p.door
                  ? omenText(t, p.door, "name").replace(/^[^:]*:\s*/, "")
                  : t("fork.plain.name")
                : nextIsLair
                  ? t("floor.banner.lair")
                  : t("shop.ahead");
              const rule = p.fork ? (p.door ? omenText(t, p.door, "rule") : t("fork.plain.rule")) : biomeLine ?? (nextIsLair ? t("story.lair") : t("shop.aheadPlain"));
              return (
                <Pressable
                  key={p.key}
                  disabled={!p.fork}
                  onPress={() => onChoose(i as 0 | 1)}
                  accessibilityRole={p.fork ? "radio" : "text"}
                  accessibilityState={p.fork ? { selected: on } : undefined}
                  accessibilityLabel={`${name}. ${rule}`}
                  style={[styles.portal, { borderColor: on ? look.color : "rgba(255,255,255,0.12)" }, on && { backgroundColor: look.color + "1C" }]}
                >
                  <View style={[styles.portalArch, { borderColor: look.color + (on ? "" : "55") }]}>
                    <SpriteImage source={look.art} style={[styles.portalArt, !on && { opacity: 0.45 }]} resizeMode="contain" />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={[styles.portalName, { color: on ? look.color : "#D6C4B2" }]} numberOfLines={1} maxFontSizeMultiplier={1.1}>
                      {name.toLocaleUpperCase()}
                    </Text>
                    <Text style={styles.portalRule} numberOfLines={3} maxFontSizeMultiplier={1.05}>
                      {rule}
                    </Text>
                  </View>
                  {p.fork && on ? (
                    <View style={[styles.portalCheck, { backgroundColor: look.color }]}>
                      <Ionicons name="checkmark" size={13} color="#1A0F04" />
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
          <View style={[styles.go, narrow && { width: "100%" }]}>
            <PopButton label={goLabel} icon="arrow-forward" onPress={onGo} disabled={!armed} />
          </View>
        </View>
        {doors && biomeLine ? (
          <Text style={styles.biome} numberOfLines={1} maxFontSizeMultiplier={1.05}>
            {biomeLine}
          </Text>
        ) : null}
      </View>
    </OverlayContainer>
  );
};

export default IntermissionOverlay;

const styles = StyleSheet.create({
  card: { borderRadius: 24, borderWidth: 2, borderColor: "rgba(255,213,79,0.5)", overflow: "hidden", padding: 12, gap: 10 },
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  journey: { flex: 1, flexDirection: "row", alignItems: "center", gap: 4 },
  journeyFrom: { color: "#B99A7C", fontWeight: "900", fontSize: 12, letterSpacing: 1.2 },
  journeyTo: { color: "#FFE7A8", fontWeight: "900", fontSize: 12, letterSpacing: 1.2 },
  title: { color: "#FFD54F", fontWeight: "900", fontSize: 20, letterSpacing: 3, textAlign: "center" },
  purse: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 6 },
  purseText: { color: "#fff", fontWeight: "900", fontSize: 20, textShadowColor: "rgba(79,195,247,0.6)", textShadowRadius: 8 },
  shop: { flexDirection: "row", gap: 8 },
  ware: { flex: 1, alignItems: "center", gap: 2, paddingVertical: 8, paddingHorizontal: 6, borderRadius: 16, borderWidth: 1.5, backgroundColor: "rgba(0,0,0,0.38)", overflow: "hidden" },
  wareGlow: { position: "absolute", top: -30, width: 120, height: 90, borderRadius: 60 },
  wareArt: { width: 42, height: 42 },
  wareName: { color: "#fff", fontWeight: "900", fontSize: 13.5 },
  wareDesc: { color: "#CAB39C", fontSize: 11, fontWeight: "600", textAlign: "center", minHeight: 28 },
  wareBuy: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4, paddingHorizontal: 14, paddingVertical: 4, borderRadius: 12 },
  wareBuyText: { color: "#1a1200", fontWeight: "900", fontSize: 14 },
  altar: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 14, borderWidth: 1.5, borderColor: "#CE93D8", backgroundColor: "rgba(206,147,216,0.12)" },
  altarText: { flex: 1, color: "#E1BEE7", fontWeight: "800", fontSize: 12 },
  wayRow: { flexDirection: "row", alignItems: "stretch", gap: 10 },
  doors: { flex: 1, flexDirection: "row", gap: 8 },
  portal: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10, padding: 8, borderRadius: 16, borderWidth: 2, backgroundColor: "rgba(0,0,0,0.32)" },
  portalArch: { width: 50, height: 60, borderTopLeftRadius: 25, borderTopRightRadius: 25, borderBottomLeftRadius: 6, borderBottomRightRadius: 6, borderWidth: 2, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.45)" },
  portalArt: { width: 36, height: 36 },
  portalName: { fontWeight: "900", fontSize: 13, letterSpacing: 1 },
  portalRule: { color: "#D7C6B5", fontSize: 11.5, lineHeight: 15 },
  portalCheck: { position: "absolute", top: 6, right: 6, width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  go: { width: 210, justifyContent: "center" },
  biome: { color: "#80DEEA", fontWeight: "700", fontSize: 12, textAlign: "center" },
});
