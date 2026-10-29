import React, { useState } from "react";
import { ScrollView, StyleSheet, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Text from "../Text";
import EmberIcon from "../EmberIcon";
import SpriteImage from "../SpriteImage";
import PressScale from "../PressScale";
import Rise from "../Rise";
import { PopButton } from "../game/popup";
import { useT } from "../../../i18n/useT";
import type { TranslationKey } from "../../../i18n/en";
import { MAX_ASCENSION } from "../../../core/engine/ascension";
import { CONFIRM_STAKE, DUEL_FEE_PERCENT, MAX_PLAYERS, STAKES } from "../../../core/duel/duel";
import { parseChallengeCode } from "../../../core/challenge/code";
import { useWindowDimensions } from "../../layout/scaledWindow";
import { DEPTH_COLOR, FRIEND_ART, FRIEND_TINT } from "./CodeTicket";

type Props = {
  mode: "challenge" | "duel";
  /** Embers the player has (a stake above them cannot be chosen). */
  embers: number;
  /** Creates the room: the chosen difficulty and, for a duel, the stake. */
  onCreate: (depth: number, stake: number) => void;
  /** Joins the room whose code was typed (already checked to be a code). */
  onJoin: (code: string) => void;
};

const TINT = FRIEND_TINT;
const ART = FRIEND_ART;
const DEPTHS = Array.from({ length: MAX_ASCENSION + 1 }, (_, i) => i);

/**
 * Create or join a friend challenge or a live duel. On a phone on its side: the mode and how it works on the left (with the create /
 * join switch), the choices on the right, so the button that starts it is on screen without scrolling.
 */
const FriendCreateJoin = ({ mode, embers, onCreate, onJoin }: Props) => {
  const { t, n: num } = useT();
  const tint = TINT[mode];
  const { width } = useWindowDimensions();
  const narrow = width < 600;
  const [tab, setTab] = useState<"create" | "join">("create");
  const [depth, setDepth] = useState(0);
  const [stake, setStake] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);

  const depthName = (d: number) => t(`ascension.label.${d}` as TranslationKey);
  const confirmNow = mode === "duel" && stake >= CONFIRM_STAKE && confirming;

  const join = () => {
    const parsed = parseChallengeCode(typed);
    if (!parsed) {
      setError(t("challenge.badCode"));
      return;
    }
    setError(null);
    onJoin(parsed.code);
  };

  const switcher = (
    <View style={styles.switch}>
      {(
        [
          ["create", "add-circle", t("friends.tabCreate")],
          ["join", "enter", t("friends.tabJoin")],
        ] as const
      ).map(([k, icon, label]) => {
        const on = tab === k;
        return (
          <PressScale
            key={k}
            onPress={() => setTab(k)}
            style={[styles.switchButton, on && { backgroundColor: tint, borderColor: tint }]}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={label}
          >
            <Ionicons name={icon} size={18} color={on ? "#1a0f00" : tint} />
            <Text style={[styles.switchText, on && { color: "#1a0f00" }]} maxFontSizeMultiplier={1.1}>
              {label.toLocaleUpperCase()}
            </Text>
          </PressScale>
        );
      })}
    </View>
  );

  // The button that starts it, with the line that may stand over it (a stake to confirm, a bad code).
  const cta =
    tab === "create" ? (
      <View style={styles.cta}>
        {confirmNow ? (
          <Text style={styles.error} accessibilityLiveRegion="polite" maxFontSizeMultiplier={1.2}>
            {t("duel.confirmStake", { n: stake })}
          </Text>
        ) : null}
        <PopButton
          variant={confirmNow ? "danger" : "primary"}
          label={confirmNow ? t("duel.confirmButton") : t(mode === "duel" ? "duel.createButton" : "challenge.createButton")}
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
      </View>
    ) : (
      <View style={styles.cta}>
        {error ? (
          <Text style={styles.error} accessibilityLiveRegion="polite" maxFontSizeMultiplier={1.2}>
            {error}
          </Text>
        ) : null}
        <PopButton label={t(mode === "duel" ? "duel.joinButton" : "challenge.joinButton")} icon="arrow-forward" onPress={join} disabled={typed.trim().length === 0} />
      </View>
    );

  return (
    <View style={[styles.root, narrow && styles.rootNarrow]}>
      <Rise style={[styles.intro, narrow && styles.introNarrow, { borderColor: tint + "88" }]}>
        <View style={styles.introTop}>
          <View style={styles.emblem}>
            <View style={[styles.emblemGlow, { backgroundColor: tint }]} />
            <SpriteImage source={ART[mode]} style={styles.emblemArt} resizeMode="contain" accessibilityIgnoresInvertColors />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[styles.introTitle, { color: tint }]} numberOfLines={2} maxFontSizeMultiplier={1.1}>
              {t(mode === "duel" ? "duel.open" : "challenge.open").toLocaleUpperCase()}
            </Text>
            <Text style={styles.introSub} numberOfLines={2} maxFontSizeMultiplier={1.1}>
              {mode === "duel" ? t("friends.duelTag", { max: MAX_PLAYERS }) : t("friends.challengeTag")}
            </Text>
          </View>
        </View>
        {!narrow
          ? [1, 2, 3].map(i => (
              <View key={i} style={styles.step}>
                <View style={[styles.stepNum, { borderColor: tint }]}>
                  <Text style={[styles.stepNumText, { color: tint }]} maxFontSizeMultiplier={1}>
                    {i}
                  </Text>
                </View>
                <Text style={styles.stepText} maxFontSizeMultiplier={1.15}>
                  {t(`friends.steps.${mode}.${i}` as TranslationKey)}
                </Text>
              </View>
            ))
          : null}
        {!narrow ? cta : null}
      </Rise>

      <Rise delay={80} style={[styles.panel, { borderColor: tint + "55" }]}>
        {switcher}
        {tab === "create" ? (
          <>
            <Text style={styles.label} maxFontSizeMultiplier={1.1}>
              {t("heroes.depth").toLocaleUpperCase()}
            </Text>
            <View style={styles.depths} accessibilityRole="radiogroup">
              {DEPTHS.map(d => {
                const on = depth === d;
                const c = DEPTH_COLOR[d] ?? "#FFD54F";
                return (
                  <PressScale
                    key={d}
                    onPress={() => setDepth(d)}
                    style={[styles.depth, on && { borderColor: c, backgroundColor: c + "26" }]}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: on }}
                    accessibilityLabel={depthName(d)}
                  >
                    <View style={styles.depthPips}>
                      {Array.from({ length: d + 1 }, (_, i) => (
                        <View key={i} style={[styles.pip, { backgroundColor: c, opacity: on ? 1 : 0.55 }]} />
                      ))}
                    </View>
                    <Text style={[styles.depthText, on && { color: c }]} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.05}>
                      {depthName(d).toLocaleUpperCase()}
                    </Text>
                  </PressScale>
                );
              })}
            </View>
            <Text style={styles.rule} numberOfLines={2} maxFontSizeMultiplier={1.15}>
              {t(`ascension.${depth}` as TranslationKey)}
            </Text>

            {mode === "duel" ? (
              <>
                <Text style={styles.label} maxFontSizeMultiplier={1.1}>
                  {t("duel.stake").toLocaleUpperCase()}
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
                  {STAKES.map(v => {
                    const affordable = embers >= v;
                    const on = stake === v;
                    return (
                      <PressScale
                        key={v}
                        style={[styles.chip, on && { backgroundColor: tint + "33", borderColor: tint }, !affordable && styles.off]}
                        onPress={() => {
                          setStake(v);
                          setConfirming(false);
                        }}
                        disabled={!affordable}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: on, disabled: !affordable }}
                        accessibilityLabel={v === 0 ? t("duel.stakeNone") : num(v)}
                      >
                        {v > 0 ? <EmberIcon size={12} /> : null}
                        <Text style={[styles.chipText, on && { color: "#fff" }]} maxFontSizeMultiplier={1.1}>
                          {v === 0 ? t("duel.stakeNone") : num(v)}
                        </Text>
                      </PressScale>
                    );
                  })}
                </ScrollView>
                {stake > 0 ? (
                  <Text style={styles.small} maxFontSizeMultiplier={1.15}>
                    {t("duel.stakeHint", { fee: DUEL_FEE_PERCENT })}
                  </Text>
                ) : null}
              </>
            ) : null}

          </>
        ) : (
          <>
            <Text style={styles.label} maxFontSizeMultiplier={1.1}>
              {t("challenge.code").toLocaleUpperCase()}
            </Text>
            <TextInput
              value={typed}
              onChangeText={text => {
                setTyped(text);
                setError(null);
              }}
              placeholder="ABCD-EFGH"
              placeholderTextColor="#6E6052"
              style={[styles.input, { borderColor: tint + "AA" }]}
              autoCapitalize="characters"
              autoCorrect={false}
              spellCheck={false}
              maxLength={12}
              returnKeyType="go"
              onSubmitEditing={join}
              accessibilityLabel={t(mode === "duel" ? "duel.join" : "challenge.join")}
            />
            <Text style={styles.small} maxFontSizeMultiplier={1.15}>
              {t(mode === "duel" ? "duel.joinHint" : "challenge.joinHint")}
            </Text>
          </>
        )}
        {narrow ? cta : null}
      </Rise>
    </View>
  );
};

