import React, { useEffect, useState } from "react";
import { ImageBackground, Pressable, StyleSheet, TouchableOpacity, View } from "react-native";
import { useWindowDimensions } from "../../layout/scaledWindow";
import type { ImageSourcePropType } from "react-native";
import GameIcon from "../GameIcon";
import { LinearGradient } from "expo-linear-gradient";
import SpriteImage from "../SpriteImage";
import { ALTAR_ART, SHOP_ART } from "../../toolArt";
import { BIOME_ART } from "../../biomeArt";
import Text from "../Text";
import OverlayContainer from "./OverlayContainer";
import { PopButton, PopupPanel, popupTitleStyle } from "./popup";
import { useT } from "../../../i18n/useT";
import { omenText } from "../../../i18n/keys";
import { SHOP_ITEMS, SHOP_PRICES, MAX_ITEMS, MERCHANT_ARROWS, MERCHANT_GEMS, type Door, type ShopItem } from "../../../core/engine/shop";
import type { BiomeId } from "../../../core/engine/biomes";
import type { TranslationKey } from "../../../i18n/en";

const ITEM_COLOR: Record<ShopItem, string> = { arrows: "#C99A5C", shield: "#7FAFC6", detector: "#8EAE7C", bomb: "#B86A48" };
const GEM = require("../../../assets/sprites/items/Icon_Gem.webp");
/** What the hero carries into the next floor, shown beside the shop so a buy is never blind. */
const CARRY: readonly ShopItem[] = ["arrows", "shield", "detector", "bomb"];
/** Each omen's door wears the art and colour of what it brings. */
const MERCHANT_ART = require("../../../assets/sprites/items/Icon_Merchant.webp");
const OMEN_LOOK: Record<string, { art: ImageSourcePropType; color: string }> = {
  bounty: { art: require("../../../assets/sprites/items/Icon_Gem.webp"), color: "#7FAFC6" },
  calm: { art: require("../../../assets/sprites/relics/lantern.webp"), color: "#A3BF7C" },
  arsenal: { art: require("../../../assets/sprites/items/Icon_Arrows.webp"), color: "#D28663" },
  dark: { art: require("../../../assets/sprites/items/Icon_Darkness.webp"), color: "#7E87B0" },
  shortcut: { art: require("../../../assets/sprites/items/Icon_Shortcut.webp"), color: "#A1887F" },
  elite: { art: require("../../../assets/sprites/ui/Icon_Skull.webp"), color: "#B5524A" },
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
  /** Arrows the hero carries (the blood merchant buys two). */
  arrows?: number;
  merchantUsed?: boolean;
  onSell?: () => void;
  onGo: () => void;
};

/**
 * Between two floors, over the next cave: the way down so far and the gems on top, the shop as four cards with the ware
 * big, and below the two doors as portals in the colour of their omen (or the floor ahead) beside the button down.
 */
