import React from "react";
import { StyleSheet, View } from "react-native";
import Text from "../../ui/components/Text";
import SpriteImage from "../../ui/components/SpriteImage";
import PressScale from "../../ui/components/PressScale";
import GameIcon from "../../ui/components/GameIcon";
import CosmeticPreview from "./CosmeticPreview";
import { useT } from "../../i18n/useT";
import { cosmeticText, heroText } from "../../i18n/keys";
import type { TranslationKey } from "../../i18n/en";
import type { LocalStats } from "../../core/stats/runStats";
import { SHOT_KIND, equippedCosmetic, type CosmeticKind } from "../../core/cosmetics/cosmetics";
import { WEAPONS, weaponOfHero, type WeaponId } from "../../core/engine/weapons";
import { AMMO_ART } from "../../ui/weaponArt";
import characters from "../../data/characters";
import { skinArt } from "../../data/skinArt";
import { equippedSkin } from "../../core/skins/ownership";
import { haptic } from "../../shared/haptics";

/** The cosmetic kinds that dress a weapon's shot: arrow trails, orb styles, bomb styles. */
export type ShotKind = "trail" | "orb" | "bomb";
export const isShotKind = (k: string | undefined | null): k is ShotKind => k === "trail" || k === "orb" || k === "bomb";

const weaponOfKind = (kind: ShotKind): WeaponId => WEAPONS.find(w => SHOT_KIND[w] === kind)!;
/** Every hero who throws this weapon (the archers share the bow; Mira the orb; Bram the bomb). */
export const heroesOfKind = (kind: ShotKind): number[] => characters.map((_, h) => h).filter(h => weaponOfHero(h) === weaponOfKind(kind));

const KINDS: ShotKind[] = WEAPONS.map(w => SHOT_KIND[w] as ShotKind);

type Props = { kind: ShotKind; onKind: (k: ShotKind) => void; stats: LocalStats; portrait: React.ComponentProps<typeof CosmeticPreview>["portrait"] };

/**
 * The weapon switch on top of the Armas tab: Flechas · Orbes · Bombas, each with its ammo, the heroes who throw it and the
 * style it wears right now — one per weapon at a time, all three worn together.
 */
const WeaponSwitch = ({ kind, onKind, stats, portrait }: Props) => {
  const { t } = useT();
  const names = heroesOfKind(kind).map(h => heroText(t, h, "name")).join(" · ");
  return (
    <View style={styles.wrap}>
      <View style={styles.row} accessibilityRole="tablist">
        {KINDS.map(k => {
          const on = k === kind;
          const worn = equippedCosmetic(stats, k as CosmeticKind);
          const heroes = heroesOfKind(k);
          const label = t(`collection.cat.${k}` as TranslationKey);
          return (
            <PressScale
              key={k}
              onPress={() => {
                if (on) return;
                haptic.impact();
                onKind(k);
              }}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${label}: ${heroes.map(h => heroText(t, h, "name")).join(", ")}${worn ? `. ${t("collection.weapons.inUse")}: ${cosmeticText(t, worn)}` : ""}`}
              style={[styles.seg, on && styles.segOn]}
            >
              <SpriteImage source={AMMO_ART[weaponOfKind(k)]} style={styles.ammo} resizeMode="contain" accessibilityIgnoresInvertColors />
              <View style={styles.segMid}>
                <Text style={[styles.segLabel, on && styles.segLabelOn]} numberOfLines={1} maxFontSizeMultiplier={1.1}>
                  {label.toLocaleUpperCase()}
                </Text>
                <View style={styles.faces}>
                  {heroes.map((h, i) => (
                    <SpriteImage key={h} source={skinArt(h, equippedSkin(stats, h)).scoreImage} style={[styles.face, i > 0 && styles.faceStack, on && styles.faceOn]} resizeMode="cover" accessibilityIgnoresInvertColors />
                  ))}
                </View>
              </View>
              {/* The style this weapon wears now: every weapon keeps its own, so each switch shows one. */}
              {worn ? (
                <View style={styles.worn}>
                  <View style={styles.wornThumb}>
                    <CosmeticPreview id={worn} size={30} portrait={portrait} small />
                  </View>
                  <View style={styles.wornCheck}>
                    <GameIcon name="checkmark" size={9} color="#111" />
                  </View>
                </View>
              ) : null}
            </PressScale>
          );
        })}
      </View>
      <Text style={styles.hint} numberOfLines={1} maxFontSizeMultiplier={1.1}>
        {t("collection.weapons.hint", { names })}
      </Text>
    </View>
  );
};

export default WeaponSwitch;

const styles = StyleSheet.create({
  wrap: { gap: 4 },
  row: { flexDirection: "row", gap: 6 },
  seg: { flex: 1, flexDirection: "row", alignItems: "center", gap: 6, minHeight: 44, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 12, borderWidth: 1.5, borderColor: "rgba(207, 160, 82,0.4)", backgroundColor: "rgba(255,255,255,0.05)" },
  segOn: { borderColor: "#CFA052", backgroundColor: "rgba(207, 160, 82,0.22)" },
  ammo: { width: 26, height: 26 },
  segMid: { flex: 1, minWidth: 0, gap: 2 },
  segLabel: { color: "#EAE1D8", fontWeight: "900", fontSize: 12, letterSpacing: 0.8 },
  segLabelOn: { color: "#F3D79B" },
  faces: { flexDirection: "row" },
  face: { width: 15, height: 15, borderRadius: 8, borderWidth: 1, borderColor: "rgba(0,0,0,0.6)", opacity: 0.75 },
  faceStack: { marginLeft: -4 },
  faceOn: { opacity: 1 },
  worn: { width: 32, height: 32 },
  wornThumb: { width: 32, height: 32, borderRadius: 9, borderWidth: 1.5, borderColor: "#A3BF7C", backgroundColor: "rgba(0,0,0,0.35)", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  wornCheck: { position: "absolute", top: -4, right: -4, width: 14, height: 14, borderRadius: 7, backgroundColor: "#A3BF7C", alignItems: "center", justifyContent: "center" },
  hint: { color: "#CAB39C", fontSize: 11, fontWeight: "700" },
});
