import React from "react";
import { StyleSheet, View } from "react-native";
import { useWindowDimensions } from "../../layout/scaledWindow";
import type { ImageSourcePropType } from "react-native";
import Text from "../Text";
import SpriteImage from "../SpriteImage";
import OverlayContainer from "./OverlayContainer";
import { PopButton, PopLink, PopupPanel, popupTitleStyle } from "./popup";
import { useT } from "../../../i18n/useT";
import type { TranslationKey } from "../../../i18n/en";
import {
  GAMBLER_PAYOUT,
  GAMBLER_STAKE,
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

export const ENCOUNTER_PARAMS = { arrows: SCOUT_ARROWS, tiles: SCOUT_TILES, loss: SPRING_LOSS, stake: GAMBLER_STAKE, payout: GAMBLER_PAYOUT, shrine: SHRINE_ARROWS, minerGems: MINER_GEMS, mapGems: MAP_GEMS, smith: SMITH_ARROWS };

type Props = {
  encounter: Encounter;
  state: Pick<GameState, "attack" | "gems" | "items" | "shield" | "entities" | "rows" | "cols" | "visited" | "playerIndex">;
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
  const k = (part: string) => `encounter.${id}.${part}` as TranslationKey;
  const artSize = Math.min(height * 0.36, 150);
  const wide = width > height;

  const relicName = encounter.relic ? t(`relic.${encounter.relic}.name` as TranslationKey) : "";
  const resultText = outcome === "skip" ? t("encounter.skipped") : outcome ? t(k(outcome), { ...ENCOUNTER_PARAMS, relic: relicName }) : null;

  return (
    <OverlayContainer>
      <PopupPanel tint={tint} width={Math.min(width * 0.9, 620)} style={wide ? styles.row : undefined}>
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
          <Text style={[styles.line, wide && { textAlign: "left" }]} maxFontSizeMultiplier={1.15}>
            {resultText ?? t(k("body"), ENCOUNTER_PARAMS)}
          </Text>
          {outcome ? (
            <PopButton label={t("encounter.go")} onPress={onClose} style={styles.button} />
          ) : (
            <>
              <PopButton label={t(k("take"), ENCOUNTER_PARAMS)} onPress={() => onChoose(true)} disabled={!affordable} tint={tint} style={styles.button} />
              {!affordable ? (
                <Text style={styles.cant} maxFontSizeMultiplier={1.1}>
                  {t(k("cant"), ENCOUNTER_PARAMS)}
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
});

export default EncounterModal;
