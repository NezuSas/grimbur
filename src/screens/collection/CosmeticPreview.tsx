import React from "react";
import { ImageBackground, StyleSheet, View } from "react-native";
import Text from "../../ui/components/Text";
import SpriteImage from "../../ui/components/SpriteImage";
import { cosmeticInfo, type CosmeticId } from "../../core/cosmetics/cosmetics";
import { BIOME_ART } from "../../ui/biomeArt";
import { attackArtFor, BOARD_BIOME, CELEBRATION_LOOKS, FLAG_ART, FRAME_ART, PET_ART, PET_TINT, petLook } from "../../ui/cosmeticArt";
import Companion from "../../ui/components/game/Companion";
import GemShower from "../../ui/components/game/GemShower";
import { PlayerPortrait } from "../../ui/components/PlayerPortrait";
import TrailPreview from "./TrailPreview";
import OrbPreview from "./OrbPreview";
import BombPreview from "./BombPreview";
import { useSettingsStore } from "../../state/settings/store";
import { useT } from "../../i18n/useT";
import { cosmeticText } from "../../i18n/keys";
import type { ImageSourcePropType } from "react-native";
import { WEAPONS, weaponOfHero } from "../../core/engine/weapons";

type Props = {
  id: CosmeticId;
  /** The box the preview fills (a square of this side). */
  size: number;
  /** The player's own portrait (frames go around it, titles under it). */
  portrait: ImageSourcePropType;
  /** The player's name, for the title preview. */
  playerName?: string;
  /** Small previews (grid cards) skip the moving parts and the text. */
  small?: boolean;
  /** The frame the player wears, drawn around the portrait of a title preview. */
  frame?: CosmeticId;
  /** A companion's growth stage (its adult form, its aura). */
  petStage?: number;
};

