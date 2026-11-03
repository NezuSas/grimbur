import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { useWindowDimensions } from "../layout/scaledWindow";
import { Ionicons } from "@expo/vector-icons";
import Text from "./Text";
import SpriteImage from "./SpriteImage";
import EmberIcon from "./EmberIcon";
import OverlayContainer from "./game/OverlayContainer";
import { PopButton, PopupPanel, popupTitleStyle } from "./game/popup";
import { useT } from "../../i18n/useT";
import { emitSound } from "../../audio/audioEventBus";
import { CHEST_DAYS, CHEST_EMBERS, CHEST_FREEZE_DAY } from "../../core/stats/dailyChest";

const CHEST_ART = require("../../assets/sprites/items/Icon_Chest.png");
const CHEST_SHUT_ART = require("../../assets/sprites/items/Icon_Chest_Closed.png");
const GOLD = "#FFD54F";

type Props = {
  /** The calendar day today's chest is (1..7). */
  day: number;
  /** What the chest gave, once opened (null while it is still shut). */
  opened: { embers: number; freeze: boolean } | null;
  busy?: boolean;
  onOpen: () => void;
  onClose: () => void;
  /** Reduced motion: no shaking or bursting. */
  calm?: boolean;
};

/**
 * The daily chest on the cover: the week's calendar (days already opened ticked, today's lit, the seventh bigger), a chest that
 * rattles until it is opened, then what it held.
 */
