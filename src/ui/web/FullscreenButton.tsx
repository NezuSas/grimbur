import React, { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
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
export default function FullscreenButton() {
  const { t } = useT();
  const screen = useWebScreen();
  const [howTo, setHowTo] = useState(false);
  if (!screen.touch || screen.standalone) return null;
  if (!screen.canFullscreen && !screen.ios) return null;

  const press = () => {
    if (screen.canFullscreen) void (screen.fullscreen ? exitFullscreen() : enterFullscreen());
    else setHowTo(true);
  };
  return (
    <>
      <Pressable onPress={press} hitSlop={6} style={styles.button} accessibilityRole="button" accessibilityLabel={t(screen.fullscreen ? "web.fullscreen.leave" : "web.fullscreen.go")}>
        <Ionicons name={screen.fullscreen ? "contract" : "expand"} size={20} color="#fff" />
      </Pressable>
      {howTo ? (
        <OverlayContainer>
          <PopupPanel tint="#D9B45A" width={440}>
            <Text style={popupTitleStyle("#D9B45A")} maxFontSizeMultiplier={1.15}>
              {t("web.fullscreen.go").toLocaleUpperCase()}
            </Text>
            <View style={styles.steps}>
              <Text style={styles.step} maxFontSizeMultiplier={1.15}>
                {t("web.install.ios")}
              </Text>
            </View>
            <PopButton label={t("common.close")} onPress={() => setHowTo(false)} style={{ alignSelf: "stretch" }} enterKey />
          </PopupPanel>
        </OverlayContainer>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  button: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(10,14,24,0.72)", borderWidth: 1, borderColor: "rgba(255,255,255,0.25)" },
  steps: { alignSelf: "stretch", padding: 12, borderRadius: 14, backgroundColor: "rgba(0,0,0,0.35)" },
  step: { color: "#FFF3E0", fontSize: 14, textAlign: "center" },
});
