import React, { useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import GameIcon from "../components/GameIcon";
import Text from "../components/Text";
import OverlayContainer from "../components/game/OverlayContainer";
import { PopButton, PopupPanel, popupTitleStyle } from "../components/game/popup";
import { useT } from "../../i18n/useT";
import { enterFullscreen, exitFullscreen, useWebScreen } from "./webScreen";

/**
 * The web build on a phone or tablet: a round button that hides the browser's bars (full screen, landscape locked where the
 * browser allows it) and brings them back. On an iPhone, whose browser cannot go full screen, it explains how to add the game
 * to the home screen, from where it opens with no bar. Nothing on a computer, nothing once opened from the home screen.
 */
/** The three steps to add the game to an iPhone's home screen, each with the symbol the player will look for. */
const INSTALL_STEPS = [
  { key: "web.install.step1", icon: "share-outline" },
  { key: "web.install.step2", icon: "add-circle-outline" },
  { key: "web.install.step3", icon: "phone-landscape-outline" },
] as const;

export default function FullscreenButton() {
  const { t } = useT();
  const screen = useWebScreen();
  const [howTo, setHowTo] = useState(false);
  if (!screen.touch || screen.standalone) return null;
  if (!screen.canFullscreen && !screen.ios) return null;

  const press = () => {
    if (!screen.canFullscreen) return setHowTo(true);
    if (screen.fullscreen) return void exitFullscreen();
    // A browser that refuses (an iPad's Safari in some versions) gets the home-screen way instead of a button that does nothing.
    void enterFullscreen().then(ok => {
      if (!ok && screen.ios) setHowTo(true);
    });
  };
  return (
    <>
      <Pressable onPress={press} hitSlop={6} style={styles.button} accessibilityRole="button" accessibilityLabel={t(screen.fullscreen ? "web.fullscreen.leave" : "web.fullscreen.go")}>
        <GameIcon name={screen.fullscreen ? "contract" : "expand"} size={20} color="#fff" />
      </Pressable>
      {/* In a modal of its own: drawn inside the cover's little top row, the card was cut down to that row and unseen. */}
      <Modal visible={howTo} transparent animationType="fade" onRequestClose={() => setHowTo(false)} supportedOrientations={["landscape", "portrait"]}>
        <OverlayContainer>
          <PopupPanel tint="#C9A55A" width={440}>
            <Text style={popupTitleStyle("#C9A55A")} maxFontSizeMultiplier={1.15}>
              {t("web.fullscreen.go").toLocaleUpperCase()}
            </Text>
            <Text style={styles.why} maxFontSizeMultiplier={1.15}>
              {t("web.install.why")}
            </Text>
            <View style={styles.steps}>
              {INSTALL_STEPS.map((s, i) => (
                <View key={s.key} style={styles.stepRow}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText} maxFontSizeMultiplier={1.1}>{`${i + 1}`}</Text>
                  </View>
                  <GameIcon name={s.icon} size={20} color="#C9A55A" />
                  <Text style={styles.step} maxFontSizeMultiplier={1.15}>
                    {t(s.key)}
                  </Text>
                </View>
              ))}
            </View>
            <PopButton label={t("common.close")} onPress={() => setHowTo(false)} style={{ alignSelf: "stretch" }} enterKey />
          </PopupPanel>
        </OverlayContainer>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(10,14,24,0.72)", borderWidth: 1, borderColor: "rgba(255,255,255,0.25)" },
  why: { color: "#EADBC8", fontSize: 13.5, textAlign: "center", lineHeight: 19 },
  steps: { alignSelf: "stretch", padding: 12, gap: 10, borderRadius: 14, backgroundColor: "rgba(0,0,0,0.35)" },
  stepRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  stepNumber: { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: "#C9A55A" },
  stepNumberText: { color: "#1a0f00", fontWeight: "900", fontSize: 12 },
  step: { flex: 1, color: "#FFF3E0", fontSize: 13.5, lineHeight: 18 },
});
