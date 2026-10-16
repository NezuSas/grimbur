import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, TouchableOpacity, View, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import SpriteImage from "../SpriteImage";
import { ALTAR_ART, SHOP_ART } from "../../toolArt";
import Text from "../Text";
import OverlayContainer from "./OverlayContainer";
import { useT } from "../../../i18n/useT";
import { omenText } from "../../../i18n/keys";
import { SHOP_ITEMS, SHOP_PRICES, MAX_ITEMS, type Door, type ShopItem } from "../../../core/engine/shop";
import type { BiomeId } from "../../../core/engine/biomes";
import type { TranslationKey } from "../../../i18n/en";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

const ITEM_ICONS: Record<ShopItem, { icon: IconName; color: string }> = {
  arrows: { icon: "arrow-forward-circle", color: "#FFB74D" },
  shield: { icon: "shield-checkmark", color: "#4FC3F7" },
  detector: { icon: "radio", color: "#81C784" },
  bomb: { icon: "flame", color: "#FF7043" },
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

/** Between two floors: spend the gems, maybe make an offering at the altar, choose a door, go on. */
const IntermissionOverlay = ({
  visible,
  nextFloor,
  nextIsLair,
  newBiome,
  gems,
  shield,
  items,
  doors,
  chosen,
  onChoose,
  onBuy,
  altarUsed,
  altarFree,
  onAltar,
  onGo,
}: Props) => {
  const { t } = useT();
  const { width, height } = useWindowDimensions();
  const compact = height < 420;
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

  // Four shop cards in a row when they stay readable; otherwise two by two (never three and one).
  const avail = width * 0.9;
  const fit = Math.floor((avail + 10) / (100 + 10));
  const cols = fit >= 4 ? 4 : fit >= 2 ? 2 : 1;
  const cardWidth = Math.min(150, (avail - 10 * (cols - 1)) / cols);
  // The two doors sit side by side, or one above the other on a narrow window.
  const doorWidth = avail >= 2 * 200 + 12 ? Math.min(260, (avail - 12) / 2) : Math.min(260, avail);
  const pad = compact ? 8 : 12;

  const reason = (item: ShopItem): string | null => {
    if (item === "shield" && shield) return t("shop.shielded");
    if ((item === "detector" || item === "bomb") && items[item] >= MAX_ITEMS) return t("shop.bagFull");
    return null;
  };

  return (
    <OverlayContainer>
      <View style={styles.headerRow}>
        <Text style={styles.title} accessibilityRole="header" maxFontSizeMultiplier={1.2}>
          {t("shop.title").toLocaleUpperCase()}
        </Text>
        <View style={styles.purse} accessible accessibilityLabel={t("shop.purse", { count: gems })}>
          <Ionicons name="diamond" size={16} color="#4FC3F7" />
          <Text style={styles.purseText} maxFontSizeMultiplier={1.2}>
            {gems}
          </Text>
        </View>
      </View>

      <Text style={styles.subtitle} maxFontSizeMultiplier={1.2}>
        {t("shop.subtitle")}
      </Text>

      <View style={[styles.row, { gap: 10, marginTop: pad, flexWrap: "wrap" }]}>
        {SHOP_ITEMS.map(item => {
          const price = SHOP_PRICES[item];
          const blocked = reason(item);
          const canBuy = gems >= price && !blocked;
          const { color } = ITEM_ICONS[item];
          const name = t(`shop.${item}.name` as TranslationKey);
          const desc = t(`shop.${item}.desc` as TranslationKey);
          return (
            <TouchableOpacity
              key={item}
              disabled={!canBuy}
              onPress={() => onBuy(item)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={`${name}. ${desc}. ${blocked ?? `${price} ${t("shop.purse", { count: price })}`}`}
              accessibilityState={{ disabled: !canBuy }}
              style={[styles.card, { width: cardWidth, borderColor: canBuy ? color : "#4a4560", opacity: canBuy ? 1 : 0.55 }]}
            >
              <SpriteImage source={SHOP_ART[item]} style={{ width: compact ? 34 : 44, height: compact ? 34 : 44 }} resizeMode="contain" accessibilityIgnoresInvertColors />
              <Text style={styles.cardName} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.2}>
                {name}
              </Text>
              {!compact && (
                <Text style={styles.cardDesc} numberOfLines={3} maxFontSizeMultiplier={1.2}>
                  {desc}
                </Text>
              )}
              <View style={[styles.price, { backgroundColor: canBuy ? color : "#4a4560" }]}>
                <Ionicons name="diamond" size={11} color="#1a1030" />
                <Text style={styles.priceText} allowFontScaling={false}>
                  {blocked ?? price}
                </Text>
              </View>
            </TouchableOpacity>
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
          style={[styles.altar, { marginTop: pad, opacity: altarUsed ? 0.55 : 1 }]}
        >
          <SpriteImage source={ALTAR_ART} style={{ width: 26, height: 26 }} resizeMode="contain" accessibilityIgnoresInvertColors />
          <Text style={styles.altarText} numberOfLines={1} maxFontSizeMultiplier={1.2}>
            {altarUsed ? t("shop.altar.done") : `${t("shop.altar.name")}: ${t("shop.altar.desc")}`}
          </Text>
        </TouchableOpacity>
      ) : null}

      {doors && (
        <>
          <Text style={[styles.sub, { marginTop: pad }]} maxFontSizeMultiplier={1.2}>
            {t("fork.title").toLocaleUpperCase()}
          </Text>
          <View style={[styles.row, { gap: 12, marginTop: 6, flexWrap: "wrap" }]}>
            {doors.map((door, i) => {
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
                  style={[styles.door, { width: doorWidth, borderColor: on ? "#FFD700" : "#4a4560", backgroundColor: on ? "rgba(255,215,0,0.12)" : "#1a1a1a" }]}
                >
                  <Ionicons name={on ? "radio-button-on" : "radio-button-off"} size={18} color={on ? "#FFD700" : "#8d86a8"} />
                  <View style={styles.doorText}>
                    <Text style={styles.doorName} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.2}>
                      {name}
                    </Text>
                    <Text style={styles.doorRule} numberOfLines={compact ? 2 : 3} maxFontSizeMultiplier={1.2}>
                      {rule}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </>
      )}

      {newBiome && newBiome !== "cave" && newBiome !== "lair" && (
        <Text style={[styles.biome, { marginTop: pad }]} maxFontSizeMultiplier={1.2}>
          {t(`biome.${newBiome}.name` as TranslationKey)}: {t(`biome.${newBiome}.rule` as TranslationKey)}
        </Text>
      )}

      <TouchableOpacity
        onPress={onGo}
        disabled={!armed}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={nextIsLair ? t("shop.goLair") : t("shop.go", { floor: nextFloor })}
        style={[styles.go, { marginTop: pad + 2, opacity: armed ? 1 : 0.6 }]}
      >
        <Text style={styles.goText} maxFontSizeMultiplier={1.2}>
          {(nextIsLair ? t("shop.goLair") : t("shop.go", { floor: nextFloor })).toLocaleUpperCase()}
        </Text>
        <Ionicons name="chevron-forward" size={20} color="#1a1030" />
      </TouchableOpacity>
    </OverlayContainer>
  );
};

export default IntermissionOverlay;

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  title: { color: "#FFD700", fontWeight: "900", fontSize: 20, letterSpacing: 3 },
  subtitle: { color: "#bdb8d4", fontSize: 12, textAlign: "center", marginTop: 4 },
  purse: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(79,195,247,0.15)",
    borderWidth: 1.5,
    borderColor: "#4FC3F7",
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  purseText: { color: "#fff", fontWeight: "900", fontSize: 16 },
  row: { flexDirection: "row", justifyContent: "center" },
  card: {
    backgroundColor: "#1a1a1a",
    borderRadius: 16,
    borderWidth: 2,
    paddingVertical: 8,
    paddingHorizontal: 6,
    alignItems: "center",
    gap: 3,
  },
  cardName: { color: "#fff", fontWeight: "900", fontSize: 13, textAlign: "center", alignSelf: "stretch" },
  cardDesc: { color: "#bdb8d4", fontSize: 11, textAlign: "center" },
  price: { flexDirection: "row", alignItems: "center", gap: 3, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, marginTop: 2 },
  priceText: { color: "#1a1030", fontWeight: "900", fontSize: 12 },
  altar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1.5,
    borderColor: "#CE93D8",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 5,
    backgroundColor: "rgba(206,147,216,0.1)",
  },
  altarText: { color: "#E1BEE7", fontWeight: "700", fontSize: 12, flexShrink: 1 },
  sub: { color: "#4FC3F7", fontWeight: "800", fontSize: 12, letterSpacing: 3 },
  door: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 2, borderRadius: 14, padding: 10 },
  doorText: { flex: 1, gap: 2 },
  doorName: { color: "#fff", fontWeight: "900", fontSize: 14 },
  doorRule: { color: "#bdb8d4", fontSize: 11 },
  biome: { color: "#80DEEA", fontWeight: "700", fontSize: 12, textAlign: "center" },
  go: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F2C14E",
    borderRadius: 20,
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderBottomWidth: 4,
    borderBottomColor: "#B07A1C",
  },
  goText: { color: "#1a1030", fontWeight: "900", fontSize: 16, letterSpacing: 2 },
});
