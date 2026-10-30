import React, { useEffect, useState } from "react";
import { ImageBackground, Pressable, ScrollView, StyleSheet, TouchableOpacity, View, useWindowDimensions } from "react-native";
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
 * Between two floors, in two columns: the shop on the left (each item with what it does and its price in gems), the way on
 * on the right (the two doors with their whole rule, or the floor ahead) and the button down.
 */
const IntermissionOverlay = ({ visible, nextFloor, nextIsLair, newBiome, gems, shield, items, doors, chosen, onChoose, onBuy, altarUsed, altarFree, onAltar, onGo }: Props) => {
  const { t } = useT();
  const { width, height } = useWindowDimensions();
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

  const cardW = Math.min(width * 0.96, 900);
  const cardH = Math.min(height * 0.94, 460);
  const stacked = cardW < 560;

  const reason = (item: ShopItem): string | null => {
    if (item === "shield" && shield) return t("shop.shielded");
    if ((item === "detector" || item === "bomb") && items[item] >= MAX_ITEMS) return t("shop.bagFull");
    return null;
  };
  const biomeArt = BIOME_ART[nextIsLair ? "lair" : newBiome ?? "cave"];

  return (
    <OverlayContainer>
      <View style={[styles.card, { width: cardW, minHeight: stacked ? undefined : cardH }]}>
        <ImageBackground source={biomeArt.background} style={StyleSheet.absoluteFill} resizeMode="cover" imageStyle={{ opacity: 0.3 }} />
        <LinearGradient colors={["rgba(40,28,16,0.8)", "rgba(16,11,7,0.96)"]} style={StyleSheet.absoluteFill} pointerEvents="none" />

        {/* Header: where the player is, and the gems to spend */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title} accessibilityRole="header" numberOfLines={1} maxFontSizeMultiplier={1.15}>
              {t("shop.title").toLocaleUpperCase()}
            </Text>
            <Text style={styles.subtitle} numberOfLines={1} maxFontSizeMultiplier={1.15}>
              {t("shop.subtitle")}
            </Text>
          </View>
          <View style={styles.purse} accessible accessibilityLabel={t("shop.purse", { count: gems })}>
            <SpriteImage source={GEM} style={{ width: 22, height: 22 }} resizeMode="contain" />
            <Text style={styles.purseText} maxFontSizeMultiplier={1.15}>{gems}</Text>
          </View>
        </View>

        <View style={[styles.columns, stacked && { flexDirection: "column" }]}>
          {/* ── The shop ───────────────────────────────────────────────────── */}
          <ScrollView style={styles.left} contentContainerStyle={{ gap: 8 }} showsVerticalScrollIndicator={false}>
            <Text style={styles.section} maxFontSizeMultiplier={1.15}>{t("shop.section").toLocaleUpperCase()}</Text>
            <View style={styles.grid}>
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
                    style={({ pressed }) => [styles.item, { borderColor: canBuy ? color : "rgba(255,255,255,0.12)" }, canBuy && { backgroundColor: color + "14" }, pressed && { transform: [{ scale: 0.97 }] }]}
                  >
                    <SpriteImage source={SHOP_ART[item]} style={[styles.itemArt, !canBuy && { opacity: 0.45 }]} resizeMode="contain" />
                    <View style={{ flex: 1, gap: 1 }}>
                      <Text style={[styles.itemName, !canBuy && { color: "#B9A898" }]} numberOfLines={1} maxFontSizeMultiplier={1.15}>
                        {name}
                      </Text>
                      <Text style={styles.itemDesc} numberOfLines={2} maxFontSizeMultiplier={1.1}>
                        {blocked ?? desc}
                      </Text>
                    </View>
                    <View style={[styles.price, { backgroundColor: canBuy ? color : "rgba(255,255,255,0.12)" }]}>
                      <SpriteImage source={GEM} style={{ width: 12, height: 12 }} resizeMode="contain" />
                      <Text style={[styles.priceText, !canBuy && { color: "#D7C6B5" }]} allowFontScaling={false}>
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
                <SpriteImage source={ALTAR_ART} style={{ width: 34, height: 34 }} resizeMode="contain" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.altarName} numberOfLines={1} maxFontSizeMultiplier={1.15}>
                    {altarUsed ? t("shop.altar.done") : t("shop.altar.name")}
                  </Text>
                  {!altarUsed ? (
                    <Text style={styles.altarText} numberOfLines={2} maxFontSizeMultiplier={1.1}>
                      {t("shop.altar.desc")}
                    </Text>
                  ) : null}
                </View>
              </TouchableOpacity>
            ) : null}
          </ScrollView>

          {/* ── The way on ─────────────────────────────────────────────────── */}
          <View style={styles.right}>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 8 }} showsVerticalScrollIndicator={false}>
              <Text style={styles.section} maxFontSizeMultiplier={1.15}>
                {(doors ? t("fork.title") : t("shop.ahead")).toLocaleUpperCase()}
              </Text>
              {doors ? (
                doors.map((door, i) => {
                  const on = chosen === i;
                  const name = door ? omenText(t, door, "name") : t("fork.plain.name");
                  const rule = door ? omenText(t, door, "rule") : t("fork.plain.rule");
                  return (
                    <Pressable
                      key={i}
                      onPress={() => onChoose(i as 0 | 1)}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: on }}
                      accessibilityLabel={`${name}. ${rule}`}
                      style={[styles.door, on && styles.doorOn]}
                    >
                      <Ionicons name={on ? "radio-button-on" : "radio-button-off"} size={20} color={on ? "#FFD54F" : "#8C7A68"} />
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={[styles.doorName, on && { color: "#FFD54F" }]} numberOfLines={1} maxFontSizeMultiplier={1.15}>
                          {name}
                        </Text>
                        <Text style={styles.doorRule} maxFontSizeMultiplier={1.1}>
                          {rule}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })
              ) : (
                <View style={styles.ahead}>
                  <SpriteImage source={biomeArt.tileHidden} style={{ width: 52, height: 52 }} resizeMode="contain" />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.doorName} numberOfLines={1} maxFontSizeMultiplier={1.15}>
                      {nextIsLair ? t("shop.goLair") : t("floor.banner", { n: nextFloor })}
                    </Text>
                    <Text style={styles.doorRule} maxFontSizeMultiplier={1.1}>
                      {newBiome && newBiome !== "cave" && newBiome !== "lair"
                        ? `${t(`biome.${newBiome}.name` as TranslationKey)}: ${t(`biome.${newBiome}.rule` as TranslationKey)}`
                        : nextIsLair
                          ? t("story.lair")
                          : t("shop.aheadPlain")}
                    </Text>
                  </View>
                </View>
              )}
              {doors && newBiome && newBiome !== "cave" && newBiome !== "lair" ? (
                <Text style={styles.biome} maxFontSizeMultiplier={1.1}>
                  {t(`biome.${newBiome}.name` as TranslationKey)}: {t(`biome.${newBiome}.rule` as TranslationKey)}
                </Text>
              ) : null}
            </ScrollView>
            <PopButton label={nextIsLair ? t("shop.goLair") : t("shop.go", { floor: nextFloor })} icon="arrow-forward" onPress={onGo} disabled={!armed} />
          </View>
        </View>
      </View>
    </OverlayContainer>
  );
};

