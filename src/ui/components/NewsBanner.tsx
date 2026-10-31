import React, { useCallback, useEffect, useState } from "react";
import { Linking, Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Text from "./Text";
import { useT } from "../../i18n/useT";
import appJson from "../../../app.json";
import { dailyKey } from "../../core/engine/seed";
import { newsToShow, type LiveNews } from "../../core/news/liveNews";
import { dismissNews, getDismissedNews, loadAppConfig, loadLiveNews } from "../../services/liveNews";
import { updateNotice, type AppConfig } from "../../core/news/appUpdate";

const CURRENT_VERSION = (appJson as { expo?: { version?: string } }).expo?.version ?? "";

/** A notice from the developer on the cover (an event, a reminder to update). It can be dismissed and stays dismissed. */
const NewsBanner = () => {
  const { t, language } = useT();
  const insets = useSafeAreaInsets();
  const [news, setNews] = useState<LiveNews | null>(null);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [dismissed, setDismissed] = useState<string[]>([]);

  useEffect(() => {
    let active = true;
    void Promise.all([loadLiveNews(), loadAppConfig(), getDismissedNews()]).then(([loaded, cfg, gone]) => {
      if (!active) return;
      setNews(loaded);
      setConfig(cfg);
      setDismissed(gone);
    });
    return () => {
      active = false;
    };
  }, []);

  // An update comes before any notice; an offered one is dismissed per version, a required one cannot be.
  const update = updateNotice(CURRENT_VERSION, config, dismissed.filter(x => x.startsWith("v:")).map(x => x.slice(2)));
  const updateVersion = update.kind === "none" ? "" : update.version;
  const close = useCallback(async () => {
    if (update.kind === "available") setDismissed(await dismissNews(`v:${updateVersion}`));
    else if (news) setDismissed(await dismissNews(news.id));
  }, [news, update.kind, updateVersion]);

  const text =
    update.kind === "required"
      ? t("update.required", { version: updateVersion })
      : update.kind === "available"
        ? t("update.available", { version: updateVersion })
        : newsToShow(news, language, dailyKey(), dismissed);
  if (!text) return null;
  const updateUrl = update.kind !== "none" ? update.url : undefined;
  return (
    <View style={[styles.wrap, { left: Math.max(insets.left, 12), bottom: Math.max(insets.bottom, 10) }]} pointerEvents="box-none">
      <LinearGradient colors={["rgba(73, 56, 39,0.96)", "rgba(22, 14, 8,0.96)"]} style={styles.card} accessible accessibilityRole="alert" accessibilityLabel={text}>
        <Ionicons name={update.kind === "none" ? "megaphone" : "cloud-download"} size={18} color={update.kind === "required" ? "#FF8A80" : "#FFD54F"} />
        <Text style={styles.text} maxFontSizeMultiplier={1.2}>
          {text}
        </Text>
        {updateUrl ? (
          <Pressable style={styles.action} onPress={() => void Linking.openURL(updateUrl).catch(() => {})} accessibilityRole="button" accessibilityLabel={t("update.button")}>
            <Text style={styles.actionText} maxFontSizeMultiplier={1.2}>
              {t("update.button").toLocaleUpperCase()}
            </Text>
          </Pressable>
        ) : null}
        {update.kind !== "required" ? (
          <Pressable onPress={() => void close()} hitSlop={10} accessibilityRole="button" accessibilityLabel={t("common.close")}>
            <Ionicons name="close" size={18} color="#D6C4B2" />
          </Pressable>
        ) : null}
      </LinearGradient>
    </View>
  );
};

export default NewsBanner;

const styles = StyleSheet.create({
  wrap: { position: "absolute", maxWidth: "46%", zIndex: 20 },
  card: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 16, borderWidth: 1.5, borderColor: "rgba(255,213,79,0.6)", paddingHorizontal: 12, paddingVertical: 8 },
  text: { color: "#fff", fontWeight: "700", fontSize: 12.5, flexShrink: 1 },
  action: { backgroundColor: "#FFD54F", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  actionText: { color: "#2A2016", fontWeight: "900", fontSize: 11, letterSpacing: 1 },
});
