import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { useWindowDimensions } from "../../layout/scaledWindow";
import type { ImageSourcePropType } from "react-native";
import Text from "../Text";
import SpriteImage from "../SpriteImage";
import OverlayContainer from "./OverlayContainer";
import GamblerDie from "./GamblerDie";
import EncounterReveal, { revealArts } from "./EncounterReveal";
import { PopButton, PopLink, PopupPanel, popupTitleStyle } from "./popup";
import { useT } from "../../../i18n/useT";
import type { TranslationKey } from "../../../i18n/en";
import {
  GAMBLER_PAYOUT,
  GAMBLER_STAKE,
  GAMBLER_WIN_FROM,
  SCOUT_ARROWS,
  SCOUT_TILES,
  SHRINE_ARROWS,
  SPRING_LOSS,
  MINER_GEMS,
  MAP_GEMS,
  SMITH_ARROWS,
  canTake,
  type Encounter,
  type EncounterId,
} from "../../../core/engine/encounters";
import type { GameState } from "../../../core/engine/types";
import { scaleAmmo, weaponOf, type WeaponId } from "../../../core/engine/weapons";
import { weaponLine } from "../../../i18n/weaponText";

/** The picture and colour of each scene. */
export const ENCOUNTER_ART: Record<EncounterId, ImageSourcePropType> = {
  scout: require("../../../assets/sprites/encounters/Encounter_Scout.webp"),
  spring: require("../../../assets/sprites/encounters/Encounter_Spring.webp"),
  gambler: require("../../../assets/sprites/encounters/Encounter_Gambler.webp"),
  shrine: require("../../../assets/sprites/encounters/Encounter_Shrine.webp"),
  miner: require("../../../assets/sprites/encounters/Encounter_Miner.webp"),
  map: require("../../../assets/sprites/encounters/Encounter_Map.webp"),
  echo: require("../../../assets/sprites/encounters/Encounter_Echo.webp"),
  smith: require("../../../assets/sprites/encounters/Encounter_Smith.webp"),
};
export const ENCOUNTER_TINT: Record<EncounterId, string> = {
  scout: "#A3BF7C",
  spring: "#7FAFC6",
  gambler: "#C9A55A",
  shrine: "#B08DBE",
  miner: "#C99A5C",
  map: "#E8C07D",
  echo: "#8FC0C5",
  smith: "#D28663",
};

export const ENCOUNTER_PARAMS = { arrows: SCOUT_ARROWS, tiles: SCOUT_TILES, loss: SPRING_LOSS, stake: GAMBLER_STAKE, payout: GAMBLER_PAYOUT, winFrom: GAMBLER_WIN_FROM, shrine: SHRINE_ARROWS, minerGems: MINER_GEMS, mapGems: MAP_GEMS, smith: SMITH_ARROWS };

/** The scene's numbers in the hero's ammo: a bomber pays and gets half (see scaleAmmo). */
export const encounterParams = (weapon: WeaponId) => ({ ...ENCOUNTER_PARAMS, arrows: scaleAmmo(weapon, SCOUT_ARROWS), smith: scaleAmmo(weapon, SMITH_ARROWS) });

type Props = {
  encounter: Encounter;
  state: Pick<GameState, "attack" | "gems" | "items" | "shield" | "entities" | "rows" | "cols" | "visited" | "playerIndex"> & Partial<Pick<GameState, "perks">>;
  onChoose: (take: boolean) => void;
  onClose: () => void;
};

/**
 * The scene that opens a floor: a picture, a few lines, what taking it costs and what it may give, and two ways out (take it, or
 * walk past). Once chosen, the same card tells what happened and lets the floor begin.
 */