/** What a cosmetic looks like, as the player will see it: an arrow, orb or bomb in flight, a framed portrait, a title, a patch of floor. */
const CosmeticPreview = ({ id, size, portrait, playerName, small, frame, petStage = 0 }: Props) => {
  const { t } = useT();
  const calm = useSettingsStore(s => s.reduceFlash);
  // An attack skin is shown on the weapon of the hero the player last picked (it changes with the champion, as in a run).
  const lastHero = useSettingsStore(s => s.lastHero);
  const kind = cosmeticInfo(id).kind;
  if (kind === "trail") return <TrailPreview id={id} size={size} small={small} />;
  if (kind === "orb") return <OrbPreview id={id} size={size} small={small} />;
  if (kind === "bomb") return <BombPreview id={id} size={size} small={small} />;
  if (kind === "frame") {
    return (
      <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
        <View style={{ width: size * 0.66, height: size * 0.66, borderRadius: size, overflow: "hidden", backgroundColor: "rgba(0,0,0,0.35)" }}>
          <SpriteImage source={portrait} style={{ width: "100%", height: "100%" }} resizeMode="cover" accessibilityIgnoresInvertColors />
        </View>
        <SpriteImage source={FRAME_ART[id]!} style={[StyleSheet.absoluteFill, { width: size, height: size }]} resizeMode="contain" accessibilityIgnoresInvertColors />
      </View>
    );
  }
  if (kind === "title") {
    // The portrait takes whatever the name and the plate leave, so the three always fit the box.
    const nameFont = Math.min(22, Math.max(13, size * 0.1));
    const plateFont = Math.min(18, Math.max(small ? 9 : 11, size * (small ? 0.09 : 0.07)));
    const gap = Math.max(3, size * 0.03);
    const lines = cosmeticText(t, id).length * plateFont * 0.72 > size * 0.85 ? 2 : 1;
    const words = small ? 0 : (playerName ? nameFont * 1.3 + gap : 0) + plateFont * 1.35 * lines + 10 + gap;
    const face = small ? size * 0.5 : Math.max(36, Math.min(size * 0.72, size - words));
    // A small plate only holds a short title: below this the words would be cut.
    const tiny = small && cosmeticText(t, id).length * plateFont * 0.62 > size * 0.95;
    return (
      <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center", gap }}>
        {!small && frame ? (
          <PlayerPortrait source={portrait} size={face} frame={frame} />
        ) : (
          <View style={{ width: small ? size * 0.5 : face * 0.88, height: small ? size * 0.5 : face * 0.88, borderRadius: size, overflow: "hidden", borderWidth: 2, borderColor: "rgba(207, 160, 82,0.7)" }}>
            <SpriteImage source={portrait} style={{ width: "100%", height: "100%" }} resizeMode="cover" accessibilityIgnoresInvertColors />
          </View>
        )}
        {!small && playerName ? (
          <Text style={[styles.titleName, { fontSize: nameFont }]} numberOfLines={1} maxFontSizeMultiplier={1.1}>
            {playerName}
          </Text>
        ) : null}
        <View style={[styles.titlePlate, { paddingHorizontal: size * 0.05 }]}>
          {tiny ? (
            // Too small a plate for the words (the title is written beside it): an ornament stands for them.
            <View style={[styles.titleOrnament, { width: size * 0.5, height: Math.max(6, size * 0.1) }]}>
              <View style={styles.ornamentLine} />
              <View style={[styles.ornamentGem, { width: size * 0.07, height: size * 0.07 }]} />
              <View style={styles.ornamentLine} />
            </View>
          ) : (
            <Text style={[styles.titleText, { fontSize: plateFont, textAlign: "center" }]} numberOfLines={small ? 1 : 2} adjustsFontSizeToFit minimumFontScale={0.6} maxFontSizeMultiplier={1.1}>
              {cosmeticText(t, id).toLocaleUpperCase()}
            </Text>
          )}
        </View>
      </View>
    );
  }
  if (kind === "flag") {
    // The flag planted on a fogged tile, as it marks danger on the board.
    const tile = size * 0.72;
    return (
      <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
        <SpriteImage source={BIOME_ART.cave.tileHidden} style={{ width: tile, height: tile }} resizeMode="stretch" accessibilityIgnoresInvertColors />
        <SpriteImage source={FLAG_ART[id]!} style={{ position: "absolute", width: tile * 0.98, height: tile * 0.98 }} resizeMode="contain" accessibilityIgnoresInvertColors />
      </View>
    );
  }
  if (kind === "attack") {
    const weapon = weaponOfHero(Math.max(0, lastHero ?? 0));
    const others = WEAPONS.filter(w => w !== weapon);
    const chip = size * 0.26;
    return (
      <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
        <SpriteImage source={attackArtFor(id, weapon)!} style={{ width: size * (small ? 0.82 : 0.74), height: size * (small ? 0.82 : 0.74) }} resizeMode="contain" accessibilityIgnoresInvertColors />
        {/* The big preview also shows the same skin on the other two weapons: one purchase dresses every hero. */}
        {small ? null : (
          <View style={{ position: "absolute", right: 0, bottom: 0, gap: Math.max(2, size * 0.02) }}>
            {others.map(w => (
              <View key={w} style={[styles.attackChip, { width: chip, height: chip, borderRadius: chip / 2 }]}>
                <SpriteImage source={attackArtFor(id, w)!} style={{ width: chip * 0.92, height: chip * 0.92 }} resizeMode="contain" accessibilityIgnoresInvertColors />
              </View>
            ))}
          </View>
        )}
      </View>
    );
  }
  if (kind === "pet") {
    // The hero's portrait with the companion floating at its shoulder.
    const look = petLook(id, petStage) ?? PET_ART[id]!;
    return (
      <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
        <View style={{ width: size * 0.56, height: size * 0.56, borderRadius: size, overflow: "hidden", borderWidth: 2, borderColor: "rgba(207, 160, 82,0.7)", marginTop: size * 0.12 }}>
          <SpriteImage source={portrait} style={{ width: "100%", height: "100%" }} resizeMode="cover" accessibilityIgnoresInvertColors />
        </View>
        <View style={{ position: "absolute", right: size * 0.04, top: size * 0.02 }}>
          <Companion look={look} size={size * 0.46} calm={small || calm} aura={petStage >= 1 ? PET_TINT[id] ?? null : null} />
        </View>
      </View>
    );
  }
  if (kind === "celebration") {
    // The hero in the lair, with the celebration playing around them (a still scatter of its pieces on a small card).
    const look = CELEBRATION_LOOKS[id]!;
    return (
      <ImageBackground source={require("../../assets/sprites/backgrounds/Bg_Lair.jpg")} style={{ width: size, height: size, alignItems: "center", justifyContent: "center", borderRadius: 16, overflow: "hidden" }} resizeMode="cover">
        <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(10,7,4,0.35)" }]} />
        <View style={{ width: size * 0.42, height: size * 0.42, borderRadius: size, overflow: "hidden", borderWidth: 2, borderColor: "rgba(207, 160, 82,0.7)" }}>
          <SpriteImage source={portrait} style={{ width: "100%", height: "100%" }} resizeMode="cover" accessibilityIgnoresInvertColors />
        </View>
        {small || calm ? (
          [0, 1, 2, 3, 4].map(i => (
            <SpriteImage
              key={i}
              source={look.sprites[i % look.sprites.length]}
              style={{ position: "absolute", left: size * [0.1, 0.7, 0.18, 0.66, 0.42][i], top: size * [0.12, 0.16, 0.66, 0.62, 0.04][i], width: size * 0.2, height: size * (look.motion === "volley" ? 0.08 : 0.2), transform: [{ rotate: `${[-20, 25, 10, -15, 0][i]}deg` }] }}
              resizeMode="contain"
              accessibilityIgnoresInvertColors
            />
          ))
        ) : (
          <GemShower look={look} width={size} height={size} count={18} loop />
        )}
      </ImageBackground>
    );
  }
  // A board theme: a two-by-two patch of its floor (unexplored and explored) on its backdrop.
  const art = BIOME_ART[BOARD_BIOME[id]!];
  const tile = size * 0.34;
  return (
    <ImageBackground source={art.background} style={{ width: size, height: size, alignItems: "center", justifyContent: "center", borderRadius: 16, overflow: "hidden" }} resizeMode="cover">
      <View style={{ width: tile * 2, flexDirection: "row", flexWrap: "wrap" }}>
        {[art.tileHidden, art.tileRevealed, art.tileRevealed, art.tileHidden].map((src, i) => (
          <SpriteImage key={i} source={src} style={{ width: tile, height: tile }} resizeMode="stretch" accessibilityIgnoresInvertColors />
        ))}
      </View>
    </ImageBackground>
  );
};

export default CosmeticPreview;

const styles = StyleSheet.create({
  titleName: { color: "#F3EADB", fontWeight: "900" },
  titlePlate: { borderRadius: 8, paddingVertical: 3, backgroundColor: "rgba(40,26,10,0.9)", borderWidth: 1.5, borderColor: "#CFA052", maxWidth: "100%" },
  titleText: { color: "#C9A55A", fontWeight: "900", letterSpacing: 1 },
  titleOrnament: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 3 },
  ornamentLine: { flex: 1, height: 1.5, borderRadius: 1, backgroundColor: "#C9A55A" },
  attackChip: { alignItems: "center", justifyContent: "center", backgroundColor: "rgba(20,14,8,0.85)", borderWidth: 1.5, borderColor: "rgba(207, 160, 82,0.7)" },
  ornamentGem: { transform: [{ rotate: "45deg" }], backgroundColor: "#C9A55A" },
});
