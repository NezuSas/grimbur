import React, { useState } from "react";
import { StyleSheet, TextInput, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Text from "../Text";
import EmberIcon from "../EmberIcon";
import SpriteImage from "../SpriteImage";
import { PopButton, PopupPanel } from "../game/popup";
import { Segmented } from "../settings/SettingsParts";
import type { SegmentOption } from "../settings/SettingsParts";
import { useT } from "../../../i18n/useT";
import type { TranslationKey } from "../../../i18n/en";
import characters from "../../../data/characters";
import { MAX_ASCENSION } from "../../../core/engine/ascension";
import { CONFIRM_STAKE, DUEL_FEE_PERCENT, STAKES } from "../../../core/duel/duel";
import { parseChallengeCode } from "../../../core/challenge/code";
import { useWindowDimensions } from "../../layout/scaledWindow";

type Props = {
  mode: "challenge" | "duel";
  /** Embers the player has (a stake above them cannot be chosen). */
  embers: number;
  /** Creates the room: the chosen difficulty and, for a duel, the stake. */
  onCreate: (depth: number, stake: number) => void;
  /** Joins the room whose code was typed (already checked to be a code). */
  onJoin: (code: string) => void;
};

const TINT = { challenge: "#4FC3F7", duel: "#FF8A80" } as const;
const GOLD = "#FFD54F";

/** The two heroes facing each other: the picture that says "you against a friend". */
const VersusArt = ({ tint, size }: { tint: string; size: number }) => (
  <View style={styles.art} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
    <View style={[styles.avatarWrap, { borderColor: tint, width: size, height: size, borderRadius: size / 2 }]}>
      <SpriteImage source={characters[0].scoreImage} style={styles.avatar} accessibilityIgnoresInvertColors />
    </View>
    <LinearGradient colors={[tint, GOLD]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.vs}>
      <Text style={styles.vsText}>VS</Text>
    </LinearGradient>
    <View style={[styles.avatarWrap, { borderColor: GOLD, width: size, height: size, borderRadius: size / 2 }]}>
      <SpriteImage source={characters[2].scoreImage} style={styles.avatar} accessibilityIgnoresInvertColors />
    </View>
  </View>
);

/**
 * Create or join a friend challenge or a live duel: one card with two tabs, so nothing sits side by side and it fits any phone.
 * Creating picks a difficulty (every one is open to a challenge: the rules are shown) and, for a duel, an optional stake.
 */
const FriendCreateJoin = ({ mode, embers, onCreate, onJoin }: Props) => {
  const { t, n: num } = useT();
  const tint = TINT[mode];
  const { height } = useWindowDimensions();
  const [tab, setTab] = useState<"create" | "join">("create");
  const [depth, setDepth] = useState(0);
  const [stake, setStake] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);

  const tabs: SegmentOption<"create" | "join">[] = [
    { value: "create", label: t("friends.tabCreate") },
    { value: "join", label: t("friends.tabJoin") },
  ];
  const depthName = (d: number) => t(`ascension.label.${d}` as TranslationKey);

  const join = () => {
    const parsed = parseChallengeCode(typed);
    if (!parsed) {
      setError(t("challenge.badCode"));
      return;
    }
    setError(null);
    onJoin(parsed.code);
  };

  return (
    <View style={styles.root}>
      <VersusArt tint={tint} size={height < 340 ? 44 : 64} />
      <PopupPanel tint={tint} width="100%">
        <Segmented options={tabs} value={tab} onChange={setTab} accessibilityLabel={t(mode === "duel" ? "duel.title" : "challenge.title")} />

        {tab === "create" ? (
          <>
            <Text style={styles.hint} maxFontSizeMultiplier={1.3}>
              {t(mode === "duel" ? "duel.createHint" : "challenge.createHint")}
            </Text>

            <Text style={styles.label} maxFontSizeMultiplier={1.2}>
              {t("heroes.depth").toLocaleUpperCase()}
            </Text>
            <View style={styles.depthRow}>
              <TouchableOpacity style={[styles.stepper, depth <= 0 && styles.off]} onPress={() => setDepth(d => Math.max(0, d - 1))} disabled={depth <= 0} accessibilityRole="button" accessibilityLabel={t("a11y.depthLower")}>
                <Ionicons name="remove" size={22} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.depthLabel} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.2}>
                <EmberIcon size={12} /> {depthName(depth).toLocaleUpperCase()}
              </Text>
              <TouchableOpacity style={[styles.stepper, depth >= MAX_ASCENSION && styles.off]} onPress={() => setDepth(d => Math.min(MAX_ASCENSION, d + 1))} disabled={depth >= MAX_ASCENSION} accessibilityRole="button" accessibilityLabel={t("a11y.depthRaise")}>
                <Ionicons name="add" size={22} color="#fff" />
              </TouchableOpacity>
            </View>
            <Text style={styles.rule} maxFontSizeMultiplier={1.3}>
              {t(`ascension.${depth}` as TranslationKey)}
            </Text>

            {mode === "duel" ? (
              <>
                <Text style={styles.label} maxFontSizeMultiplier={1.2}>
                  {t("duel.stake").toLocaleUpperCase()}
                </Text>
                <View style={styles.chips}>
                  {STAKES.map(n => {
                    const affordable = embers >= n;
                    const on = stake === n;
                    return (
                      <TouchableOpacity
                        key={n}
                        style={[styles.chip, on && { backgroundColor: tint + "33", borderColor: tint }, !affordable && styles.off]}
                        onPress={() => {
                          setStake(n);
                          setConfirming(false);
                        }}
                        disabled={!affordable}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: on, disabled: !affordable }}
                        accessibilityLabel={n === 0 ? t("duel.stakeNone") : num(n)}
                      >
                        <Text style={[styles.chipText, on && { color: "#fff" }]} maxFontSizeMultiplier={1.2}>
                          {n === 0 ? t("duel.stakeNone") : <><EmberIcon size={11} /> {num(n)}</>}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                {stake > 0 ? (
                  <Text style={styles.hint} maxFontSizeMultiplier={1.3}>
                    {t("duel.stakeHint", { fee: DUEL_FEE_PERCENT })}
                  </Text>
                ) : null}
              </>
            ) : null}

            {mode === "duel" && stake >= CONFIRM_STAKE && confirming ? (
              <Text style={styles.error} accessibilityLiveRegion="polite" maxFontSizeMultiplier={1.3}>
                {t("duel.confirmStake", { n: stake })}
              </Text>
            ) : null}
            <PopButton
              variant={mode === "duel" && stake >= CONFIRM_STAKE && confirming ? "danger" : "primary"}
              label={mode === "duel" && stake >= CONFIRM_STAKE && confirming ? t("duel.confirmButton") : t(mode === "duel" ? "duel.createButton" : "challenge.createButton")}
              art={mode === "duel" ? "swords" : undefined}
              icon={mode === "duel" ? undefined : "sparkles"}
              onPress={() => {
                if (mode === "duel" && stake >= CONFIRM_STAKE && !confirming) {
                  setConfirming(true);
                  return;
                }
                onCreate(depth, mode === "duel" ? stake : 0);
              }}
            />
          </>
        ) : (
          <>
            <Text style={styles.hint} maxFontSizeMultiplier={1.3}>
              {t(mode === "duel" ? "duel.joinHint" : "challenge.joinHint")}
            </Text>
            <TextInput
              value={typed}
              onChangeText={text => {
                setTyped(text);
                setError(null);
              }}
              placeholder="ABCD-EFGH"
              placeholderTextColor="#777"
              style={styles.input}
              autoCapitalize="characters"
              autoCorrect={false}
              spellCheck={false}
              maxLength={12}
              returnKeyType="go"
              onSubmitEditing={join}
              accessibilityLabel={t(mode === "duel" ? "duel.join" : "challenge.join")}
            />
            {error ? (
              <Text style={styles.error} accessibilityLiveRegion="polite" maxFontSizeMultiplier={1.3}>
                {error}
              </Text>
            ) : null}
            <PopButton label={t(mode === "duel" ? "duel.joinButton" : "challenge.joinButton")} icon="arrow-forward" onPress={join} disabled={typed.trim().length === 0} />
          </>
        )}
      </PopupPanel>
    </View>
  );
};

