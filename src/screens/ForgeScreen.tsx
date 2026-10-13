import React, { useCallback, useState } from "react";
import {
  FlatList,
  ImageBackground,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { RootStackParamList } from "../navigation/types";
import { MIN_TOUCH, useGameLayout } from "../ui/layout/useGameLayout";
import { UPGRADES, UpgradeId, canAfford, levelOf, maxLevel, nextCost } from "../core/stats/forge";
import { EMPTY_STATS, LocalStats } from "../core/stats/runStats";
import { buyUpgrade, getLocalStats } from "../services/localStats";
import { haptic, NotificationFeedbackType } from "../shared/haptics";
import { emitSound } from "../audio/audioEventBus";
import { useT } from "../i18n/useT";
import { forgeText } from "../i18n/keys";

type Props = NativeStackScreenProps<RootStackParamList, "ForgeScreen">;

const ForgeScreen: React.FC<Props> = ({ navigation }) => {
  const { t, plural } = useT();
  const { width } = useWindowDimensions();
  const { fontSize, spacing, insets } = useGameLayout();
  const [stats, setStats] = useState<LocalStats>(EMPTY_STATS);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  useFocusEffect(
    useCallback(() => {
      getLocalStats().then(setStats).catch(() => {});
    }, []),
  );

  const buy = async (id: UpgradeId) => {
    if (busy) return;
    setBusy(true);
    setError(false);
    try {
      const next = await buyUpgrade(id);
      if (next) {
        setStats(next);
        emitSound("RELIC_PICKED");
        haptic.notify(NotificationFeedbackType.Success);
      }
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  const cardWidth = Math.min(width - Math.max(insets.left, 8) - Math.max(insets.right, 8) - 16, 900);
  const columns = cardWidth >= 560 ? 2 : 1;

  return (
    <ImageBackground fadeDuration={0} resizeMethod="none" source={require("../assets/sprites/backgrounds/Cover_Background.png")} style={styles.root} resizeMode="cover">
      <SafeAreaView style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.85)" }}>
        <View style={[styles.header, { paddingVertical: spacing(12) }]}>
          <TouchableOpacity
            style={[styles.backButton, { left: Math.max(insets.left, 12) }]}
            onPress={() => navigation.goBack()}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t("a11y.back")}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={{ alignItems: "center" }}>
            <Text style={[styles.title, { fontSize: fontSize(26) }]} accessibilityRole="header" maxFontSizeMultiplier={1.3}>
              {t("forge.title").toLocaleUpperCase()}
            </Text>
            <Text style={styles.balance} maxFontSizeMultiplier={1.3} accessibilityLiveRegion="polite">
              🔥 {plural("forge.balance", stats.embers)}
            </Text>
            {error && (
              <Text style={styles.error} accessibilityLiveRegion="assertive" maxFontSizeMultiplier={1.3}>
                {t("forge.error")}
              </Text>
            )}
          </View>
        </View>

        <FlatList
          key={columns}
          data={UPGRADES}
          numColumns={columns}
          keyExtractor={u => u.id}
          style={{ alignSelf: "center", width: cardWidth }}
          contentContainerStyle={{ padding: 8, paddingBottom: 24 + insets.bottom, gap: 10 }}
          columnWrapperStyle={columns > 1 ? { gap: 10 } : undefined}
          ListHeaderComponent={
            <Text style={styles.hint} maxFontSizeMultiplier={1.3}>
              {t("forge.hint")}
            </Text>
          }
          ListFooterComponent={
            <Text style={[styles.hint, { marginTop: 6 }]} maxFontSizeMultiplier={1.3}>
              {t("forge.dailyNote")}
            </Text>
          }
          renderItem={({ item }) => {
            const level = levelOf(stats, item.id);
            const max = maxLevel(item.id);
            const cost = nextCost(stats, item.id);
            const affordable = canAfford(stats, item.id);
            const name = forgeText(t, item.id, "name");
            const description = forgeText(t, item.id, "desc");
            return (
              <View style={[styles.card, columns > 1 && { flex: 1 }]}>
                <Text style={styles.icon}>{item.icon}</Text>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.name} maxFontSizeMultiplier={1.3}>
                    {name}
                  </Text>
                  <Text style={styles.desc} maxFontSizeMultiplier={1.3}>
                    {description}
                  </Text>
                  <View style={styles.pips} accessible accessibilityLabel={t("forge.level", { level, max })}>
                    {Array.from({ length: max }, (_, i) => (
                      <View key={i} style={[styles.pip, i < level && styles.pipOn]} />
                    ))}
                  </View>
                  <TouchableOpacity
                    style={[styles.buyButton, (!affordable || cost === null) && styles.buyDisabled]}
                    onPress={() => buy(item.id)}
                    disabled={!affordable || cost === null || busy}
                    accessibilityRole="button"
                    accessibilityLabel={`${name}. ${cost === null ? t("forge.maxed") : t("forge.buy", { cost })}`}
                    accessibilityState={{ disabled: !affordable || cost === null }}
                  >
                    <Text style={styles.buyText} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.3}>
                      {cost === null
                        ? t("forge.maxed").toLocaleUpperCase()
                        : affordable
                        ? t("forge.buy", { cost }).toLocaleUpperCase()
                        : t("forge.needs", { cost }).toLocaleUpperCase()}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      </SafeAreaView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  backButton: {
    position: "absolute",
    width: MIN_TOUCH,
    height: MIN_TOUCH,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: MIN_TOUCH / 2,
    justifyContent: "center",
    alignItems: "center",
  },
  title: { color: "#fff", fontWeight: "900", letterSpacing: 4, textAlign: "center" },
  balance: { color: "#FFAB40", fontWeight: "900", fontSize: 14, marginTop: 2 },
  error: { color: "#FF5252", fontWeight: "800", fontSize: 12, marginTop: 2 },
  hint: { color: "#bdbdbd", fontSize: 12, textAlign: "center", marginBottom: 4 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 171, 64, 0.35)",
    backgroundColor: "rgba(255, 171, 64, 0.07)",
    padding: 12,
  },
  icon: { fontSize: 32, width: 42, textAlign: "center" },
  name: { color: "#fff", fontWeight: "900", fontSize: 15 },
  desc: { color: "#cfcfcf", fontSize: 13 },
  pips: { flexDirection: "row", gap: 6, marginVertical: 6 },
  pip: { width: 18, height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.15)" },
  pipOn: { backgroundColor: "#FFAB40" },
  buyButton: {
    minHeight: MIN_TOUCH,
    borderRadius: 12,
    backgroundColor: "#FFAB40",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  buyDisabled: { backgroundColor: "rgba(255,255,255,0.12)" },
  buyText: { color: "#000", fontWeight: "900", letterSpacing: 1, fontSize: 13 },
});

export default ForgeScreen;
