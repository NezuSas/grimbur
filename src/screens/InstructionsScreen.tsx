import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ImageBackground } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";
import { SafeAreaView } from "react-native-safe-area-context";
import { useGameLayout } from "../ui/layout/useGameLayout";
import { Ionicons } from "@expo/vector-icons";
import characters from "../data/characters";

type Props = NativeStackScreenProps<RootStackParamList, "InstructionsScreen">;

const InstructionsScreen: React.FC<Props> = ({ navigation }) => {
  const { spacing, titleSize, textSize, fontSize, screenWidth } = useGameLayout();

  const cardWidth = Math.min(screenWidth * 0.9, 1000);

  const SectionHeader = ({ title, icon, image, color = "#FFD700" }: { title: string, icon?: string, image?: any, color?: string }) => (
    <View style={styles.sectionHeader}>
      <View style={[styles.iconContainer, { backgroundColor: color + '22' }]}>
        {image ? (
          <Image source={image} style={{ width: 52, height: 52 }} resizeMode="contain" />
        ) : (
          <Text style={[styles.sectionIcon, { fontSize: fontSize(26) }]}>{icon}</Text>
        )}
      </View>
      <Text style={[styles.sectionTitle, { fontSize: fontSize(22), color }]}>{title}</Text>
    </View>
  );

  const InstructionRow = ({ label, detail, value, valueColor = "#4caf50" }: { label: string, detail: string, value?: string, valueColor?: string }) => (
    <View style={styles.row}>
      <View style={styles.rowTextContainer}>
        <Text style={[styles.rowLabel, { fontSize: fontSize(20) }]}>{label}</Text>
        <Text style={[styles.rowDetail, { fontSize: fontSize(16) }]}>{detail}</Text>
      </View>
      {value && (
        <View style={[styles.valueBadge, { backgroundColor: valueColor }]}>
          <Text style={[styles.valueText, { fontSize: fontSize(12) }]}>{value}</Text>
        </View>
      )}
    </View>
  );

  const VisualRow = ({ leftImage, rightImage, label }: { leftImage: any, rightImage: any, label: string }) => (
    <View style={styles.visualRow}>
      <View style={styles.visualComparison}>
        <View style={styles.visualItem}>
          <Image source={leftImage} style={{ width: 60, height: 60 }} resizeMode="contain" />
          <Text style={styles.visualText}>HIDDEN</Text>
        </View>
        <Ionicons name="arrow-forward" size={28} color="#555" style={{ marginHorizontal: 25 }} />
        <View style={styles.visualItem}>
          <Image source={rightImage} style={{ width: 60, height: 60 }} resizeMode="contain" />
          <Text style={styles.visualText}>REVEALED</Text>
        </View>
      </View>
      <Text style={[styles.visualDetail, { fontSize: fontSize(14) }]}>{label}</Text>
    </View>
  );

  return (
    <ImageBackground source={require("../assets/sprites/backgrounds/Cover_Background.png")} style={styles.root} resizeMode="cover">
      <SafeAreaView style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)' }}>
        <View style={{ flex: 1, alignItems: "center" }}>
          
          <View style={[styles.header, { paddingVertical: spacing(20) }]}>
            <TouchableOpacity 
              style={[styles.backButton, { left: spacing(20) }]} 
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={spacing(28)} color="#fff" />
            </TouchableOpacity>
            <Text style={[styles.title, { fontSize: titleSize }]}>GAME MANUAL</Text>
          </View>

          <View style={[styles.mainCard, { width: cardWidth, padding: spacing(25) }]}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing(60) }}>
              
              {/* 0. PLAYER IDENTITY */}
              <SectionHeader 
                  title="YOU (THE PLAYER)" 
                  image={characters[1].winImage} 
                  color="#00e5ff" 
              />
              <View style={styles.sectionContent}>
                  <Text style={[styles.rowDetail, { color: '#ccc', fontSize: fontSize(17), marginBottom: 10 }]}>
                      You control this character. Every move reveals the unknown and determines your survival. Use the D-Pad to explore and the Action Buttons to respond to threats.
                  </Text>
              </View>

              <View style={styles.separator} />

              {/* 1. GAME MISSION */}
              <SectionHeader 
                title="THE MISSION" 
                image={require("../assets/sprites/items/Icon_Gem.png")} 
                color="#ff5252" 
              />
              <View style={styles.sectionContent}>
                <InstructionRow label="Primary Goal" detail="Navigate the grid to secure every Mystic Gem. Only then do you descend to the next, harder cave." />
                <InstructionRow label="The Wumpus" detail="Floor 10 is the Wumpus lair. It has 3 hearts and hunts you, stepping closer every two moves. Shoot it three times to win the expedition. Touching it is deadly (a shield bounces you back once)." value="FLOOR 10" valueColor="#ff1744" />
                <InstructionRow label="Heroes" detail="Each hero has a perk shown on the selection screen: Trapfinder, Piercing arrows, Stoneskin and Treasure hunter." />
                <InstructionRow label="Survival" detail="Avoid lethal pits and hostile guardians. One wrong step ends the run." />
              </View>

              <View style={styles.separator} />

              {/* 2. EXPLORATION */}
              <SectionHeader title="EXPLORATION" icon="🗺️" color="#4fc3f7" />
              <View style={styles.sectionContent}>
                <VisualRow 
                  leftImage={require("../assets/sprites/tiles/Tile_Hidden.png")}
                  rightImage={require("../assets/sprites/tiles/Tile_Revealed.png")}
                  label="Tiles are initially hidden. Step on them to reveal the path beneath."
                />
                <InstructionRow label="Tactical Pace" detail="Every move counts. Blind rushing leads to the void; plan your path carefully." />
              </View>

              <View style={styles.separator} />

              {/* 3. HAZARD DETECTION */}
              <SectionHeader title="HAZARD DETECTION" icon="📡" color="#ffa726" />
              <View style={styles.sectionContent}>
                <View style={styles.hazardVisual}>
                  <View style={styles.visualItem}>
                    <Image source={require("../assets/sprites/enemies/Guardian_Enemy.png")} style={{ width: 60, height: 60 }} />
                    <Text style={styles.hazardLabel}>GUARDIAN</Text>
                    <View style={[styles.hintIconContainer, { backgroundColor: '#ffcc80' }]}>
                       <Ionicons name="volume-high" size={16} color="#bf360c" />
                    </View>
                  </View>
                  <View style={[styles.visualItem, { marginLeft: 50 }]}>
                    <Image source={require("../assets/sprites/tiles/Danger_Vortex.png")} style={{ width: 60, height: 60 }} />
                    <Text style={styles.hazardLabel}>MYSTIC VORTEX</Text>
                    <View style={[styles.hintIconContainer, { backgroundColor: '#9c27b0' }]}>
                       <Ionicons name="infinite" size={16} color="#fff" />
                    </View>
                  </View>
                </View>
                <InstructionRow label="Situational Clues" detail="Ancient Runes signal danger: 🔊 for Guardians, ∞ for Vortexes. When several hazards of one kind surround a tile, a number tells you how many." />
                <InstructionRow 
                  label="Mystic Vortex" 
                  detail="Stepping into a Vortex does NOT mean instant death — it tears open a rift and teleports you to a safe, preferably unexplored cell. Use it to skip dangerous ground — but it can drop you far from the gems."
                  valueColor="#9c27b0" 
                  value="TELEPORT"
                />
                <Text style={[styles.rowDetail, { fontSize: fontSize(14), fontStyle: 'italic', color: '#666' }]}>
                  *Hints are omni-directional; they reveal proximity, not exact location.
                </Text>
              </View>

              <View style={styles.separator} />

              {/* 4. COMBAT TACTICS */}
              <SectionHeader 
                title="COMBAT TACTICS" 
                icon="⚔️"
                color="#ff5252" 
              />
              <View style={styles.sectionContent}>
                <View style={[styles.hazardVisual, { backgroundColor: 'transparent', padding: 10 }]}>
                  <View style={styles.visualItem}>
                    <Image source={characters[1].playerImage} style={{ width: 55, height: 55 }} />
                  </View>
                  <Ionicons name="arrow-forward" size={30} color="#ff5252" style={{ marginHorizontal: 20 }} />
                  <View style={styles.visualItem}>
                    <Image source={require("../assets/sprites/enemies/Guardian_Enemy.png")} style={{ width: 52, height: 52, opacity: 0.6 }} />
                  </View>
                </View>
                <InstructionRow label="The Strike" detail="Use the Attack Action to eliminate Guardians in the direction you are facing." />
                <InstructionRow label="Ammo Control" detail="Attack charges are limited and refresh every level. Only strike when victory is certain." value="LIMITED" valueColor="#d32f2f" />
                <InstructionRow label="Combo" detail="Consecutive kills without moving or missing multiply the reward, up to x3." value="x3" valueColor="#ff5252" />
              </View>

              <View style={styles.separator} />

              {/* 4b. POWER-UPS & TRAPS */}
              <SectionHeader title="POWER-UPS & TRAPS" icon="🛡️" color="#4fc3f7" />
              <View style={styles.sectionContent}>
                <InstructionRow label="Shield" detail="Absorbs one Guardian hit and destroys it. It stays with you until used, even across levels." value="BLUE" valueColor="#4fc3f7" />
                <InstructionRow label="Extra Arrows" detail="Orange arrow icons on the board give you +2 attack charges." value="+2" valueColor="#ff9800" />
                <InstructionRow label="Hidden Traps" detail="From level 3, some tiles hide a trap. It costs points but is never lethal, and gives no warning." value="-75" valueColor="#ff9800" />
              </View>

              <View style={styles.separator} />

              {/* 5. ECONOMY & GROWTH */}
              <SectionHeader 
                title="ECONOMY & GROWTH" 
                image={require("../assets/sprites/items/Icon_Gem.png")} 
                color="#FFD700" 
              />
              <View style={styles.sectionContent}>
                <InstructionRow label="Local Bounty" detail="Coins collected within a level are required for completion." />
                <InstructionRow label="Global Wealth" detail="Your total coins accumulate across all sessions to define your legacy." value="PERSISTENT" valueColor="#FFD700" />
              </View>

              <View style={styles.separator} />

              {/* 6. THE LEADERBOARD */}
              <SectionHeader title="THE LEADERBOARD" icon="🏆" color="#4caf50" />
              <View style={styles.sectionContent}>
                <InstructionRow label="Scoring" detail="Points are awarded for every Coin secured and every Guardian neutralized." />
                <InstructionRow label="Efficiency" detail="In the Hall of Legends, speed is king. For identical scores, the fastest completion time earns the higher rank." value="NEW" valueColor="#2196f3" />
                <InstructionRow label="Daily Challenge" detail="One cave per day, identical for every player. Chase your best score and keep your streak alive by playing on consecutive days. It does not count for the global Top 10." value="DAILY" valueColor="#4fc3f7" />
                <InstructionRow label="Pause" detail="Tap the pause button or press Back to pause. The run also pauses if you leave the app." />
                <InstructionRow label="Glory" detail="Master the grid to establish your legacy among the Top 10 Legends." value="TOP 10" valueColor="#4caf50" />
              </View>

              <View style={styles.separator} />

              {/* 7. SENSORY AWARENESS */}
              <SectionHeader title="SENSORY AWARENESS" icon="🌀" color="#ba68c8" />
              <View style={styles.sectionContent}>
                <InstructionRow label="Danger Glow" detail="A subtle edge-glow appears when you are in a high-threat proximity." />
                <InstructionRow label="Haptic Feedback" detail="Tactile vibrations signal movement impact and critical hazard proximity." />
              </View>

              <View style={styles.separator} />

              {/* 8. ENGAGEMENT */}
              <SectionHeader title="ENGAGEMENT" icon="📜" color="#81d4fa" />
              <View style={styles.sectionContent}>
                  <View style={styles.engagementRow}>
                      <View style={{ width: 40, alignItems: 'center' }}>
                          <Image source={require("../assets/sprites/items/Icon_Gem.png")} style={{ width: 24, height: 24 }} />
                      </View>
                      <Text style={[styles.engagementText, { fontSize: fontSize(15) }]}>
                          <Text style={{fontWeight:'bold', color: '#fff'}}>VICTORY:</Text> Collect 100% of Gold Coins and reach the extraction exit.
                      </Text>
                  </View>
                  <View style={[styles.engagementRow, { marginTop: 10 }]}>
                      <View style={{ width: 40, alignItems: 'center' }}>
                          <Image source={require("../assets/sprites/tiles/Danger_Vortex.png")} style={{ width: 24, height: 24 }} />
                      </View>
                      <Text style={[styles.engagementText, { fontSize: fontSize(15) }]}>
                          <Text style={{fontWeight:'bold', color: '#fff'}}>DEFEAT:</Text> Touching a Guardian without attacking, or being teleported from a Vortex directly onto a Guardian.
                      </Text>
                  </View>
              </View>

              <View style={styles.separator} />

              {/* 9. PERSONALIZATION */}
              <SectionHeader title="PERSONALIZATION" icon="⚙️" color="#9e9e9e" />
              <View style={styles.sectionContent}>
                <InstructionRow 
                  label="Audio Control" 
                  detail="Toggle Global Sound in Settings to enable/disable music and effects across all screens." 
                  value="SOUND" 
                  valueColor="#4caf50" 
                />
                <InstructionRow 
                  label="Ergonomics" 
                  detail="Switch the Control Position between Left and Right to find your ideal hand placement." 
                  value="CONTROLS" 
                  valueColor="#1e88e5" 
                />
              </View>

              <View style={styles.separator} />

              {/* 10. VETERAN INSIGHTS */}
              <SectionHeader title="PRO INSIGHTS" icon="💡" color="#4db6ac" />
              <View style={styles.tipBox}>
                  <Text style={[styles.tipText, { fontSize: fontSize(14) }]}>
                      • <Text style={{fontWeight:'900', color: '#4db6ac'}}>Vortex Gamble:</Text> Falling into a Vortex teleports you to a safe tile. Use it to escape tight spots when every direction looks risky.{"\n\n"}
                      • <Text style={{fontWeight:'900', color: '#4db6ac'}}>Shield First:</Text> Grab the shield before you start probing around Guardians — it turns a deadly mistake into a free kill.{"\n\n"}
                      • <Text style={{fontWeight:'900', color: '#4db6ac'}}>Strategic Pauses:</Text> When a ROAR or VORTEX trigger occurs, stop and evaluate all four directions before moving.{"\n\n"}
                      • <Text style={{fontWeight:'900', color: '#4db6ac'}}>Munition Thrift:</Text> Don't waste attacks on enemies you can simply bypass. Save them for tight corners.{"\n\n"}
                      • <Text style={{fontWeight:'900', color: '#4db6ac'}}>Route Efficiency:</Text> Coins are often placed in dangerous paths. Use your prior steps to find the safest return route.
                  </Text>
              </View>

            </ScrollView>
          </View>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000",
  },
  container: {
    flex: 1,
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    backgroundColor: "transparent",
    borderBottomWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  backButton: {
    position: "absolute",
    width: 44,
    height: 44,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    color: "#fff",
    fontWeight: "900",
    textAlign: "center",
    letterSpacing: 4,
  },
  mainCard: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    marginTop: 15,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  iconContainer: {
    width: 70,
    height: 70,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
  },
  sectionIcon: {},
  sectionTitle: {
    fontWeight: "900",
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  sectionContent: {
    paddingLeft: 10,
  },
  visualRow: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  visualComparison: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  visualItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  visualText: {
    color: '#666',
    fontSize: 9,
    fontWeight: '900',
    marginTop: 6,
    letterSpacing: 1,
  },
  visualDetail: {
    color: '#aaa',
    textAlign: 'center',
    lineHeight: 20,
  },
  hazardVisual: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.02)',
    padding: 20,
    borderRadius: 20,
    marginBottom: 20,
  },
  hazardLabel: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
    marginTop: 8,
    letterSpacing: 1,
  },
  tipBox: {
    backgroundColor: 'rgba(77, 182, 172, 0.05)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(77, 182, 172, 0.15)',
  },
  tipText: {
    color: '#ccc',
    lineHeight: 22,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  rowTextContainer: {
    flex: 1,
  },
  rowLabel: {
    color: "#fff",
    fontWeight: "800",
  },
  rowDetail: {
    color: "#999",
    fontWeight: "500",
    marginTop: 4,
  },
  valueBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 10,
  },
  valueText: {
    color: "#fff",
    fontWeight: "900",
  },
  engagementRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  engagementText: {
    color: "#aaa",
    marginLeft: 5,
    flex: 1,
  },
  separator: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    marginVertical: 25,
  },
  hintIconContainer: {
    marginTop: 6,
    padding: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default InstructionsScreen;
