import React, { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Text from "./Text";
import { useT } from "../../i18n/useT";
import { dailyKey } from "../../core/engine/seed";
import { newsToShow, type LiveNews } from "../../core/news/liveNews";
import { dismissNews, getDismissedNews, loadLiveNews } from "../../services/liveNews";

/** A notice from the developer on the cover (an event, a reminder to update). It can be dismissed and stays dismissed. */
const NewsBanner = () => {
  const { language } = useT();
  const insets = useSafeAreaInsets();
  const [news, setNews] = useState<LiveNews | null>(null);
  const [dismissed, setDismissed] = useState<string[]>([]);

  useEffect(() => {
    let active = true;
    void Promise.all([loadLiveNews(), getDismissedNews()]).then(([loaded, gone]) => {
      if (!active) return;
      setNews(loaded);
      setDismissed(gone);
    });
    return () => {
      active = false;
    };
  }, []);

  const close = useCallback(async () => {
    if (news) setDismissed(await dismissNews(news.id));
  }, [news]);

  const text = newsToShow(news, language, dailyKey(), dismissed);
  if (!text) return null;
  return (
    <View style={[styles.wrap, { left: Math.max(insets.left, 12), bottom: Math.max(insets.bottom, 10) }]} pointerEvents="box-none">
      <LinearGradient colors={["rgba(43,32,80,0.96)", "rgba(18,12,38,0.96)"]} style={styles.card} accessible accessibilityRole="alert" accessibilityLabel={text}>
        <Ionicons name="megaphone" size={18} color="#FFD54F" />
        <Text style={styles.text} maxFontSizeMultiplier={1.2}>
          {text}
        </Text>
        <Pressable onPress={() => void close()} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close">
          <Ionicons name="close" size={18} color="#b9b4d4" />
        </Pressable>
      </LinearGradient>
    </View>
  );
};

export default NewsBanner;

const styles = StyleSheet.create({
  wrap: { position: "absolute", maxWidth: "46%", zIndex: 20 },
  card: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 16, borderWidth: 1.5, borderColor: "rgba(255,213,79,0.6)", paddingHorizontal: 12, paddingVertical: 8 },
  text: { color: "#fff", fontWeight: "700", fontSize: 12.5, flexShrink: 1 },
});