const IntermissionOverlay = ({ visible, nextFloor, nextIsLair, newBiome, gems, shield, items, doors, chosen, onChoose, onBuy, altarUsed, altarFree, onAltar, onGo, arrows = 0, merchantUsed = false, onSell }: Props) => {
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
  // The shortcut lands one floor deeper than the next one.
  const landing = doors && chosen !== null && chosen !== undefined && doors[chosen] === "shortcut" ? nextFloor + 1 : nextFloor;
  const goLabel = nextIsLair ? t("shop.goLair") : t("shop.go", { floor: landing });
  // The doors to draw: the two of the fork, or a single one showing the floor ahead.
  const portals: { key: string; door?: Door; fork: boolean }[] = doors ? doors.map((door, i) => ({ key: `d${i}`, door, fork: true })) : [{ key: "ahead", fork: false }];

  return (
    <OverlayContainer>
      <PopupPanel
        tint="#C9A55A"
        width={cardW}
        style={styles.card}
        backdrop={
          <>
            <ImageBackground source={biomeArt.background} style={StyleSheet.absoluteFill} resizeMode="cover" imageStyle={{ opacity: 0.32 }} />
            <LinearGradient colors={["rgba(40,28,16,0.78)", "rgba(16,11,7,0.96)"]} style={StyleSheet.absoluteFill} pointerEvents="none" />
          </>
        }
      >

        {/* ── Header: the way down so far, and the gems to spend ─────────────── */}
        <View style={styles.header}>
          <View style={styles.journey}>
            <Text style={styles.journeyFrom} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} maxFontSizeMultiplier={1.1}>
              {t("floor.banner", { n: nextFloor - 1 }).toLocaleUpperCase()}
            </Text>
            <GameIcon name="chevron-forward" size={16} color="#B99A7C" />
            <Text style={styles.journeyTo} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} maxFontSizeMultiplier={1.1}>
              {(nextIsLair ? t("floor.banner.lair") : t("floor.banner", { n: landing })).toLocaleUpperCase()}
            </Text>
          </View>
          <Text style={[popupTitleStyle("#C9A55A"), styles.title]} accessibilityRole="header" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} maxFontSizeMultiplier={1.15}>
            {t("shop.title").toLocaleUpperCase()}
          </Text>
          <View style={styles.purse} accessible accessibilityLabel={t("shop.purse", { count: gems })}>
            <SpriteImage source={GEM} style={{ width: 22, height: 22 }} resizeMode="contain" />
            <Text style={styles.purseText} maxFontSizeMultiplier={1.15}>
              {gems}
            </Text>
          </View>
        </View>

        {/* ── The shop: what the hero carries, then four cards (the ware big beside its words) ── */}
        <View style={styles.sectionRow}>
          <Text style={styles.section} maxFontSizeMultiplier={1.1}>{t("shop.section").toLocaleUpperCase()}</Text>
          <View style={styles.sectionLine} />
          <Text style={styles.carryLabel} maxFontSizeMultiplier={1.1}>{t("shop.carry").toLocaleUpperCase()}</Text>
          {CARRY.map(c => {
            const have = c === "arrows" ? arrows : c === "shield" ? (shield ? 1 : 0) : items[c];
            return (
              <View key={c} style={[styles.carry, have === 0 && { opacity: 0.45 }]} accessible accessibilityLabel={`${t(`shop.${c}.name` as TranslationKey)}: ${have}`}>
                <SpriteImage source={SHOP_ART[c]} style={{ width: 20, height: 20 }} resizeMode="contain" />
                <Text style={styles.carryText} allowFontScaling={false}>
                  {c === "shield" ? (shield ? "✓" : "–") : c === "arrows" ? `${have}` : `${have}/${MAX_ITEMS}`}
                </Text>
              </View>
            );
          })}
        </View>
        <View style={[styles.shop, narrow && { flexWrap: "wrap" }]}>
          {SHOP_ITEMS.map(item => {
            const price = SHOP_PRICES[item];
            const blocked = reason(item);
            const short = Math.max(0, price - gems);
            const canBuy = short === 0 && !blocked;
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
                style={({ pressed }) => [styles.ware, narrow && { flexBasis: "47%" }, { borderColor: canBuy ? color + "CC" : "rgba(255,255,255,0.08)" }, !canBuy && styles.wareOff, pressed && { transform: [{ scale: 0.96 }] }]}
              >
                <View style={[styles.wareGlow, { backgroundColor: color, opacity: canBuy ? 0.2 : 0.04 }]} />
                <SpriteImage source={SHOP_ART[item]} style={[styles.wareArt, !canBuy && { opacity: 0.35 }]} resizeMode="contain" />
                <View style={styles.wareBody}>
                  <Text style={[styles.wareName, { color: canBuy ? "#F3EADB" : "#9E8E80" }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} maxFontSizeMultiplier={1.1}>
                    {name}
                  </Text>
                  <Text style={[styles.wareDesc, !canBuy && { color: "#8F7F72" }]} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.7} maxFontSizeMultiplier={1.05}>
                    {desc}
                  </Text>
                  <View style={styles.wareFoot}>
                    {blocked ? (
                      <Text style={styles.wareBlocked} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} maxFontSizeMultiplier={1.05}>{blocked}</Text>
                    ) : (
                      <View style={[styles.wareBuy, { backgroundColor: canBuy ? color : "rgba(255,255,255,0.08)" }]}>
                        <SpriteImage source={GEM} style={{ width: 13, height: 13 }} resizeMode="contain" />
                        <Text style={[styles.wareBuyText, !canBuy && { color: "#C9B49C" }]} allowFontScaling={false}>
                          {price}
                        </Text>
                      </View>
                    )}
                    {!blocked && short > 0 ? (
                      <Text style={styles.wareShort} numberOfLines={1} maxFontSizeMultiplier={1.05}>{t("shop.short", { n: short })}</Text>
                    ) : null}
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.deals}>
        {onSell && (arrows >= MERCHANT_ARROWS || merchantUsed) ? (
          <TouchableOpacity
            disabled={merchantUsed}
            onPress={onSell}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={`${t("shop.merchant.name")}. ${t("shop.merchant.desc", { arrows: MERCHANT_ARROWS, gems: MERCHANT_GEMS })}`}
            style={[styles.altar, styles.merchant, merchantUsed && { opacity: 0.55 }]}
          >
            <SpriteImage source={MERCHANT_ART} style={{ width: 30, height: 30 }} resizeMode="contain" />
            <View style={{ flex: 1 }}>
              <Text style={[styles.dealName, { color: "#E9B3AA" }]} numberOfLines={1} maxFontSizeMultiplier={1.1}>{t("shop.merchant.name")}</Text>
              <Text style={styles.altarText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} maxFontSizeMultiplier={1.1}>
                {merchantUsed ? t("shop.merchant.done") : t("shop.merchant.desc", { arrows: MERCHANT_ARROWS, gems: MERCHANT_GEMS })}
              </Text>
            </View>
            {merchantUsed ? null : (
              <View style={[styles.dealAction, { backgroundColor: "#C47268" }]}>
                <Text style={styles.dealActionText} maxFontSizeMultiplier={1.05}>{t("shop.merchant.sell").toLocaleUpperCase()}</Text>
              </View>
            )}
          </TouchableOpacity>
        ) : null}
        {(shield || altarUsed) && !altarFree ? (
          <TouchableOpacity
            disabled={!shield || altarUsed}
            onPress={onAltar}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={`${t("shop.altar.name")}. ${t("shop.altar.desc")}`}
            style={[styles.altar, altarUsed && { opacity: 0.55 }]}
          >
            <SpriteImage source={ALTAR_ART} style={{ width: 30, height: 30 }} resizeMode="contain" />
            <View style={{ flex: 1 }}>
              <Text style={[styles.dealName, { color: "#CDB0DA" }]} numberOfLines={1} maxFontSizeMultiplier={1.1}>{t("shop.altar.name")}</Text>
              <Text style={styles.altarText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} maxFontSizeMultiplier={1.1}>
                {altarUsed ? t("shop.altar.done") : t("shop.altar.desc")}
              </Text>
            </View>
            {altarUsed ? null : (
              <View style={[styles.dealAction, { backgroundColor: "#B08DBE" }]}>
                <Text style={styles.dealActionText} maxFontSizeMultiplier={1.05}>{t("shop.altar.offer").toLocaleUpperCase()}</Text>
              </View>
            )}
          </TouchableOpacity>
        ) : null}
        </View>

        <View style={styles.sectionRow}>
          <Text style={styles.section} maxFontSizeMultiplier={1.1}>{(doors ? t("shop.choose") : t("shop.ahead")).toLocaleUpperCase()}</Text>
          <View style={styles.sectionLine} />
        </View>
        {/* ── The way on: two portals (or the floor ahead) and the button ───── */}
        <View style={[styles.wayRow, narrow && { flexDirection: "column" }]}>
          <View style={styles.doors}>
            {portals.map((p, i) => {
              const on = !p.fork || chosen === i;
              const look = p.door ? OMEN_LOOK[p.door] ?? { art: biomeArt.tileHidden, color: "#C9B49C" } : { art: biomeArt.tileHidden, color: p.fork ? "#C9B49C" : "#C9A55A" };
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
                    <Text style={[styles.portalName, { color: on ? look.color : "#D6C4B2" }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} maxFontSizeMultiplier={1.1}>
                      {name.toLocaleUpperCase()}
                    </Text>
                    <Text style={styles.portalRule} numberOfLines={3} adjustsFontSizeToFit minimumFontScale={0.7} maxFontSizeMultiplier={1.05}>
                      {rule}
                    </Text>
                  </View>
                  {p.fork && on ? (
                    <View style={[styles.portalCheck, { backgroundColor: look.color }]}>
                      <GameIcon name="checkmark" size={13} color="#1A0F04" />
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
          <View style={[styles.go, narrow && { width: "100%" }]}>
            <PopButton label={goLabel} icon="arrow-forward" onPress={onGo} disabled={!armed} enterKey />
          </View>
        </View>
        {doors && biomeLine ? (
          <Text style={styles.biome} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} maxFontSizeMultiplier={1.05}>
            {biomeLine}
          </Text>
        ) : null}
      </PopupPanel>
    </OverlayContainer>
  );
};

export default IntermissionOverlay;

const styles = StyleSheet.create({
  card: { paddingHorizontal: 14, paddingVertical: 12, gap: 9, alignItems: "stretch" },
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  journey: { flex: 1, flexDirection: "row", alignItems: "center", gap: 4 },
  journeyFrom: { color: "#B99A7C", fontWeight: "900", fontSize: 12, letterSpacing: 1.2 },
  journeyTo: { color: "#EAD8A8", fontWeight: "900", fontSize: 12, letterSpacing: 1.2 },
  title: { flexShrink: 1 },
  purse: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 6 },
  purseText: { color: "#F3EADB", fontWeight: "900", fontSize: 20, textShadowColor: "rgba(127, 175, 198,0.6)", textShadowRadius: 8 },
  sectionRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: -4 },
  section: { color: "#C9A55A", fontWeight: "900", fontSize: 11, letterSpacing: 2 },
  sectionLine: { flex: 1, height: 1, backgroundColor: "rgba(201,165,90,0.25)" },
  carryLabel: { color: "#B99A7C", fontWeight: "900", fontSize: 10.5, letterSpacing: 1.5 },
  carry: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, backgroundColor: "rgba(0,0,0,0.4)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  carryText: { color: "#F3EADB", fontWeight: "900", fontSize: 12 },
  shop: { flexDirection: "row", gap: 8 },
  ware: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8, paddingLeft: 8, paddingRight: 6, borderRadius: 16, borderWidth: 1.5, backgroundColor: "rgba(0,0,0,0.38)", overflow: "hidden" },
  wareOff: { backgroundColor: "rgba(0,0,0,0.5)" },
  wareGlow: { position: "absolute", left: -24, width: 96, height: 96, borderRadius: 48 },
  wareArt: { width: 52, height: 52 },
  wareBody: { flex: 1, gap: 1 },
  wareName: { fontWeight: "900", fontSize: 14 },
  wareDesc: { color: "#CAB39C", fontSize: 11, fontWeight: "600", lineHeight: 14, minHeight: 28 },
  wareFoot: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 3 },
  wareBuy: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  wareBuyText: { color: "#1a1200", fontWeight: "900", fontSize: 13.5 },
  wareShort: { flexShrink: 1, color: "#D58A7E", fontWeight: "800", fontSize: 10.5 },
  wareBlocked: { flexShrink: 1, color: "#A3BF7C", fontWeight: "800", fontSize: 11.5 },
  dealName: { fontWeight: "900", fontSize: 12.5 },
  dealAction: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  dealActionText: { color: "#1A0F04", fontWeight: "900", fontSize: 11.5, letterSpacing: 1 },
  deals: { flexDirection: "row", gap: 8 },
  merchant: { borderColor: "#C47268", backgroundColor: "rgba(229,115,115,0.12)" },
  altar: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 14, borderWidth: 1.5, borderColor: "#B08DBE", backgroundColor: "rgba(176, 141, 190,0.12)" },
  altarText: { color: "#D3C2D8", fontWeight: "700", fontSize: 11.5 },
  wayRow: { flexDirection: "row", alignItems: "stretch", gap: 10 },
  doors: { flex: 1, flexDirection: "row", gap: 8 },
  portal: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10, padding: 8, borderRadius: 16, borderWidth: 2, backgroundColor: "rgba(0,0,0,0.32)" },
  portalArch: { width: 50, height: 60, borderTopLeftRadius: 25, borderTopRightRadius: 25, borderBottomLeftRadius: 6, borderBottomRightRadius: 6, borderWidth: 2, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.45)" },
  portalArt: { width: 36, height: 36 },
  portalName: { fontWeight: "900", fontSize: 13, letterSpacing: 1 },
  portalRule: { color: "#D7C6B5", fontSize: 11.5, lineHeight: 15 },
  portalCheck: { position: "absolute", top: 6, right: 6, width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  go: { width: 210, justifyContent: "center" },
  biome: { color: "#8FC0C5", fontWeight: "700", fontSize: 12, textAlign: "center" },
});