const DailyChestModal = ({ day, opened, busy, onOpen, onClose, calm = false }: Props) => {
  const { t } = useT();
  const { width, height } = useWindowDimensions();
  const rattle = useRef(new Animated.Value(0)).current;
  const burst = useRef(new Animated.Value(0)).current;
  const [shownDay] = useState(day);

  useEffect(() => {
    if (calm || opened) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(900),
        Animated.timing(rattle, { toValue: 1, duration: 70, useNativeDriver: true }),
        Animated.timing(rattle, { toValue: -1, duration: 110, useNativeDriver: true }),
        Animated.timing(rattle, { toValue: 0.6, duration: 90, useNativeDriver: true }),
        Animated.timing(rattle, { toValue: 0, duration: 70, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [calm, opened, rattle]);

  useEffect(() => {
    if (!opened) return;
    emitSound("RELIC_PICKED");
    burst.setValue(calm ? 1 : 0);
    if (!calm) Animated.timing(burst, { toValue: 1, duration: 520, easing: Easing.out(Easing.back(1.6)), useNativeDriver: true }).start();
  }, [opened, burst, calm]);

  const panelW = Math.min(width * 0.92, 600);
  const chestSize = Math.min(height * 0.24, 120);
  const slot = Math.min((panelW - 40 - 6 * 6) / 7.6, 64);

  return (
    <OverlayContainer>
      <PopupPanel tint={GOLD} width={panelW}>
        <Text style={popupTitleStyle(GOLD)} maxFontSizeMultiplier={1.15}>
          {t("chest.title").toLocaleUpperCase()}
        </Text>
        <View style={styles.days} accessible accessibilityLabel={t("chest.dayOf", { n: shownDay, total: CHEST_DAYS })}>
          {Array.from({ length: CHEST_DAYS }, (_, i) => {
            const d = i + 1;
            const done = d < shownDay || (d === shownDay && !!opened);
            const today = d === shownDay;
            const big = d === CHEST_FREEZE_DAY;
            return (
              <View
                key={d}
                style={[
                  styles.slot,
                  { width: big ? slot * 1.6 : slot, height: slot * 1.15 },
                  today && styles.slotToday,
                  done && styles.slotDone,
                  big && styles.slotBig,
                ]}
              >
                <Text style={[styles.slotDay, today && { color: GOLD }]} maxFontSizeMultiplier={1.1}>
                  {t("chest.day", { n: d })}
                </Text>
                {done ? (
                  <Ionicons name="checkmark-circle" size={slot * 0.36} color="#9EE37D" />
                ) : (
                  <View style={styles.slotPay}>
                    <EmberIcon size={11} />
                    <Text style={styles.slotEmbers} maxFontSizeMultiplier={1.1}>
                      {CHEST_EMBERS[i]}
                    </Text>
                    {big ? <Ionicons name="snow" size={12} color="#80D8FF" /> : null}
                  </View>
                )}
              </View>
            );
          })}
        </View>

        <View style={[styles.stage, { height: chestSize * 1.1 }]}>
          {opened ? (
            <Animated.View pointerEvents="none" style={[styles.ray, { width: chestSize * 1.5, height: chestSize * 1.5, borderRadius: chestSize, opacity: burst.interpolate({ inputRange: [0, 1], outputRange: [0, 0.28] }), transform: [{ scale: burst }] }]} />
          ) : null}
          <Animated.View
            style={{
              transform: [
                { rotate: rattle.interpolate({ inputRange: [-1, 1], outputRange: ["-7deg", "7deg"] }) },
                { scale: opened ? burst.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.08] }) : 1 },
              ],
            }}
          >
            {/* Both stay mounted and swap by opacity (changing the source would flash): shut until it is opened. */}
            <View style={{ width: chestSize, height: chestSize }}>
              <SpriteImage source={CHEST_SHUT_ART} style={{ position: "absolute", left: 0, top: 0, width: chestSize, height: chestSize, opacity: opened ? 0 : 1 }} resizeMode="contain" />
              <SpriteImage source={CHEST_ART} style={{ position: "absolute", left: 0, top: 0, width: chestSize, height: chestSize, opacity: opened ? 1 : 0 }} resizeMode="contain" />
            </View>
          </Animated.View>
          {opened ? (
            <Animated.View style={[styles.prize, { opacity: burst, transform: [{ translateY: burst.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }]}>
              <View style={styles.prizeRow}>
                <EmberIcon size={22} />
                <Text style={styles.prizeText} maxFontSizeMultiplier={1.1}>
                  +{opened.embers}
                </Text>
              </View>
              {opened.freeze ? (
                <View style={styles.prizeRow}>
                  <Ionicons name="snow" size={18} color="#80D8FF" />
                  <Text style={styles.freezeText} maxFontSizeMultiplier={1.1}>
                    {t("chest.freeze")}
                  </Text>
                </View>
              ) : null}
            </Animated.View>
          ) : null}
        </View>

        <Text style={styles.line} maxFontSizeMultiplier={1.15}>
          {opened ? t(shownDay === CHEST_DAYS ? "chest.weekDone" : "chest.comeBack") : t("chest.hint")}
        </Text>
        {opened ? (
          <PopButton label={t("parade.continue")} onPress={onClose} style={styles.button} enterKey />
        ) : (
          <PopButton label={t("chest.open")} icon="gift" onPress={onOpen} busy={busy} style={styles.button} tint={GOLD} enterKey />
        )}
      </PopupPanel>
    </OverlayContainer>
  );
};

const styles = StyleSheet.create({
  days: { flexDirection: "row", gap: 6, alignItems: "flex-end" },
  slot: { alignItems: "center", justifyContent: "center", gap: 3, borderRadius: 12, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.12)", backgroundColor: "rgba(0,0,0,0.35)" },
  slotToday: { borderColor: GOLD, backgroundColor: "rgba(255,213,79,0.14)" },
  slotDone: { borderColor: "rgba(158,227,125,0.5)", backgroundColor: "rgba(158,227,125,0.08)" },
  slotBig: { borderStyle: "dashed" },
  slotDay: { color: "#C2A88F", fontSize: 10.5, fontWeight: "900", letterSpacing: 0.5 },
  slotPay: { flexDirection: "row", alignItems: "center", gap: 2 },
  slotEmbers: { color: "#FFE7A8", fontSize: 12, fontWeight: "900" },
  stage: { alignSelf: "stretch", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 18 },
  ray: { position: "absolute", backgroundColor: GOLD },
  prize: { gap: 4 },
  prizeRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  prizeText: { color: "#FFE7A8", fontSize: 30, fontWeight: "900" },
  freezeText: { color: "#B3E5FC", fontSize: 14, fontWeight: "900" },
  line: { color: "#EADBC8", fontSize: 13, fontWeight: "700", textAlign: "center" },
  button: { alignSelf: "stretch" },
});

export default DailyChestModal;
