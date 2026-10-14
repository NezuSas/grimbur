import React from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  TextInput,
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
import { resetLocalStats } from "../services/localStats";
import { copyBackupCode, readClipboard, restoreBackupCode } from "../services/backup";
import { decodeBackup, summarize } from "../core/stats/backup";
import type { DecodeFailure } from "../core/stats/backup";
import { VOLUME_STEPS } from "../core/audio/volume";
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
  /** Fades the row (its control stays usable), e.g. volumes while the master sound switch is off. */
  dimmed?: boolean;
};

/** Module-level so the screen never remounts its rows. */
const SettingRow = ({ label, hint, icon, children, stacked, dimmed }: RowProps) => (
  <View style={[styles.settingRow, stacked && styles.settingRowStacked, dimmed && { opacity: 0.5 }]}>
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

/** A titled group of rows. */
const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <View>
    <Text style={styles.sectionTitle} accessibilityRole="header" maxFontSizeMultiplier={1.3}>
      {title.toLocaleUpperCase()}
    </Text>
    <View style={styles.mainCard}>{children}</View>
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
  const musicVolume = useSettingsStore(s => s.musicVolume);
  const sfxVolume = useSettingsStore(s => s.sfxVolume);
  const setMusicVolume = useSettingsStore(s => s.setMusicVolume);
  const setSfxVolume = useSettingsStore(s => s.setSfxVolume);
  const [deleteStep, setDeleteStep] = React.useState<0 | 1 | 2>(0);
  const onDelete = async () => {
    if (deleteStep === 0) {
      setDeleteStep(1);
      setTimeout(() => setDeleteStep(step => (step === 1 ? 0 : step)), 4000); // the confirmation expires
      return;
    }
    if (deleteStep === 1) {
      await resetLocalStats().catch(() => {});
      useSettingsStore.getState().setAchievementsSeen(0);
      setDeleteStep(2);
    }
  };
  type Notice = { ok: boolean; text: string };
  const [backupNotice, setBackupNotice] = React.useState<Notice | null>(null);
  const [restoreOpen, setRestoreOpen] = React.useState(false);
  const [codeText, setCodeText] = React.useState("");
  const [pending, setPending] = React.useState<ReturnType<typeof summarize> | null>(null);
  const [restoreNotice, setRestoreNotice] = React.useState<Notice | null>(null);
  const onCopyCode = async () => {
    const code = await copyBackupCode();
    setBackupNotice(code ? { ok: true, text: t("backup.copied") } : { ok: false, text: t("backup.copyFailed") });
  };
  const onPaste = async () => {
    setCodeText(await readClipboard());
    setPending(null);
    setRestoreNotice(null);
  };
  const onCheck = () => {
    const result = decodeBackup(codeText);
    if (result.ok) {
      setPending(summarize(result.stats));
      setRestoreNotice(null);
    } else {
      setPending(null);
      const reason: DecodeFailure = result.reason;
      setRestoreNotice({ ok: false, text: t(`backup.err.${reason}`) });
    }
  };
  // Nothing is replaced until the player confirms the summary shown by "Check code".
  const onConfirmRestore = async () => {
    const done = await restoreBackupCode(codeText);
    setPending(null);
    if (done) {
      setCodeText("");
      setRestoreOpen(false);
      setDeleteStep(0);
    }
    setRestoreNotice({ ok: done, text: done ? t("backup.restored") : t("backup.restoreFailed") });
  };
  const setAttackButton = useSettingsStore(s => s.setAttackButton);
  const setSwipeMove = useSettingsStore(s => s.setSwipeMove);
  const setSoundEnabled = useSettingsStore(s => s.setSoundEnabled);
  const setHapticsEnabled = useSettingsStore(s => s.setHapticsEnabled);
  const setReduceFlash = useSettingsStore(s => s.setReduceFlash);
  const setControlPosition = useSettingsStore(s => s.setControlPosition);
  const setLanguage = useSettingsStore(s => s.setLanguage);

  // The SafeAreaView already removes the notch insets from the space the card lives in.
  const cardWidth = Math.min(width - insets.left - insets.right - 32, 560);

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

  const volumeOptions: SegmentOption<string>[] = VOLUME_STEPS.map(step => ({ value: String(step), label: t("settings.volumeLevel", { n: step }) }));

  const switchColors = { false: "#555", true: "#4caf50" };

  return (
    <ImageBackground fadeDuration={0} resizeMethod="none" source={require("../assets/sprites/backgrounds/Cover_Background.png")} style={styles.root} resizeMode="cover">
      <SafeAreaView style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.85)" }}>
        <View style={[styles.header, { paddingVertical: spacing(12), minHeight: MIN_TOUCH + 12 }]}>
          <TouchableOpacity
            style={[styles.backButton, { left: 12 }]}
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
          <View style={{ width: cardWidth, gap: 14 }}>
            <Section title={t("settings.section.sound")}>
              <SettingRow label={t("settings.sound")} icon={soundEnabled ? "volume-high" : "volume-mute"}>
                <Switch
                  value={soundEnabled}
                  onValueChange={setSoundEnabled}
                  trackColor={switchColors}
                  accessibilityLabel={t("settings.sound")}
                />
              </SettingRow>

              <View style={styles.separator} />

              <SettingRow label={t("settings.music")} icon="musical-notes" stacked dimmed={!soundEnabled}>
                <Segmented
                  options={volumeOptions}
                  value={String(musicVolume)}
                  onChange={v => setMusicVolume(Number(v))}
                  accessibilityLabel={t("settings.music")}
                />
              </SettingRow>

              <View style={styles.separator} />

              <SettingRow label={t("settings.effects")} icon="pulse" stacked dimmed={!soundEnabled}>
                <Segmented
                  options={volumeOptions}
                  value={String(sfxVolume)}
                  onChange={v => setSfxVolume(Number(v))}
                  accessibilityLabel={t("settings.effects")}
                />
              </SettingRow>
            </Section>

            <Section title={t("settings.section.controls")}>
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

              <SettingRow label={t("settings.haptics")} icon="phone-portrait-outline">
                <Switch
                  value={hapticsEnabled}
                  onValueChange={setHapticsEnabled}
                  trackColor={switchColors}
                  accessibilityLabel={t("settings.haptics")}
                />
              </SettingRow>
            </Section>

            <Section title={t("settings.section.accessibility")}>
              <SettingRow label={t("settings.reduceFlash")} hint={t("settings.reduceFlashHint")} icon="flash-off-outline">
                <Switch
                  value={reduceFlash}
                  onValueChange={setReduceFlash}
                  trackColor={switchColors}
                  accessibilityLabel={t("settings.reduceFlash")}
                />
              </SettingRow>
            </Section>

            <Section title={t("settings.section.language")}>
              <SettingRow label={t("settings.language")} icon="language" stacked>
                <Segmented
                  options={languageOptions}
                  value={language}
                  onChange={setLanguage}
                  accessibilityLabel={t("settings.language")}
                />
              </SettingRow>
            </Section>

            <Section title={t("settings.section.data")}>
              <SettingRow label={t("backup.copy")} hint={t("backup.copyHint")} icon="copy-outline">
                <TouchableOpacity
                  style={styles.logButton}
                  onPress={onCopyCode}
                  accessibilityRole="button"
                  accessibilityLabel={t("backup.copy")}
                >
                  <Ionicons name="copy" size={20} color="#000" />
                </TouchableOpacity>
              </SettingRow>
              {backupNotice ? (
                <Text
                  style={[styles.notice, backupNotice.ok ? styles.noticeOk : styles.noticeBad]}
                  accessibilityLiveRegion="polite"
                  maxFontSizeMultiplier={1.3}
                >
                  {backupNotice.text}
                </Text>
              ) : null}

              <View style={styles.separator} />

              <SettingRow label={t("backup.restore")} hint={t("backup.restoreHint")} icon="download-outline">
                <TouchableOpacity
                  style={styles.logButton}
                  onPress={() => {
                    setRestoreOpen(open => !open);
                    setPending(null);
                    setRestoreNotice(null);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: restoreOpen }}
                  accessibilityLabel={t("backup.restore")}
                >
                  <Ionicons name={restoreOpen ? "chevron-up" : "chevron-down"} size={20} color="#000" />
                </TouchableOpacity>
              </SettingRow>
              {restoreOpen ? (
                <View style={styles.restorePanel}>
                  <TextInput
                    value={codeText}
                    onChangeText={text => {
                      setCodeText(text);
                      setPending(null);
                      setRestoreNotice(null);
                    }}
                    placeholder={t("backup.placeholder")}
                    placeholderTextColor="#777"
                    style={styles.codeInput}
                    multiline
                    autoCapitalize="none"
                    autoCorrect={false}
                    spellCheck={false}
                    accessibilityLabel={t("backup.restore")}
                  />
                  {pending ? (
                    <View style={styles.confirmBox}>
                      <Text style={styles.confirmText} maxFontSizeMultiplier={1.3}>
                        {t("backup.summary", { runs: pending.runs, score: pending.bestScore.toLocaleString(), embers: pending.embers, achievements: pending.achievements })}
                      </Text>
                      <Text style={styles.confirmWarn} maxFontSizeMultiplier={1.3}>
                        {t("backup.warn")}
                      </Text>
                      <View style={styles.buttonRow}>
                        <TouchableOpacity style={[styles.pill, styles.pillDanger]} onPress={onConfirmRestore} accessibilityRole="button">
                          <Text style={styles.pillDangerText} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.2}>
                            {t("backup.confirm").toLocaleUpperCase()}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.pill, styles.pillGhost]} onPress={() => setPending(null)} accessibilityRole="button">
                          <Text style={styles.pillGhostText} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.2}>
                            {t("backup.cancel").toLocaleUpperCase()}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.buttonRow}>
                      <TouchableOpacity style={[styles.pill, styles.pillGhost]} onPress={onPaste} accessibilityRole="button">
                        <Text style={styles.pillGhostText} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.2}>
                          {t("backup.paste").toLocaleUpperCase()}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.pill, styles.pillGold]} onPress={onCheck} accessibilityRole="button">
                        <Text style={styles.pillGoldText} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.2}>
                          {t("backup.check").toLocaleUpperCase()}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  {restoreNotice ? (
                    <Text
                      style={[styles.notice, restoreNotice.ok ? styles.noticeOk : styles.noticeBad]}
                      accessibilityLiveRegion="polite"
                      maxFontSizeMultiplier={1.3}
                    >
                      {restoreNotice.text}
                    </Text>
                  ) : null}
                </View>
              ) : restoreNotice?.ok ? (
                <Text style={[styles.notice, styles.noticeOk]} accessibilityLiveRegion="polite" maxFontSizeMultiplier={1.3}>
                  {restoreNotice.text}
                </Text>
              ) : null}

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

              <SettingRow label={t("settings.delete")} hint={deleteStep === 2 ? t("settings.deleteDone") : t("settings.deleteHint")} icon="trash-outline">
                <TouchableOpacity
                  style={[styles.deleteButton, deleteStep === 1 && { backgroundColor: "#FF5252" }]}
                  onPress={onDelete}
                  disabled={deleteStep === 2}
                  accessibilityRole="button"
                  accessibilityLabel={deleteStep === 1 ? t("settings.deleteConfirm") : t("settings.delete")}
                >
                  <Ionicons name={deleteStep === 2 ? "checkmark" : "trash"} size={20} color={deleteStep === 1 ? "#fff" : "#FF8A80"} />
                </TouchableOpacity>
              </SettingRow>

              <View style={styles.separator} />

              <View style={styles.infoBox}>
                <Ionicons name="information-circle-outline" size={20} color="#aaa" />
                <Text style={styles.infoText} maxFontSizeMultiplier={1.3}>
                  {t("settings.autosave")}
                </Text>
              </View>
            </Section>
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
  sectionTitle: { color: "#FFD700", fontWeight: "900", fontSize: 12, letterSpacing: 2, marginBottom: 6, marginLeft: 6 },
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
  deleteButton: { width: MIN_TOUCH, height: MIN_TOUCH, borderRadius: MIN_TOUCH / 2, borderWidth: 1.5, borderColor: "#FF8A80", alignItems: "center", justifyContent: "center" },
  logButton: { width: MIN_TOUCH, height: MIN_TOUCH, borderRadius: MIN_TOUCH / 2, backgroundColor: "#FFD700", alignItems: "center", justifyContent: "center" },
  segmentActive: { backgroundColor: "#FFD700" },
  segmentText: { color: "#d0d0d0", fontWeight: "900", fontSize: 12, letterSpacing: 1 },
  segmentTextActive: { color: "#000" },
  notice: { fontSize: 12, fontWeight: "700", marginTop: 6, paddingHorizontal: 4 },
  noticeOk: { color: "#9ee37d" },
  noticeBad: { color: "#FF8A80" },
  restorePanel: { gap: 10, marginTop: 8 },
  codeInput: { minHeight: 72, maxHeight: 120, borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.18)", backgroundColor: "rgba(0,0,0,0.35)", color: "#fff", padding: 10, fontSize: 13, textAlignVertical: "top" },
  buttonRow: { flexDirection: "row", gap: 10 },
  pill: { flex: 1, minHeight: MIN_TOUCH, borderRadius: 14, alignItems: "center", justifyContent: "center", paddingHorizontal: 10 },
  pillGold: { backgroundColor: "#FFD700" },
  pillGoldText: { color: "#000", fontWeight: "900", letterSpacing: 1, fontSize: 13 },
  pillGhost: { borderWidth: 1.5, borderColor: "rgba(255,255,255,0.3)" },
  pillGhostText: { color: "#fff", fontWeight: "900", letterSpacing: 1, fontSize: 13 },
  pillDanger: { backgroundColor: "#FF5252" },
  pillDangerText: { color: "#fff", fontWeight: "900", letterSpacing: 1, fontSize: 13 },
  confirmBox: { gap: 8, padding: 12, borderRadius: 12, backgroundColor: "rgba(255,82,82,0.1)", borderWidth: 1, borderColor: "rgba(255,82,82,0.4)" },
  confirmText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  confirmWarn: { color: "#FF8A80", fontSize: 12 },
  infoBox: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 4 },
  infoText: { color: "#b0b0b0", fontSize: 12, flexShrink: 1 },
});

export default SettingsScreen;
