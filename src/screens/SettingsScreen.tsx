import React from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Share,
  ImageBackground,
  useWindowDimensions,
} from "react-native";
import Text from "../ui/components/Text";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";
import { SafeAreaView } from "react-native-safe-area-context";
import { MIN_TOUCH, useGameLayout } from "../ui/layout/useGameLayout";
import { Ionicons } from "@expo/vector-icons";
import { useSettingsStore } from "../state/settings/store";
import type { AttackButtonPlacement, ControlPosition, ControlSize } from "../state/settings/types";
import { getAudioLog } from "../audio/audioDiagnostics";
import type { LanguagePreference } from "../i18n/translate";
import { useT } from "../i18n/useT";

type Props = NativeStackScreenProps<RootStackParamList, "SettingsScreen">;

type RowProps = {
  label: string;
  hint?: string;
  icon: keyof typeof Ionicons.glyphMap;
  children: React.ReactNode;
  /** Stack the control under the label (long segmented controls on narrow windows). */
  stacked?: boolean;
};

/** Module-level so the screen never remounts its rows. */
const SettingRow = ({ label, hint, icon, children, stacked }: RowProps) => (
  <View style={[styles.settingRow, stacked && styles.settingRowStacked]}>
    <View style={styles.settingLabelContainer}>
      <Ionicons name={icon} size={24} color="#FFD700" style={{ marginRight: 14 }} />
      <View style={{ flexShrink: 1 }}>
        <Text style={styles.settingLabel} maxFontSizeMultiplier={1.3}>
          {label}
        </Text>
        {hint ? (
          <Text style={styles.settingHint} maxFontSizeMultiplier={1.3}>
            {hint}
          </Text>
        ) : null}
      </View>
    </View>
    {children}
  </View>
);

type SegmentOption<V extends string> = { value: V; label: string };