export default IntermissionOverlay;

const styles = StyleSheet.create({
  card: { borderRadius: 24, borderWidth: 2, borderColor: "rgba(255,213,79,0.5)", overflow: "hidden", padding: 12, gap: 8 },
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  title: { color: "#FFD54F", fontWeight: "900", fontSize: 22, letterSpacing: 3 },
  subtitle: { color: "#D7C6B5", fontSize: 12, fontWeight: "600" },
  purse: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, minHeight: 38, borderRadius: 19, borderWidth: 2, borderColor: "#4FC3F7", backgroundColor: "rgba(79,195,247,0.16)" },
  purseText: { color: "#fff", fontWeight: "900", fontSize: 18 },
  columns: { flex: 1, flexDirection: "row", gap: 14 },
  left: { flex: 1.15 },
  right: { flex: 1, gap: 10 },
  section: { color: "#B99A7C", fontWeight: "900", fontSize: 12, letterSpacing: 2 },
  grid: { gap: 6 },
  item: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 14, borderWidth: 1.5, backgroundColor: "rgba(0,0,0,0.3)" },
  itemArt: { width: 34, height: 34 },
  itemName: { color: "#fff", fontWeight: "900", fontSize: 14 },
  itemDesc: { color: "#CAB39C", fontSize: 11.5, fontWeight: "600" },
  price: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 11 },
  priceText: { color: "#1a1200", fontWeight: "900", fontSize: 13 },
  altar: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 7, paddingHorizontal: 10, borderRadius: 14, borderWidth: 1.5, borderColor: "#CE93D8", backgroundColor: "rgba(206,147,216,0.12)" },
  altarName: { color: "#E1BEE7", fontWeight: "900", fontSize: 14 },
  altarText: { color: "#D7C6B5", fontSize: 11.5 },
  door: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 10, borderRadius: 14, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.14)", backgroundColor: "rgba(0,0,0,0.3)" },
  doorOn: { borderColor: "#FFD54F", backgroundColor: "rgba(255,213,79,0.12)" },
  doorName: { color: "#fff", fontWeight: "900", fontSize: 14 },
  doorRule: { color: "#D7C6B5", fontSize: 12, lineHeight: 16 },
  ahead: { flexDirection: "row", alignItems: "center", gap: 12, padding: 10, borderRadius: 14, borderWidth: 1.5, borderColor: "rgba(255,213,79,0.4)", backgroundColor: "rgba(0,0,0,0.3)" },
  biome: { color: "#80DEEA", fontWeight: "700", fontSize: 12 },
});
