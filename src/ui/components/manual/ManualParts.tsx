import React from "react";
import { ImageSourcePropType, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Text from "../Text";
import SpriteImage from "../SpriteImage";
import { CLUE_ART } from "../GridCell";

export const CARD = "rgba(18,14,38,0.9)";
export const BORDER = "rgba(255,255,255,0.09)";

type IconName = keyof typeof Ionicons.glyphMap;

/** A picture for a card: any image or an icon on a tinted tile, always the same size so a column of cards lines up. */
export const Art = ({ image, icon, tint = "#FFD54F", size = 56, children }: { image?: ImageSourcePropType; icon?: IconName; tint?: string; size?: number; children?: React.ReactNode }) => (
  <View style={[styles.art, { width: size, height: size, borderRadius: size * 0.28, backgroundColor: tint + "1F", borderColor: tint + "55" }]}>
    {children ? (
      children
    ) : image ? (
      <SpriteImage source={image} style={{ width: size * 0.78, height: size * 0.78 }} resizeMode="contain" accessibilityIgnoresInvertColors />
    ) : icon ? (
      <Ionicons name={icon} size={size * 0.52} color={tint} />
    ) : null}
  </View>
);

/** One fact of a topic: an accent bar, optional art, a short title, the explanation and sometimes a coloured tag. */
export const FactCard = ({ label, detail, badge, color, art }: { label: string; detail: string; badge?: string; color: string; art?: React.ReactNode }) => (
  <View style={styles.fact}>
    <View style={[styles.factBar, { backgroundColor: color }]} />
    <View style={styles.factBody}>
      <View style={styles.factHead}>
        {art ? <View style={styles.factArt}>{art}</View> : null}
        <View style={{ flex: 1, gap: 6 }}>
          <View style={styles.factTitleRow}>
            <Text style={styles.factLabel} maxFontSizeMultiplier={1.3}>
              {label}
            </Text>
            {badge ? (
              <View style={[styles.tag, { backgroundColor: color + "2E", borderColor: color + "AA" }]}>
                <Text style={[styles.tagText, { color }]} numberOfLines={2} maxFontSizeMultiplier={1.2}>
                  {badge.toLocaleUpperCase()}
                </Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.factDetail} maxFontSizeMultiplier={1.3}>
            {detail}
          </Text>
        </View>
      </View>
    </View>
  </View>
);

/** A small heading inside a topic (above a list of cards). */
export const SubHeading = ({ text, color = "#FFD54F" }: { text: string; color?: string }) => (
  <Text style={[styles.sub, { color }]} accessibilityRole="header" maxFontSizeMultiplier={1.2}>
    {text.toLocaleUpperCase()}
  </Text>
);

/**
 * How to read a tile, drawn: an uncovered tile in the middle with one sound icon, and its four neighbours as hidden tiles with a
 * question mark (the diagonals stay dark, because clues never look at them).
 */
export const ClueExample = ({ hidden, revealed, caption }: { hidden: ImageSourcePropType; revealed: ImageSourcePropType; caption: string }) => {
  const S = 54;
  const cell = (key: string, kind: "hidden" | "center" | "far") => (
    <View key={key} style={{ width: S, height: S, alignItems: "center", justifyContent: "center" }}>
      {kind === "center" ? (
        <>
          <SpriteImage source={revealed} style={{ width: S, height: S, position: "absolute" }} resizeMode="stretch" accessibilityIgnoresInvertColors />
          <View style={styles.clueBadge}>
            <SpriteImage source={CLUE_ART.roar} style={{ width: 30, height: 30 }} resizeMode="contain" accessibilityIgnoresInvertColors />
            <View style={styles.clueCount}>
              <Text style={styles.clueCountText}>1</Text>
            </View>
          </View>
        </>
      ) : (
        <>
          <SpriteImage source={hidden} style={{ width: S, height: S, position: "absolute", opacity: kind === "far" ? 0.45 : 1 }} resizeMode="stretch" accessibilityIgnoresInvertColors />
          {kind === "hidden" ? <Text style={styles.q}>?</Text> : null}
        </>
      )}
    </View>
  );
  const rows: ("far" | "hidden" | "center")[][] = [
    ["far", "hidden", "far"],
    ["hidden", "center", "hidden"],
    ["far", "hidden", "far"],
  ];
  return (
    <View style={styles.example}>
      <View>
        {rows.map((r, i) => (
          <View key={i} style={{ flexDirection: "row" }}>
            {r.map((k, j) => cell(`${i}${j}`, k))}
          </View>
        ))}
      </View>
      <Text style={styles.exampleText} maxFontSizeMultiplier={1.3}>
        {caption}
      </Text>
    </View>
  );
};

/** The table of points: each line a thing you can do, with its worth in green (earns) or red (costs). */
export const ScoreTable = ({ rows }: { rows: { label: string; value: string; good: boolean; note?: string }[] }) => (
  <View style={styles.table}>
    {rows.map((r, i) => (
      <View key={r.label} style={[styles.tableRow, i > 0 && styles.tableDivider]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.tableLabel} maxFontSizeMultiplier={1.3}>
            {r.label}
          </Text>
          {r.note ? (
            <Text style={styles.tableNote} maxFontSizeMultiplier={1.3}>
              {r.note}
            </Text>
          ) : null}
        </View>
        <View style={[styles.value, { backgroundColor: r.good ? "rgba(129,199,132,0.16)" : "rgba(239,83,80,0.16)", borderColor: r.good ? "#81c784" : "#ef5350" }]}>
          <Text style={[styles.valueText, { color: r.good ? "#a5d6a7" : "#ef9a9a" }]} maxFontSizeMultiplier={1.2}>
            {r.value}
          </Text>
        </View>
      </View>
    ))}
  </View>
);

const styles = StyleSheet.create({
  art: { alignItems: "center", justifyContent: "center", borderWidth: 1 },
  fact: { flexDirection: "row", backgroundColor: CARD, borderRadius: 16, borderWidth: 1, borderColor: BORDER, overflow: "hidden" },
  factBar: { width: 5 },
  factBody: { flex: 1, padding: 14 },
  factHead: { flexDirection: "row", gap: 14, alignItems: "flex-start" },
  factArt: { paddingTop: 2 },
  factTitleRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  factLabel: { flex: 1, color: "#fff", fontWeight: "900", fontSize: 16 },
  factDetail: { color: "#c3bedb", fontSize: 14.5, lineHeight: 21 },
  tag: { maxWidth: 140, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10, borderWidth: 1 },
  tagText: { fontWeight: "900", fontSize: 10.5, letterSpacing: 0.8, textAlign: "center" },
  sub: { fontWeight: "900", fontSize: 13, letterSpacing: 2, marginTop: 6 },
  example: { flexDirection: "row", alignItems: "center", gap: 16, backgroundColor: CARD, borderRadius: 16, borderWidth: 1, borderColor: BORDER, padding: 14 },
  exampleText: { flex: 1, color: "#c3bedb", fontSize: 14, lineHeight: 20 },
  q: { color: "#FFD54F", fontWeight: "900", fontSize: 22, textShadowColor: "rgba(0,0,0,0.7)", textShadowRadius: 4 },
  clueBadge: { width: 30, height: 30, alignItems: "center", justifyContent: "center" },
  clueCount: { position: "absolute", right: -7, bottom: -7, width: 18, height: 18, borderRadius: 9, backgroundColor: "#1a1030", borderWidth: 1.5, borderColor: "#fff", alignItems: "center", justifyContent: "center" },
  clueCountText: { color: "#fff", fontWeight: "900", fontSize: 11 },
  table: { backgroundColor: CARD, borderRadius: 16, borderWidth: 1, borderColor: BORDER, paddingHorizontal: 14 },
  tableRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 11 },
  tableDivider: { borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.07)" },
  tableLabel: { color: "#fff", fontWeight: "800", fontSize: 14.5 },
  tableNote: { color: "#9d97ba", fontSize: 12, marginTop: 1 },
  value: { minWidth: 70, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1, alignItems: "center" },
  valueText: { fontWeight: "900", fontSize: 14 },
});