export default FriendCreateJoin;

const styles = StyleSheet.create({
  root: { width: "100%", maxWidth: 980, alignSelf: "center", flexDirection: "row", gap: 12, alignItems: "flex-start" },
  rootNarrow: { flexDirection: "column", alignItems: "stretch" },

  intro: { width: "36%", maxWidth: 340, gap: 8, padding: 12, borderRadius: 20, borderWidth: 1.5, backgroundColor: "rgba(48,36,22,0.9)" },
  introNarrow: { width: "100%", maxWidth: undefined },
  introTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  emblem: { width: 64, height: 64, alignItems: "center", justifyContent: "center" },
  emblemGlow: { position: "absolute", width: 60, height: 60, borderRadius: 30, opacity: 0.16 },
  emblemArt: { width: 60, height: 60 },
  introTitle: { fontWeight: "900", fontSize: 16, letterSpacing: 1.5 },
  introSub: { color: "#C4AA91", fontWeight: "800", fontSize: 11.5 },
  step: { flexDirection: "row", alignItems: "center", gap: 8 },
  stepNum: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  stepNumText: { fontWeight: "900", fontSize: 11 },
  stepText: { flex: 1, color: "#E9E0D7", fontSize: 12.5, lineHeight: 16 },
  switch: { flexDirection: "row", gap: 6 },
  cta: { gap: 6, marginTop: 2 },
  switchButton: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, minHeight: 36, borderRadius: 20, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.2)", paddingHorizontal: 12 },
  switchText: { color: "#EAE1D8", fontWeight: "900", fontSize: 12, letterSpacing: 1 },

  panel: { flex: 1, gap: 7, padding: 12, borderRadius: 20, borderWidth: 1.5, backgroundColor: "rgba(36,28,19,0.9)" },
  label: { color: "#B99A7C", fontWeight: "900", fontSize: 11, letterSpacing: 2 },
  depths: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  depth: { flexBasis: "31%", flexGrow: 1, alignItems: "center", gap: 3, minHeight: 40, paddingVertical: 4, paddingHorizontal: 6, borderRadius: 12, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.12)", backgroundColor: "rgba(255,255,255,0.04)", justifyContent: "center" },
  depthPips: { flexDirection: "row", gap: 3 },
  pip: { width: 5, height: 5, borderRadius: 3 },
  depthText: { color: "#DCCCBD", fontWeight: "900", fontSize: 11.5, letterSpacing: 0.8 },
  rule: { color: "#E9E0D7", fontSize: 12, lineHeight: 16, minHeight: 32 },
  chips: { flexDirection: "row", gap: 6, paddingRight: 8 },
  chip: { flexDirection: "row", alignItems: "center", gap: 4, minHeight: 38, paddingHorizontal: 12, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1.5, borderColor: "rgba(255,255,255,0.15)" },
  chipText: { color: "#DCCCBD", fontWeight: "900", fontSize: 13 },
  off: { opacity: 0.35 },
  small: { color: "#C4AA91", fontSize: 12, lineHeight: 16 },
  input: { alignSelf: "stretch", minHeight: 56, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 2, color: "#fff", fontSize: 26, fontWeight: "900", letterSpacing: 5, textAlign: "center", paddingHorizontal: 12 },
  error: { color: "#FF8A80", fontSize: 12.5, fontWeight: "700", textAlign: "center" },
});
