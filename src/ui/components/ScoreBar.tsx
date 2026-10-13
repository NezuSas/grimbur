import React, { memo } from "react";
import { StyleSheet, View, Image, Text, Dimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ScoreCounter from "./ScoreCounter";
import { Character } from "../../data/characters";
import { useGameLayout } from "../layout/useGameLayout";
import { formatTime } from '../../shared/utils/formatTime';

const { width: screenWidth } = Dimensions.get("window");

type Props = {
  score: number;
  attackValue: number;
  coins: number;
  character: Character;
  level: number;
  time: number;
  shield?: boolean;
};

const ScoreBar: React.FC<Props> = memo(({ score, attackValue, coins, character, level, time, shield = false }) => {
  const { spacing, fontSize } = useGameLayout();

  // Responsive scaling based on width
  const avatarSize = screenWidth * 0.06;
  const statIconSize = avatarSize * 0.8;

  return (
    <View style={[styles.container, { paddingHorizontal: spacing(20) }]}>
      {/* LEFT: Avatar & Timer */}
      <View style={styles.leftGroup}>
        <View style={styles.avatarTimerContainer}>
          <View style={[styles.avatarWrapper, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }]}>
            <Image source={character.scoreImage} style={[styles.avatar, { width: avatarSize * 0.85, height: avatarSize * 0.85 }]} />
          </View>
          <View style={[styles.timeContainer, { marginLeft: spacing(10) }]}>
            <Text style={styles.timeLabel}>TIME</Text>
            <Text style={[styles.timeValue, { fontSize: fontSize(20) }]}>{formatTime(time)}</Text>
          </View>
        </View>
      </View>

      {/* CENTER: Level Indicator */}
      <View style={styles.centerGroup}>
        <View style={styles.levelBadge}>
          <Text style={[styles.levelLabel, { fontSize: 12 }]}>LEVEL</Text>
          <Text style={[styles.levelText, { fontSize: 26 }]}>{level}</Text>
        </View>
        {shield && (
          <View style={styles.shieldBadge}>
            <Ionicons name="shield-checkmark" size={18} color="#4FC3F7" />
          </View>
        )}
      </View>

      {/* RIGHT: Stats Group */}
      <View style={styles.rightGroup}>
        <ScoreCounter 
          icon={require("../../assets/sprites/items/Icon_Gem.png")} 
          value={coins} 
          iconDim={statIconSize}
        />
        <ScoreCounter 
          icon={character.attackImage}
          value={attackValue}
          iconDim={statIconSize}
        />
        <ScoreCounter 
          icon={character.scoreImage}
          value={score} 
          iconDim={statIconSize}
        />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    paddingVertical: 10,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderBottomWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  leftGroup: {
    flex: 1.5,
    alignItems: "flex-start",
  },
  avatarTimerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeContainer: {
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  timeLabel: {
    color: "rgba(255, 255, 255, 0.5)",
    fontWeight: "900",
    fontSize: 10,
    letterSpacing: 1,
  },
  timeValue: {
    color: "#00BFFF", // Deep Sky Blue
    fontWeight: "900",
    marginTop: -2,
  },
  centerGroup: {
    flex: 1,
    alignItems: "center",
  },
  shieldBadge: {
    position: "absolute",
    right: "8%",
    top: 2,
    padding: 4,
    borderRadius: 14,
    backgroundColor: "rgba(79, 195, 247, 0.18)",
    borderWidth: 1,
    borderColor: "#4FC3F7",
  },
  rightGroup: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  avatarWrapper: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.3)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatar: {
    resizeMode: "contain",
  },
  levelBadge: {
    alignItems: "center",
    justifyContent: "center",
  },
  levelLabel: {
    color: "rgba(255, 255, 255, 0.6)",
    fontWeight: "900",
    letterSpacing: 2,
  },
  levelText: {
    color: "#FFEB3B",
    fontWeight: "900",
    marginTop: -4,
  },
});

export default ScoreBar;
