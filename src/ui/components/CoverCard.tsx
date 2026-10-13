import React from "react";
import { View, Text, useWindowDimensions, StyleSheet } from "react-native";
import CoverButton from "./CoverButton";
import { useSoundStore } from "../../state/sound/store";
import { emitSound } from "../../audio/audioEventBus";
import { useGameLayout } from "../layout/useGameLayout";

type Props = {
  onPressPlay: () => void;
  onPressDaily: () => void;
  onPressScores: () => void;
  onPressInstructions: () => void;
  onPressSettings: () => void;
};

const CoverCard: React.FC<Props> = ({ onPressPlay, onPressDaily, onPressScores, onPressInstructions, onPressSettings }) => {
  const { screenWidth, screenHeight, spacing, titleSize, textSize, isTablet } = useGameLayout();
  const ready = useSoundStore((s) => (s as any).ready ?? true);

  // Card proportional but with topes — Wider to accommodate 2-column buttons
  const cardWidth = Math.min(screenWidth * 0.9, 520);
  const cardHeight = Math.min(screenHeight * 0.9, 450);

  return (
    <View style={styles.root}>
      <View style={[styles.cardContainer, { width: cardWidth, padding: spacing(28) }]}>
        {/* Header Section */}
        <View style={[styles.header, { marginBottom: spacing(24) }]}>
          <Text style={[styles.title, { fontSize: titleSize * 0.95 }]}>WUMPUS ADVENTURES</Text>
          <Text style={[styles.subtitle, { fontSize: titleSize * 0.6 }]}>ADVENTURE</Text>
        </View>

        {/* Action Buttons Section */}
        <View style={styles.buttonList}>
          <View style={styles.buttonRow}>
            <CoverButton 
              label="START MISSION" 
              onPress={onPressPlay} 
              variant="primary"
              style={styles.gridButton}
            />
            <CoverButton 
              label="RANKINGS" 
              onPress={onPressScores} 
              variant="secondary"
              style={styles.gridButton}
            />
          </View>
          <View style={styles.buttonRow}>
            <CoverButton
              label="DAILY CHALLENGE"
              onPress={onPressDaily}
              variant="primary"
              style={styles.dailyButton}
            />
          </View>
          <View style={styles.buttonRow}>
            <CoverButton 
              label="GAME MANUAL" 
              onPress={onPressInstructions} 
              variant="secondary"
              style={styles.gridButton}
            />
            <CoverButton 
              label="SETTINGS" 
              onPress={onPressSettings} 
              variant="secondary"
              style={styles.gridButton}
            />
          </View>
        </View>

        {/* Footer info */}
        <View style={[styles.footer, { marginTop: spacing(10) }]}>
          <Text style={[styles.versionText, { fontSize: textSize * 0.6 }]}>v2.0 UI UPGRADE</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { 
    flex: 1, 
    alignItems: "center", 
    justifyContent: "center",
  },
  cardContainer: {
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    borderRadius: 30,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "space-between",
    // Shadow for iOS
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    // Elevation for Android
    elevation: 20,
  },
  header: {
    alignItems: "center",
  },
  title: {
    color: "#FFD700", // Gold
    fontWeight: "900",
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
    letterSpacing: 2,
  },
  subtitle: {
    color: "#fff",
    fontWeight: "600",
    letterSpacing: 8,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  buttonList: {
    width: "100%",
    justifyContent: "center",
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 10,
  },
  gridButton: {
    width: 220,
    marginHorizontal: 0,
  },
  dailyButton: {
    width: '100%',
    marginHorizontal: 0,
  },
  footer: {
    alignItems: "center",
  },
  versionText: {
    color: "rgba(255, 255, 255, 0.4)",
    fontWeight: "bold",
    letterSpacing: 1,
  },
});

export default CoverCard;
