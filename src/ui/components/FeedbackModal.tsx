import React, { useState } from "react";
import { Dimensions, Pressable, StyleSheet, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Text from "./Text";
import OverlayContainer from "./game/OverlayContainer";
import { PopButton, PopupPanel, popupTitleStyle } from "./game/popup";
import { useWindowDimensions } from "../layout/scaledWindow";
import { useT } from "../../i18n/useT";
import { useEscapeKey } from "../hotkeys";
import { FEEDBACK_KINDS, FEEDBACK_MAX, FEEDBACK_MIN, sendFeedback, type FeedbackKind } from "../../services/feedback";

const TINT = "#4FC3F7";
const KIND_ICON: Record<FeedbackKind, keyof typeof Ionicons.glyphMap> = { bug: "bug", idea: "bulb", like: "heart", other: "chatbubble-ellipses" };
const KIND_COLOR: Record<FeedbackKind, string> = { bug: "#FF8A80", idea: "#FFD54F", like: "#F48FB1", other: "#B0BEC5" };

type Props = {
  /** Where the note was written from (the screen), kept with it. */
  where: string;
  onClose: () => void;
};

/**
 * "Send feedback": a tester says what broke, what they would change or what they liked, in their own words, without leaving the
 * game. The note goes to the developers with the screen, the device and the version (services/feedback.ts).
 */
export default function FeedbackModal({ where, onClose }: Props) {
  const { t } = useT();
  const { width, height } = useWindowDimensions();
  const [kind, setKind] = useState<FeedbackKind>("bug");
  const [text, setText] = useState("");
  const [state, setState] = useState<"edit" | "sending" | "sent" | "failed">("edit");
  useEscapeKey(onClose, state !== "sending");
  const short = height < 420;
  const ready = text.trim().length >= FEEDBACK_MIN;

  const send = async () => {
    if (!ready || state === "sending") return;
    setState("sending");
    const win = Dimensions.get("window");
    const ok = await sendFeedback({ kind, text, where, width: win.width, height: win.height });
    setState(ok ? "sent" : "failed");
    if (ok) setText("");
  };

  return (
    <OverlayContainer>
      <PopupPanel tint={TINT} width={Math.min(width * 0.94, 560)} style={short ? { gap: 6, paddingVertical: 10 } : undefined}>
        <Text style={popupTitleStyle(TINT)} maxFontSizeMultiplier={1.15}>
          {t("feedback.title").toLocaleUpperCase()}
        </Text>
        {state === "sent" ? (
          <>
            <View style={styles.thanks}>
              <Ionicons name="checkmark-circle" size={34} color="#81C784" />
              <Text style={styles.thanksText} maxFontSizeMultiplier={1.15}>
                {t("feedback.thanks")}
              </Text>
            </View>
            <View style={styles.row}>
              <PopButton label={t("feedback.another")} variant="secondary" onPress={() => setState("edit")} style={{ flex: 1 }} />
              <PopButton label={t("common.close")} onPress={onClose} style={{ flex: 1 }} enterKey />
            </View>
          </>
        ) : (
          <>
            <Text style={styles.lead} maxFontSizeMultiplier={1.15}>
              {t("feedback.lead")}
            </Text>
            <View style={styles.kinds} accessibilityRole="radiogroup">
              {FEEDBACK_KINDS.map(k => {
                const on = k === kind;
                return (
                  <Pressable
                    key={k}
                    onPress={() => setKind(k)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: on }}
                    style={[styles.kind, on && { borderColor: KIND_COLOR[k], backgroundColor: "rgba(255,255,255,0.1)" }]}
                  >
                    <Ionicons name={KIND_ICON[k]} size={15} color={on ? KIND_COLOR[k] : "#9e9488"} />
                    <Text style={[styles.kindText, on && { color: "#FFF3E0" }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} maxFontSizeMultiplier={1.1}>
                      {t(`feedback.kind.${k}`)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <TextInput
              style={[styles.input, { fontFamily: "Fredoka_600SemiBold", height: short ? 70 : 120 }]}
              placeholder={t(`feedback.placeholder.${kind}`)}
              placeholderTextColor="#8a8a8a"
              value={text}
              onChangeText={v => {
                setText(v);
                if (state === "failed") setState("edit");
              }}
              maxLength={FEEDBACK_MAX}
              multiline
              textAlignVertical="top"
              selectionColor={TINT}
              editable={state !== "sending"}
              accessibilityLabel={t("feedback.title")}
            />
            <View style={styles.meta}>
              <Text style={state === "failed" ? styles.error : styles.note} numberOfLines={2} maxFontSizeMultiplier={1.1}>
                {state === "failed" ? t("feedback.failed") : t("feedback.privacy")}
              </Text>
              <Text style={styles.count} maxFontSizeMultiplier={1}>
                {`${text.length}/${FEEDBACK_MAX}`}
              </Text>
            </View>
            <View style={styles.row}>
              <PopButton label={t("common.close")} variant="secondary" onPress={onClose} style={{ flex: 1 }} />
              <PopButton label={t("feedback.send")} icon="send" tint={TINT} onPress={() => void send()} disabled={!ready} busy={state === "sending"} style={{ flex: 1 }} />
            </View>
          </>
        )}
      </PopupPanel>
    </OverlayContainer>
  );
}

const styles = StyleSheet.create({
  lead: { color: "#E6D6C2", fontSize: 13, textAlign: "center" },
  kinds: { flexDirection: "row", gap: 6, alignSelf: "stretch" },
  kind: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 8, paddingHorizontal: 6, borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.14)", backgroundColor: "rgba(0,0,0,0.3)" },
  kindText: { color: "#bfb3a6", fontWeight: "800", fontSize: 12.5, flexShrink: 1 },
  input: { alignSelf: "stretch", backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 14, padding: 12, color: "#fff", fontSize: 15, borderWidth: 1, borderColor: "rgba(79,195,247,0.45)" },
  meta: { flexDirection: "row", alignItems: "center", gap: 8, alignSelf: "stretch" },
  note: { flex: 1, color: "#9e9488", fontSize: 11 },
  error: { flex: 1, color: "#FF8A80", fontSize: 11.5, fontWeight: "700" },
  count: { color: "#7d746b", fontSize: 11, fontWeight: "700" },
  row: { flexDirection: "row", gap: 10, alignSelf: "stretch" },
  thanks: { alignItems: "center", gap: 8, paddingVertical: 8 },
  thanksText: { color: "#FFF3E0", fontWeight: "800", fontSize: 15, textAlign: "center" },
});