function Segmented<V extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
}: {
  options: SegmentOption<V>[];
  value: V;
  onChange: (value: V) => void;
  accessibilityLabel: string;
}) {
  return (
    <View style={styles.segmentedContainer} accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel}>
      {options.map(option => {
        const active = option.value === value;
        return (
          <TouchableOpacity
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[styles.segment, active && styles.segmentActive]}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            accessibilityLabel={option.label}
          >
            <Text
              style={[styles.segmentText, active && styles.segmentTextActive]}
              numberOfLines={1}
              adjustsFontSizeToFit
              maxFontSizeMultiplier={1.2}
            >
              {option.label.toLocaleUpperCase()}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const SettingsScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useT();
  const { width } = useWindowDimensions();
  const { spacing, fontSize, insets } = useGameLayout();

  const soundEnabled = useSettingsStore(s => s.soundEnabled);
  const hapticsEnabled = useSettingsStore(s => s.hapticsEnabled);
  const reduceFlash = useSettingsStore(s => s.reduceFlash);
  const controlPosition = useSettingsStore(s => s.controlPosition);
  const language = useSettingsStore(s => s.language);
  const attackButton = useSettingsStore(s => s.attackButton);
  const controlSize = useSettingsStore(s => s.controlSize);
  const setControlSize = useSettingsStore(s => s.setControlSize);
  const swipeMove = useSettingsStore(s => s.swipeMove);
  const setAttackButton = useSettingsStore(s => s.setAttackButton);
  const setSwipeMove = useSettingsStore(s => s.setSwipeMove);
  const setSoundEnabled = useSettingsStore(s => s.setSoundEnabled);
  const setHapticsEnabled = useSettingsStore(s => s.setHapticsEnabled);
  const setReduceFlash = useSettingsStore(s => s.setReduceFlash);
  const setControlPosition = useSettingsStore(s => s.setControlPosition);
  const setLanguage = useSettingsStore(s => s.setLanguage);

  const cardWidth = Math.min(width - 32, 560);

  const controlOptions: SegmentOption<ControlPosition>[] = [
    { value: "left", label: t("settings.left") },
    { value: "right", label: t("settings.right") },
  ];
  const sizeOptions: SegmentOption<ControlSize>[] = [
    { value: "small", label: t("settings.sizeSmall") },
    { value: "medium", label: t("settings.sizeMedium") },
    { value: "large", label: t("settings.sizeLarge") },
  ];
  const attackOptions: SegmentOption<AttackButtonPlacement>[] = [
    { value: "side", label: t("settings.attackSide") },
    { value: "center", label: t("settings.attackCenter") },
  ];
  const languageOptions: SegmentOption<LanguagePreference>[] = [
    { value: "auto", label: t("settings.languageAuto") },
    { value: "en", label: t("settings.languageEn") },
    { value: "es", label: t("settings.languageEs") },
  ];

  const switchColors = { false: "#555", true: "#4caf50" };

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
          <Text style={[styles.title, { fontSize: fontSize(26) }]} accessibilityRole="header" maxFontSizeMultiplier={1.3}>
            {t("settings.title").toLocaleUpperCase()}
          </Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={[styles.mainCard, { width: cardWidth }]}>
            <SettingRow label={t("settings.sound")} icon={soundEnabled ? "volume-high" : "volume-mute"}>
              <Switch
                value={soundEnabled}
                onValueChange={setSoundEnabled}
                trackColor={switchColors}
                accessibilityLabel={t("settings.sound")}
              />
            </SettingRow>

            <View style={styles.separator} />

            <SettingRow label={t("settings.haptics")} icon="phone-portrait-outline">
              <Switch
                value={hapticsEnabled}
                onValueChange={setHapticsEnabled}
                trackColor={switchColors}
                accessibilityLabel={t("settings.haptics")}
              />
            </SettingRow>

            <View style={styles.separator} />

            <SettingRow label={t("settings.reduceFlash")} hint={t("settings.reduceFlashHint")} icon="flash-off-outline">
              <Switch
                value={reduceFlash}
                onValueChange={setReduceFlash}
                trackColor={switchColors}
                accessibilityLabel={t("settings.reduceFlash")}
              />
            </SettingRow>

            <View style={styles.separator} />

            <SettingRow label={t("settings.controls")} icon="game-controller" stacked>
              <Segmented
                options={controlOptions}
                value={controlPosition}
                onChange={setControlPosition}
                accessibilityLabel={t("settings.controls")}
              />
            </SettingRow>

            <View style={styles.separator} />

            <SettingRow label={t("settings.controlSize")} icon="resize" stacked>
              <Segmented
                options={sizeOptions}
                value={controlSize}
                onChange={setControlSize}
                accessibilityLabel={t("settings.controlSize")}
              />
            </SettingRow>

            <View style={styles.separator} />

            <SettingRow label={t("settings.attackButton")} hint={t("settings.attackHint")} icon="flash" stacked>
              <Segmented
                options={attackOptions}
                value={attackButton}
                onChange={setAttackButton}
                accessibilityLabel={t("settings.attackButton")}
              />
            </SettingRow>

            <View style={styles.separator} />

            <SettingRow label={t("settings.swipe")} hint={t("settings.swipeHint")} icon="swap-horizontal">
              <Switch
                value={swipeMove}
                onValueChange={setSwipeMove}
                trackColor={switchColors}
                accessibilityLabel={t("settings.swipe")}
              />
            </SettingRow>

            <View style={styles.separator} />

            <SettingRow label={t("settings.language")} icon="language" stacked>
              <Segmented
                options={languageOptions}
                value={language}
                onChange={setLanguage}
                accessibilityLabel={t("settings.language")}
              />
            </SettingRow>

            <View style={styles.separator} />

            <SettingRow label={t("settings.audioLog")} hint={t("settings.audioLogHint")} icon="bug-outline">
              <TouchableOpacity
                style={styles.logButton}
                onPress={() => {
                  Share.share({ message: getAudioLog() || "(empty)" }).catch(() => {});
                }}
                accessibilityRole="button"
                accessibilityLabel={t("settings.audioLog")}
              >
                <Ionicons name="share-outline" size={20} color="#000" />
              </TouchableOpacity>
            </SettingRow>

            <View style={styles.separator} />

            <View style={styles.infoBox}>
              <Ionicons name="information-circle-outline" size={20} color="#aaa" />
              <Text style={styles.infoText} maxFontSizeMultiplier={1.3}>
                {t("settings.autosave")}
              </Text>
            </View>
          </View>
        </ScrollView>
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
    width: "100%",
    borderBottomWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    zIndex: 10,
  },
  scrollContent: { alignItems: "center", paddingVertical: 20 },
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
  mainCard: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    padding: 16,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    minHeight: MIN_TOUCH,
    paddingVertical: 6,
  },
  settingRowStacked: { flexDirection: "column", alignItems: "stretch" },
  settingLabelContainer: { flexDirection: "row", alignItems: "center", flexShrink: 1 },
  settingLabel: { color: "#fff", fontWeight: "700", fontSize: 16 },
  settingHint: { color: "#a9a9a9", fontSize: 12, marginTop: 2 },
  separator: { height: 1, backgroundColor: "rgba(255,255,255,0.08)", marginVertical: 10 },
  segmentedContainer: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 12,
    padding: 3,
  },
  segment: {
    flex: 1,
    minHeight: MIN_TOUCH,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  logButton: { width: MIN_TOUCH, height: MIN_TOUCH, borderRadius: MIN_TOUCH / 2, backgroundColor: "#FFD700", alignItems: "center", justifyContent: "center" },
  segmentActive: { backgroundColor: "#FFD700" },
  segmentText: { color: "#d0d0d0", fontWeight: "900", fontSize: 12, letterSpacing: 1 },
  segmentTextActive: { color: "#000" },
  infoBox: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 4 },
  infoText: { color: "#b0b0b0", fontSize: 12, flexShrink: 1 },
});

export default SettingsScreen;