export default FriendCreateJoin;

const styles = StyleSheet.create({
  root: { width: "100%", maxWidth: 520, alignSelf: "center", gap: 14, alignItems: "center" },
  art: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  avatarWrap: { width: 64, height: 64, borderRadius: 32, borderWidth: 3, backgroundColor: "rgba(255,255,255,0.08)", overflow: "hidden" },
  avatar: { width: "100%", height: "100%" },
  vs: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", transform: [{ rotate: "-8deg" }] },
  vsText: { color: "#1a1030", fontWeight: "900", fontSize: 15 },
  hint: { color: "#c3bedb", fontSize: 13.5, lineHeight: 19, textAlign: "center" },
  label: { alignSelf: "flex-start", color: "#8f8aab", fontWeight: "900", fontSize: 11, letterSpacing: 2, marginTop: 2 },
  depthRow: { flexDirection: "row", alignItems: "center", gap: 10, alignSelf: "stretch" },
  stepper: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,112,67,0.35)", borderWidth: 1, borderColor: "#FF7043", alignItems: "center", justifyContent: "center" },
  depthLabel: { flex: 1, color: "#FF9A5C", fontWeight: "900", fontSize: 16, letterSpacing: 1, textAlign: "center" },
  rule: { color: "#d7d2ee", fontSize: 12.5, lineHeight: 18, textAlign: "center", minHeight: 36 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignSelf: "stretch" },
  chip: { minHeight: 44, paddingHorizontal: 14, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1.5, borderColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  chipText: { color: "#c3bedb", fontWeight: "900", fontSize: 14 },
  off: { opacity: 0.35 },
  input: { alignSelf: "stretch", minHeight: 54, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1.5, borderColor: "rgba(255,213,79,0.45)", color: "#fff", fontSize: 22, fontWeight: "900", letterSpacing: 3, textAlign: "center", paddingHorizontal: 12 },
  error: { color: "#FF8A80", fontSize: 12.5, fontWeight: "700", textAlign: "center" },
});