const EncounterModal = ({ encounter, state, onChoose, onClose }: Props) => {
  const { t } = useT();
  const { width, height } = useWindowDimensions();
  const { id, outcome } = encounter;
  const tint = ENCOUNTER_TINT[id];
  const affordable = canTake(id, state);
  // The scene speaks of the hero's own ammo (orbs, bombs) where it differs from the arrows.
  const weapon: WeaponId = state.perks ? weaponOf({ perks: state.perks }) : "bow";
  const params = encounterParams(weapon);
  const k = (part: string) => `encounter.${id}.${part}` as TranslationKey;
  const say = (part: string, extra?: Record<string, string | number>) => weaponLine(t, k(part), weapon, { ...params, ...extra });
  const artSize = Math.min(height * 0.36, 150);
  const wide = width > height;

  const relicName = encounter.relic ? t(`relic.${encounter.relic}.name` as TranslationKey) : "";
  // What came of the scene is shown before it is told: the gambler's die tumbles, every other scene plays its exchange
  // (what was paid, then what it brought, after a moment of suspense when luck was in play).
  const rolled = id === "gambler" && (outcome === "win" || outcome === "lose") && encounter.die != null;
  const revealed = !!outcome && outcome !== "skip" && id !== "gambler";
  const [landed, setLanded] = useState(false);
  const rolling = (rolled || revealed) && !landed;
  const resultText =
    outcome === "skip"
      ? t("encounter.skipped")
      : rolling
        ? rolled ? t("encounter.gambler.rolling") : say("acting")
        : outcome
          ? say(outcome === "done" && encounter.gift === "bomb" ? "doneBomb" : outcome, { relic: relicName, die: encounter.die ?? 0, path: encounter.tiles ?? 0 })
          : null;

  return (
    <OverlayContainer>
      <PopupPanel tint={tint} width={Math.min(width * 0.9, 620)} style={wide ? styles.row : undefined}>
        {/* The exchange's pictures, warmed while the choice is open (unseen). */}
        {!outcome ? (
          <View pointerEvents="none" style={styles.warm}>
            {revealArts(id, weapon).map((art, i) => (
              <SpriteImage key={i} source={art} style={styles.warmImage} />
            ))}
          </View>
        ) : null}
        <View style={[styles.artBox, { width: artSize, height: artSize, borderColor: tint, backgroundColor: tint + "1F" }]}>
          <SpriteImage source={ENCOUNTER_ART[id]} style={{ width: artSize * 0.96, height: artSize * 0.96 }} resizeMode="contain" />
        </View>
        <View style={[styles.texts, wide && { flex: 1, alignItems: "flex-start" }]}>
          <Text style={[styles.kicker, { color: tint }]} maxFontSizeMultiplier={1.1}>
            {t("encounter.kicker").toLocaleUpperCase()}
          </Text>
          <Text style={[popupTitleStyle(tint), wide && { textAlign: "left" }]} maxFontSizeMultiplier={1.15}>
            {t(k("title")).toLocaleUpperCase()}
          </Text>
          {rolled ? (
            <View style={[styles.dieRow, wide && { alignSelf: "flex-start" }]}>
              <GamblerDie face={encounter.die!} size={Math.min(56, artSize * 0.42)} rim={tint} won={outcome === "win"} onLanded={() => setLanded(true)} />
            </View>
          ) : revealed ? (
            <View style={[styles.dieRow, wide && { alignSelf: "flex-start" }]}>
              <EncounterReveal encounter={encounter} tint={tint} size={Math.min(46, artSize * 0.34)} onLanded={() => setLanded(true)} weapon={weapon} />
            </View>
          ) : null}
          <Text
            style={[
              styles.line,
              wide && { textAlign: "left" },
              (rolled || revealed) && landed && (outcome === "win" || outcome === "lose") && { color: outcome === "win" ? "#A3BF7C" : "#D58A7E" },
            ]}
            maxFontSizeMultiplier={1.15}
          >
            {resultText ?? say("body")}
          </Text>
          {outcome ? (
            <PopButton label={t("encounter.go")} onPress={onClose} disabled={rolling} style={[styles.button, rolling && { opacity: 0 }]} />
          ) : (
            <>
              <PopButton label={say("take")} onPress={() => onChoose(true)} disabled={!affordable} tint={tint} style={styles.button} />
              {!affordable ? (
                <Text style={styles.cant} maxFontSizeMultiplier={1.1}>
                  {say("cant")}
                </Text>
              ) : null}
              <PopLink label={t("encounter.leave")} onPress={() => onChoose(false)} />
            </>
          )}
        </View>
      </PopupPanel>
    </OverlayContainer>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 18 },
  artBox: { borderRadius: 999, borderWidth: 2, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  texts: { alignItems: "center", gap: 6, alignSelf: "stretch" },
  kicker: { fontSize: 11, fontWeight: "900", letterSpacing: 2 },
  line: { color: "#EADBC8", fontSize: 13.5, fontWeight: "700", textAlign: "center", lineHeight: 19 },
  cant: { color: "#D58A7E", fontSize: 11.5, fontWeight: "800" },
  button: { alignSelf: "stretch", marginTop: 4 },
  dieRow: { alignSelf: "center", marginVertical: -4 },
  warm: { position: "absolute", width: 1, height: 1, opacity: 0, overflow: "hidden" },
  warmImage: { width: 1, height: 1 },
});

export default EncounterModal;
