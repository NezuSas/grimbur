import React, { useEffect, useRef } from "react";
import { Animated, Easing, Pressable, StyleSheet, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import Text from "../components/Text";
import { useT } from "../../i18n/useT";
import { enterFullscreen, useWebScreen } from "./webScreen";

const GOLD = "#D9B45A";

/**
 * The web build on a phone held upright: Grimbur is played lying down, so the whole game hides behind a card that asks to turn
 * the phone (a phone turning, over and over). Where the browser allows it, a button goes full screen and locks landscape, so the
 * phone can turn by itself. Nothing on a computer, nothing in the app.
 */
export default function TurnPhoneGate() {
  const { t } = useT();
  const screen = useWebScreen();
  const turn = useRef(new Animated.Value(0)).current;
  const show = screen.touch && screen.portrait;

  useEffect(() => {
    if (!show) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(400),
        Animated.timing(turn, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
        Animated.delay(900),
        Animated.timing(turn, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [show, turn]);

  if (!show) return null;
  const rotate = turn.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "-90deg"] });
  return (
    <View style={styles.root} accessibilityRole="alert">
      <Animated.View style={{ transform: [{ rotate }] }}>
        <MaterialCommunityIcons name="cellphone" size={86} color={GOLD} />
      </Animated.View>
      <Text style={styles.title} maxFontSizeMultiplier={1.2}>
        {t("web.turn.title").toLocaleUpperCase()}
      </Text>
      <Text style={styles.body} maxFontSizeMultiplier={1.2}>
        {t("web.turn.body")}
      </Text>
      {screen.canFullscreen && !screen.fullscreen ? (
        <Pressable onPress={() => void enterFullscreen()} style={styles.button} accessibilityRole="button">
          <Ionicons name="expand" size={20} color="#1a1206" />
          <Text style={styles.buttonText} maxFontSizeMultiplier={1.2}>
            {t("web.fullscreen.go")}
          </Text>
        </Pressable>
      ) : null}
      {screen.ios && !screen.standalone ? (
        <Text style={styles.tip} maxFontSizeMultiplier={1.2}>
          {t("web.install.ios")}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 100000, backgroundColor: "#0E0B1F", alignItems: "center", justifyContent: "center", gap: 16, padding: 28 },
  title: { color: GOLD, fontWeight: "900", fontSize: 22, letterSpacing: 2, textAlign: "center" },
  body: { color: "#E6D6C2", fontSize: 15, textAlign: "center", maxWidth: 320 },
  button: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: GOLD, paddingHorizontal: 22, paddingVertical: 13, borderRadius: 16, marginTop: 6 },
  buttonText: { color: "#1a1206", fontWeight: "900", fontSize: 16 },
  tip: { color: "#9e9488", fontSize: 12.5, textAlign: "center", maxWidth: 300 },
});
