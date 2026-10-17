import React from "react";
import { View, StyleSheet, TouchableOpacity, ScrollView, TextInput, Share, ImageBackground, Linking } from "react-native";
import { useWindowDimensions } from "../ui/layout/scaledWindow";
import Text from "../ui/components/Text";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";
import { SafeAreaView } from "react-native-safe-area-context";
import { MIN_TOUCH } from "../ui/layout/useGameLayout";
import { Ionicons } from "@expo/vector-icons";
import { useSettingsStore } from "../state/settings/store";
import type { AttackButtonPlacement, ControlPosition, ControlSize, JoystickSkin, MovePadStyle } from "../state/settings/types";
import { JoystickPreview } from "../ui/components/JoystickBase";
import ScreenHeader from "../ui/components/ScreenHeader";
import { CategoryNav } from "../ui/components/CategoryNav";
import { GOLD, LevelSlider, RoundAction, RowDivider, Segmented, SettingCard, SettingRow, ToggleSwitch } from "../ui/components/settings/SettingsParts";
import type { SegmentOption } from "../ui/components/settings/SettingsParts";
import { getAudioLog } from "../audio/audioDiagnostics";
import { cancelReminders, remindersSupported, requestReminderPermission, syncReminders } from "../services/reminders";
import { getLocalStats , resetLocalStats } from "../services/localStats";
import { emitSound } from "../audio/audioEventBus";
import { copyBackupCode, readClipboard, restoreBackupCode } from "../services/backup";
import { decodeBackup, summarize } from "../core/stats/backup";
import { adoptCloudKey, disableCloud, enableCloud, fetchCloudBackup, getCloudState, syncCloudNow } from "../services/cloudBackup";
import type { CloudState } from "../services/cloudBackup";
import { formatKey, normalizeKey } from "../core/cloud/cloudKey";
import * as Clipboard from "expo-clipboard";
import type { DecodeFailure } from "../core/stats/backup";
import { VOLUME_STEPS } from "../core/audio/volume";
import type { LanguagePreference } from "../i18n/translate";
import { useT } from "../i18n/useT";
import type { TranslationKey } from "../i18n/en";
import { GAME_CONFIG } from "../config/gameConfig";
import { isReal } from "../config/isReal";
import appJson from "../../app.json";

type Props = NativeStackScreenProps<RootStackParamList, "SettingsScreen">;

type CategoryId = "sound" | "controls" | "access" | "language" | "data" | "about";
const CATEGORIES: { id: CategoryId; icon: keyof typeof Ionicons.glyphMap; tint: string; label: TranslationKey }[] = [
  { id: "sound", icon: "volume-high", tint: "#4FC3F7", label: "settings.section.sound" },
  { id: "controls", icon: "game-controller", tint: "#FFAB40", label: "settings.section.controls" },
  { id: "access", icon: "eye", tint: "#9EE37D", label: "settings.section.accessibility" },
  { id: "language", icon: "language", tint: "#CE93D8", label: "settings.section.language" },
  { id: "data", icon: "save", tint: "#80CBC4", label: "settings.section.data" },
  { id: "about", icon: "information-circle", tint: "#B0BEC5", label: "settings.section.about" },
];

/** A link is shown only once it points to a real page (the shipped defaults are placeholders). */


const SettingsScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useT();
  const { width } = useWindowDimensions();
  // Development only (web): `?cat=controls` opens that category, for screenshots.
  const devCategory = __DEV__ && typeof location !== "undefined" ? (new URLSearchParams(location.search).get("cat") as CategoryId | null) : null;
  // The joystick try-out must not scroll the page while it is being used.
  const [tryingStick, setTryingStick] = React.useState(false);
  const [category, setCategory] = React.useState<CategoryId>(devCategory && CATEGORIES.some(c => c.id === devCategory) ? devCategory : "sound");

  const soundEnabled = useSettingsStore(s => s.soundEnabled);
  const hapticsEnabled = useSettingsStore(s => s.hapticsEnabled);
  const reduceFlash = useSettingsStore(s => s.reduceFlash);
  const controlPosition = useSettingsStore(s => s.controlPosition);
  const language = useSettingsStore(s => s.language);
  const attackButton = useSettingsStore(s => s.attackButton);
  const movePad = useSettingsStore(s => s.movePad);
  const joystickSkin = useSettingsStore(s => s.joystickSkin);
  const controlSize = useSettingsStore(s => s.controlSize);
  const swipeMove = useSettingsStore(s => s.swipeMove);
  const dragAim = useSettingsStore(s => s.dragAim);
  const musicVolume = useSettingsStore(s => s.musicVolume);
  const sfxVolume = useSettingsStore(s => s.sfxVolume);
  const setMusicVolume = useSettingsStore(s => s.setMusicVolume);
  const setSfxVolume = useSettingsStore(s => s.setSfxVolume);
  const setMovePad = useSettingsStore(s => s.setMovePad);
  const setJoystickSkin = useSettingsStore(s => s.setJoystickSkin);
  const setControlSize = useSettingsStore(s => s.setControlSize);
  const setAttackButton = useSettingsStore(s => s.setAttackButton);
  const setSwipeMove = useSettingsStore(s => s.setSwipeMove);
  const setDragAim = useSettingsStore(s => s.setDragAim);
  const setSoundEnabled = useSettingsStore(s => s.setSoundEnabled);
  const setHapticsEnabled = useSettingsStore(s => s.setHapticsEnabled);
  const setReduceFlash = useSettingsStore(s => s.setReduceFlash);
  const setControlPosition = useSettingsStore(s => s.setControlPosition);
  const setLanguage = useSettingsStore(s => s.setLanguage);
  const remindersEnabled = useSettingsStore(s => s.remindersEnabled);
  const setRemindersEnabled = useSettingsStore(s => s.setRemindersEnabled);
  const [reminderDenied, setReminderDenied] = React.useState(false);
  const onToggleReminders = async (on: boolean) => {
    setReminderDenied(false);
    if (!on) {
      setRemindersEnabled(false);
      await cancelReminders();
      return;
    }
    if (!(await requestReminderPermission())) {
      setReminderDenied(true);
      return;
    }
    setRemindersEnabled(true);
    void syncReminders(await getLocalStats());
  };

  // ── Data: delete, backup, restore (unchanged behaviour) ────────────────────────────────────────────────
  const [deleteStep, setDeleteStep] = React.useState<0 | 1 | 2>(0);
  const onDelete = async () => {
    if (deleteStep === 0) {
      setDeleteStep(1);
      setTimeout(() => setDeleteStep(step => (step === 1 ? 0 : step)), 4000); // the confirmation expires
      return;
    }
    if (deleteStep === 1) {
      try {
        await resetLocalStats();
      } catch {
        setDeleteStep(0); // it did not work: never tell the player their data is gone when it is not
        return;
      }
      useSettingsStore.getState().setAchievementsSeen(0);
      useSettingsStore.getState().setRemindersEnabled(false);
      void cancelReminders(); // a pending "keep your streak" reminder would refer to progress that no longer exists
      setDeleteStep(2);
    }
  };
  type Notice = { ok: boolean; text: string };
  const [backupNotice, setBackupNotice] = React.useState<Notice | null>(null);
  const [restoreOpen, setRestoreOpen] = React.useState(false);
  const [codeText, setCodeText] = React.useState("");
  const [pending, setPending] = React.useState<ReturnType<typeof summarize> | null>(null);
  const [restoreNotice, setRestoreNotice] = React.useState<Notice | null>(null);
  // ── Cloud copy ──────────────────────────────────────────────────────────────────────────────────────────
  const [cloud, setCloud] = React.useState<CloudState>({ key: null, lastSaved: null });
  const [cloudNotice, setCloudNotice] = React.useState<Notice | null>(null);
  const [cloudBusy, setCloudBusy] = React.useState(false);
  React.useEffect(() => {
    void getCloudState().then(setCloud);
  }, []);
  const onToggleCloud = async (on: boolean) => {
    if (cloudBusy) return;
    setCloudBusy(true);
    setCloudNotice(null);
    try {
      if (on) {
        const key = await enableCloud();
        if (key) setCloudNotice({ ok: true, text: t("cloud.saved") });
        else setCloudNotice({ ok: false, text: t("cloud.enableFailed") });
      } else {
        await disableCloud();
      }
      setCloud(await getCloudState());
    } finally {
      setCloudBusy(false);
    }
  };
  const onSaveNow = async () => {
    if (cloudBusy) return;
    setCloudBusy(true);
    try {
      const ok = await syncCloudNow();
      setCloudNotice({ ok, text: ok ? t("cloud.saved") : t("cloud.saveFailed") });
      setCloud(await getCloudState());
    } finally {
      setCloudBusy(false);
    }
  };
  const onCopyKey = async () => {
    if (!cloud.key) return;
    try {
      await Clipboard.setStringAsync(cloud.key);
      setCloudNotice({ ok: true, text: t("cloud.copied") });
    } catch {
      setCloudNotice({ ok: false, text: t("backup.copyFailed") });
    }
  };

  const onCopyCode = async () => {
    const code = await copyBackupCode();
    setBackupNotice(code ? { ok: true, text: t("backup.copied") } : { ok: false, text: t("backup.copyFailed") });
  };
  const onPaste = async () => {
    setCodeText(await readClipboard());
    setPending(null);
    setRestoreNotice(null);
  };
  // The text may be a progress code or a cloud key: a key is turned into its code first.
  const [resolved, setResolved] = React.useState<{ code: string; key: string | null } | null>(null);
  const onCheck = async () => {
    let code = codeText;
    let key: string | null = null;
    if (normalizeKey(codeText)) {
      const fetched = await fetchCloudBackup(codeText);
      if (!fetched.ok) {
        setPending(null);
        setRestoreNotice({ ok: false, text: t(`backup.err.${fetched.reason}`) });
        return;
      }
      code = fetched.code;
      key = fetched.key;
    }
    const result = decodeBackup(code);
    if (result.ok) {
      setResolved({ code, key });
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
    const done = await restoreBackupCode(resolved?.code ?? codeText);
    setPending(null);
    if (done) {
      if (resolved?.key) {
        await adoptCloudKey(resolved.key);
        setCloud(await getCloudState());
      }
      setResolved(null);
      setCodeText("");
      setRestoreOpen(false);
      setDeleteStep(0);
    }
    setRestoreNotice({ ok: done, text: done ? t("backup.restored") : t("backup.restoreFailed") });
  };

  // ── Options ─────────────────────────────────────────────────────────────────────────────────────────────
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
  const padOptions: SegmentOption<MovePadStyle>[] = [
    { value: "fixed", label: t("settings.padFixed") },
    { value: "floating", label: t("settings.padFloating") },
  ];
  const skinOptions: SegmentOption<JoystickSkin>[] = [
    { value: "console", label: t("settings.skinConsole") },
    { value: "arcade", label: t("settings.skinArcade") },
  ];
  const languageOptions: SegmentOption<LanguagePreference>[] = [
    { value: "auto", label: t("settings.languageAuto") },
    { value: "en", label: t("settings.languageEn") },
    { value: "es", label: t("settings.languageEs") },
  ];

  // ── Panes ───────────────────────────────────────────────────────────────────────────────────────────────
  const soundPane = (
    <>
      <SettingCard>
        <SettingRow label={t("settings.sound")} icon={soundEnabled ? "volume-high" : "volume-mute"} tint="#4FC3F7">
          <ToggleSwitch value={soundEnabled} onValueChange={setSoundEnabled} accessibilityLabel={t("settings.sound")} />
        </SettingRow>
      </SettingCard>
      <SettingCard title={t("settings.volumes")}>
        <SettingRow label={t("settings.music")} icon="musical-notes" tint="#B39DDB" stacked dimmed={!soundEnabled}>
          <LevelSlider
            value={musicVolume}
            steps={VOLUME_STEPS}
            onChange={setMusicVolume}
            valueLabel={t("settings.volumeLevel", { n: musicVolume })}
            accessibilityLabel={t("settings.music")}
          />
        </SettingRow>
        <RowDivider />
        <SettingRow label={t("settings.effects")} icon="pulse" tint="#FF8A65" stacked dimmed={!soundEnabled}>
          <LevelSlider
            value={sfxVolume}
            steps={VOLUME_STEPS}
            onChange={setSfxVolume}
            // A sample at the new level, so it can be judged by ear (the level reaches the player a moment after it changes).
            onRelease={() => setTimeout(() => emitSound("COIN_COLLECTED"), 140)}
            valueLabel={t("settings.volumeLevel", { n: sfxVolume })}
            accessibilityLabel={t("settings.effects")}
          />
        </SettingRow>
      </SettingCard>
    </>
  );

  const controlsPane = (
    <>
      <SettingCard title={t("settings.group.move")}>
        <SettingRow label={t("settings.movePad")} hint={t("settings.movePadHint")} icon="navigate-circle" tint="#FFAB40" stacked>
          <Segmented options={padOptions} value={movePad} onChange={setMovePad} accessibilityLabel={t("settings.movePad")} />
        </SettingRow>
        {movePad === "floating" && (
          <>
            <RowDivider />
            <SettingRow label={t("settings.joystickSkin")} icon="color-palette" tint="#F48FB1" stacked>
              <Segmented options={skinOptions} value={joystickSkin} onChange={setJoystickSkin} accessibilityLabel={t("settings.joystickSkin")} />
              <View style={styles.tryRow}>
                <JoystickPreview skin={joystickSkin} radius={56} onActiveChange={setTryingStick} />
                <Text style={styles.tryText} maxFontSizeMultiplier={1.3}>
                  {t("settings.joystickTry")}
                </Text>
              </View>
            </SettingRow>
          </>
        )}
        <RowDivider />
        <SettingRow label={t("settings.swipe")} hint={t("settings.swipeHint")} icon="swap-horizontal" tint="#4DB6AC">
          <ToggleSwitch value={swipeMove} onValueChange={setSwipeMove} accessibilityLabel={t("settings.swipe")} />
        </SettingRow>
      </SettingCard>

      <SettingCard title={t("settings.group.attack")}>
        <SettingRow label={t("settings.attackButton")} hint={t("settings.attackHint")} icon="flash" tint="#FF7043" stacked>
          <Segmented options={attackOptions} value={attackButton} onChange={setAttackButton} accessibilityLabel={t("settings.attackButton")} />
        </SettingRow>
        <RowDivider />
        <SettingRow label={t("settings.dragAim")} hint={t("settings.dragAimHint")} icon="locate" tint="#EF5350">
          <ToggleSwitch value={dragAim} onValueChange={setDragAim} accessibilityLabel={t("settings.dragAim")} />
        </SettingRow>
      </SettingCard>

      <SettingCard title={t("settings.group.layout")}>
        <SettingRow label={t("settings.controls")} icon="game-controller" tint="#FFD54F" stacked>
          <Segmented options={controlOptions} value={controlPosition} onChange={setControlPosition} accessibilityLabel={t("settings.controls")} />
        </SettingRow>
        <RowDivider />
        <SettingRow label={t("settings.controlSize")} icon="resize" tint="#81C784" stacked>
          <Segmented options={sizeOptions} value={controlSize} onChange={setControlSize} accessibilityLabel={t("settings.controlSize")} />
        </SettingRow>
      </SettingCard>
    </>
  );

  const accessPane = (
    <SettingCard>
      <SettingRow label={t("settings.haptics")} icon="phone-portrait-outline" tint="#9EE37D">
        <ToggleSwitch value={hapticsEnabled} onValueChange={setHapticsEnabled} accessibilityLabel={t("settings.haptics")} />
      </SettingRow>
      {remindersSupported() ? (
        <>
          <RowDivider />
          <SettingRow label={t("settings.reminder")} hint={reminderDenied ? t("settings.reminderDenied") : t("settings.reminderHint")} icon="notifications" tint="#FFB74D">
            <ToggleSwitch value={remindersEnabled} onValueChange={onToggleReminders} accessibilityLabel={t("settings.reminder")} />
          </SettingRow>
        </>
      ) : null}
      <RowDivider />
      <SettingRow label={t("settings.reduceFlash")} hint={t("settings.reduceFlashHint")} icon="flash-off-outline" tint="#FFF176">
        <ToggleSwitch value={reduceFlash} onValueChange={setReduceFlash} accessibilityLabel={t("settings.reduceFlash")} />
      </SettingRow>
    </SettingCard>
  );

  const languagePane = (
    <SettingCard>
      <SettingRow label={t("settings.language")} icon="language" tint="#CE93D8" stacked>
        <Segmented options={languageOptions} value={language} onChange={setLanguage} accessibilityLabel={t("settings.language")} />
      </SettingRow>
    </SettingCard>
  );

  const dataPane = (
    <>
      <SettingCard title={t("settings.group.cloud")}>
        <SettingRow label={t("cloud.toggle")} hint={t("cloud.hint")} icon="cloud-outline" tint="#81D4FA">
          <ToggleSwitch value={!!cloud.key} onValueChange={v => void onToggleCloud(v)} accessibilityLabel={t("cloud.toggle")} />
        </SettingRow>
        {cloud.key ? (
          <View style={styles.restorePanel}>
            <Text style={styles.keyLabel} maxFontSizeMultiplier={1.2}>
              {t("cloud.key").toLocaleUpperCase()}
            </Text>
            <Text selectable style={styles.keyText} accessibilityLabel={`${t("cloud.key")}: ${cloud.key.split("").join(" ")}`} maxFontSizeMultiplier={1.2}>
              {formatKey(cloud.key)}
            </Text>
            <Text style={styles.confirmWarn} maxFontSizeMultiplier={1.3}>
              {t("cloud.keyHint")}
            </Text>
            <View style={styles.buttonRow}>
              <TouchableOpacity style={[styles.pill, styles.pillGhost]} onPress={() => void onCopyKey()} accessibilityRole="button">
                <Text style={styles.pillGhostText} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.2}>
                  {t("cloud.copyKey").toLocaleUpperCase()}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.pill, styles.pillGold, cloudBusy && { opacity: 0.6 }]} onPress={() => void onSaveNow()} disabled={cloudBusy} accessibilityRole="button">
                <Text style={styles.pillGoldText} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.2}>
                  {t("cloud.saveNow").toLocaleUpperCase()}
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.keyLast} maxFontSizeMultiplier={1.2}>
              {cloud.lastSaved ? t("cloud.last", { time: new Date(cloud.lastSaved).toLocaleString() }) : t("cloud.never")}
            </Text>
          </View>
        ) : null}
        {cloudNotice ? (
          <Text style={[styles.notice, cloudNotice.ok ? styles.noticeOk : styles.noticeBad]} accessibilityLiveRegion="polite" maxFontSizeMultiplier={1.3}>
            {cloudNotice.text}
          </Text>
        ) : null}
      </SettingCard>

      <SettingCard title={t("settings.group.backup")}>
        <SettingRow label={t("backup.copy")} hint={t("backup.copyHint")} icon="copy-outline" tint="#80CBC4">
          <RoundAction icon="copy" onPress={onCopyCode} label={t("backup.copy")} />
        </SettingRow>
        {backupNotice ? (
          <Text style={[styles.notice, backupNotice.ok ? styles.noticeOk : styles.noticeBad]} accessibilityLiveRegion="polite" maxFontSizeMultiplier={1.3}>
            {backupNotice.text}
          </Text>
        ) : null}
        <RowDivider />
        <SettingRow label={t("backup.restore")} hint={t("backup.restoreHint")} icon="download-outline" tint="#4FC3F7">
          <RoundAction
            icon={restoreOpen ? "chevron-up" : "chevron-down"}
            label={t("backup.restore")}
            onPress={() => {
              setRestoreOpen(open => !open);
              setPending(null);
              setRestoreNotice(null);
            }}
          />
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
              <Text style={[styles.notice, restoreNotice.ok ? styles.noticeOk : styles.noticeBad]} accessibilityLiveRegion="polite" maxFontSizeMultiplier={1.3}>
                {restoreNotice.text}
              </Text>
            ) : null}
          </View>
        ) : restoreNotice?.ok ? (
          <Text style={[styles.notice, styles.noticeOk]} accessibilityLiveRegion="polite" maxFontSizeMultiplier={1.3}>
            {restoreNotice.text}
          </Text>
        ) : null}
      </SettingCard>

      <SettingCard title={t("settings.group.support")}>
        <SettingRow label={t("settings.audioLog")} hint={t("settings.audioLogHint")} icon="bug-outline" tint="#B0BEC5">
          <RoundAction icon="share-outline" label={t("settings.audioLog")} onPress={() => Share.share({ message: getAudioLog() || "(empty)" }).catch(() => {})} />
        </SettingRow>
      </SettingCard>

      <SettingCard title={t("settings.group.danger")}>
        <SettingRow label={t("settings.delete")} hint={deleteStep === 2 ? t("settings.deleteDone") : t("settings.deleteHint")} icon="trash-outline" tint="#FF8A80">
          <RoundAction
            icon={deleteStep === 2 ? "checkmark" : "trash"}
            tone={deleteStep === 1 ? "dangerOn" : "danger"}
            disabled={deleteStep === 2}
            onPress={onDelete}
            label={deleteStep === 1 ? t("settings.deleteConfirm") : t("settings.delete")}
          />
        </SettingRow>
      </SettingCard>

      <View style={styles.infoBox}>
        <Ionicons name="information-circle-outline" size={18} color="#aaa" />
        <Text style={styles.infoText} maxFontSizeMultiplier={1.3}>
          {t("settings.autosave")}
        </Text>
      </View>
    </>
  );

  const version = (appJson as { expo?: { version?: string } }).expo?.version ?? "";
  const aboutPane = (
    <>
      <View style={styles.aboutHero}>
        <Text style={styles.aboutName} maxFontSizeMultiplier={1.2}>
          WUMPUS
        </Text>
        <Text style={styles.aboutSub} maxFontSizeMultiplier={1.2}>
          ADVENTURES
        </Text>
        <Text style={styles.aboutTag} maxFontSizeMultiplier={1.3}>
          {t("cover.tagline")}
        </Text>
        <View style={styles.versionPill}>
          <Text style={styles.versionText} maxFontSizeMultiplier={1.2}>
            {t("settings.version", { v: version })}
          </Text>
        </View>
      </View>
      {isReal(GAME_CONFIG.support.email) || isReal(GAME_CONFIG.monetization.privacyUrl) || isReal(GAME_CONFIG.monetization.termsUrl) ? (
        <SettingCard>
          {isReal(GAME_CONFIG.support.email) && (
            <SettingRow label={t("settings.contact")} hint={GAME_CONFIG.support.email} icon="mail" tint="#4FC3F7">
              <RoundAction icon="open-outline" label={t("settings.contact")} onPress={() => void Linking.openURL(`mailto:${GAME_CONFIG.support.email}`).catch(() => {})} />
            </SettingRow>
          )}
          {isReal(GAME_CONFIG.monetization.privacyUrl) && (
            <>
              <RowDivider />
              <SettingRow label={t("settings.privacy")} icon="shield-checkmark" tint="#81C784">
                <RoundAction icon="open-outline" label={t("settings.privacy")} onPress={() => void Linking.openURL(GAME_CONFIG.monetization.privacyUrl).catch(() => {})} />
              </SettingRow>
            </>
          )}
          {isReal(GAME_CONFIG.monetization.termsUrl) && (
            <>
              <RowDivider />
              <SettingRow label={t("settings.terms")} icon="document-text" tint="#FFB74D">
                <RoundAction icon="open-outline" label={t("settings.terms")} onPress={() => void Linking.openURL(GAME_CONFIG.monetization.termsUrl).catch(() => {})} />
              </SettingRow>
            </>
          )}
        </SettingCard>
      ) : null}
    </>
  );

  const panes: Record<CategoryId, React.ReactNode> = { sound: soundPane, controls: controlsPane, access: accessPane, language: languagePane, data: dataPane, about: aboutPane };

  // Wide windows get a rail of categories on the left; narrow ones a row of chips on top.
  const wide = width >= 640;
  const railWidth = Math.min(230, Math.max(180, width * 0.24));
  const navItems = CATEGORIES.map(c => ({ id: c.id, icon: c.icon, tint: c.tint, label: t(c.label) }));
  const paneBody = (
    <ScrollView scrollEnabled={!tryingStick} contentContainerStyle={styles.paneContent} showsVerticalScrollIndicator={false}>
      <View style={styles.paneInner}>{panes[category]}</View>
    </ScrollView>
  );

  return (
    <ImageBackground fadeDuration={0} resizeMethod="none" source={require("../assets/sprites/backgrounds/Cover_Background.png")} style={styles.root} resizeMode="cover">
      <SafeAreaView style={{ flex: 1, backgroundColor: "rgba(6,4,16,0.9)" }}>
        <ScreenHeader title={t("settings.title")} onBack={() => navigation.goBack()} />

        {wide ? (
          <View style={styles.body}>
            <CategoryNav items={navItems} value={category} onChange={setCategory} wide railWidth={railWidth} />
            <View style={{ flex: 1 }}>{paneBody}</View>
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            <CategoryNav items={navItems} value={category} onChange={setCategory} wide={false} />
            {paneBody}
          </View>
        )}
      </SafeAreaView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  body: { flex: 1, flexDirection: "row" },
  paneContent: { paddingHorizontal: 14, paddingVertical: 14, alignItems: "center" },
  paneInner: { width: "100%", maxWidth: 640, gap: 16 },
  tryRow: { flexDirection: "row", alignItems: "center", gap: 16, marginTop: 10 },
  tryText: { flex: 1, color: "#b8b4d0", fontSize: 13, fontWeight: "700" },
  keyLabel: { color: "#8f8aab", fontWeight: "900", fontSize: 11, letterSpacing: 2 },
  keyText: { color: "#FFD54F", fontWeight: "900", fontSize: 22, letterSpacing: 3, textAlign: "center", paddingVertical: 8, backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 12 },
  keyLast: { color: "#8f8aab", fontSize: 12, fontWeight: "700", textAlign: "center" },
  notice: { fontSize: 12.5, fontWeight: "700", paddingBottom: 10, paddingHorizontal: 4 },
  noticeOk: { color: "#9ee37d" },
  noticeBad: { color: "#FF8A80" },
  restorePanel: { gap: 10, paddingBottom: 12 },
  codeInput: { minHeight: 72, maxHeight: 120, borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.18)", backgroundColor: "rgba(0,0,0,0.35)", color: "#fff", padding: 10, fontSize: 13, textAlignVertical: "top" },
  buttonRow: { flexDirection: "row", gap: 10 },
  pill: { flex: 1, minHeight: MIN_TOUCH, borderRadius: 14, alignItems: "center", justifyContent: "center", paddingHorizontal: 10 },
  pillGold: { backgroundColor: GOLD },
  pillGoldText: { color: "#1a1200", fontWeight: "900", letterSpacing: 1, fontSize: 13 },
  pillGhost: { borderWidth: 1.5, borderColor: "rgba(255,255,255,0.3)" },
  pillGhostText: { color: "#fff", fontWeight: "900", letterSpacing: 1, fontSize: 13 },
  pillDanger: { backgroundColor: "#FF5252" },
  pillDangerText: { color: "#fff", fontWeight: "900", letterSpacing: 1, fontSize: 13 },
  confirmBox: { gap: 8, padding: 12, borderRadius: 12, backgroundColor: "rgba(255,82,82,0.1)", borderWidth: 1, borderColor: "rgba(255,82,82,0.4)" },
  confirmText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  confirmWarn: { color: "#FF8A80", fontSize: 12 },
  infoBox: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 6 },
  infoText: { color: "#b0b0b0", fontSize: 12, flexShrink: 1 },
  aboutHero: { alignItems: "center", paddingVertical: 20, borderRadius: 18, backgroundColor: "rgba(18,14,38,0.9)", borderWidth: 1, borderColor: "rgba(255,255,255,0.09)", gap: 2 },
  aboutName: { color: GOLD, fontWeight: "900", fontSize: 38, letterSpacing: 6 },
  aboutSub: { color: "#fff", fontWeight: "900", fontSize: 14, letterSpacing: 8 },
  aboutTag: { color: "#a9a3c6", fontSize: 13, fontWeight: "700", marginTop: 8, textAlign: "center", paddingHorizontal: 16 },
  versionPill: { marginTop: 12, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.08)" },
  versionText: { color: "#d8d2f0", fontWeight: "800", fontSize: 12.5, letterSpacing: 0.6 },
});

export default SettingsScreen;
