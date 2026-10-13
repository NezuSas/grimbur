import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, ImageBackground } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";
import { SafeAreaView } from "react-native-safe-area-context";
import { useGameLayout } from "../ui/layout/useGameLayout";
import { Ionicons } from "@expo/vector-icons";
import { useSettingsStore } from "../state/settings/store";
import characters from "../data/characters";

type Props = NativeStackScreenProps<RootStackParamList, "SettingsScreen">;

const SettingsScreen: React.FC<Props> = ({ navigation }) => {
  const { spacing, titleSize, fontSize, screenWidth } = useGameLayout();
  const { soundEnabled, controlPosition, setSoundEnabled, setControlPosition } = useSettingsStore();

  const cardWidth = Math.min(screenWidth * 0.85, 500);

  const SettingRow = ({ label, icon, children }: { label: string, icon: string, children: React.ReactNode }) => (
    <View style={styles.settingRow}>
      <View style={styles.settingLabelContainer}>
        <Ionicons name={icon as any} size={24} color="#FFD700" style={{ marginRight: 15 }} />
        <Text style={[styles.settingLabel, { fontSize: fontSize(18) }]}>{label}</Text>
      </View>
      {children}
    </View>
  );

  return (
    <ImageBackground source={require("../assets/sprites/backgrounds/Cover_Background.png")} style={styles.root} resizeMode="cover">
      <SafeAreaView style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)' }}>
        <View style={{ flex: 1 }}>
          <View style={[styles.header, { paddingVertical: spacing(15) }]}>
            <TouchableOpacity 
              style={[styles.backButton, { left: spacing(20) }]} 
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={spacing(24)} color="#fff" />
            </TouchableOpacity>
            <Text style={[styles.title, { fontSize: titleSize * 0.8 }]}>SETTINGS</Text>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={[styles.mainCard, { width: cardWidth, padding: spacing(20) }]}>
              
              <SettingRow label="Global Sound" icon={soundEnabled ? "volume-high" : "volume-mute"}>
                <TouchableOpacity 
                  onPress={() => setSoundEnabled(!soundEnabled)}
                  style={[styles.toggleBase, { backgroundColor: soundEnabled ? '#4caf50' : '#333' }]}
                >
                  <View style={[styles.toggleKnob, { alignSelf: soundEnabled ? 'flex-end' : 'flex-start' }]} />
                </TouchableOpacity>
              </SettingRow>

              <View style={styles.separator} />

              <SettingRow label="Control Position" icon="game-controller">
                <View style={styles.segmentedContainer}>
                  <TouchableOpacity 
                    onPress={() => setControlPosition('left')}
                    style={[styles.segment, controlPosition === 'left' && styles.segmentActive]}
                  >
                    <Text style={[styles.segmentText, controlPosition === 'left' && styles.segmentTextActive]}>LEFT</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={() => setControlPosition('right')}
                    style={[styles.segment, controlPosition === 'right' && styles.segmentActive]}
                  >
                    <Text style={[styles.segmentText, controlPosition === 'right' && styles.segmentTextActive]}>RIGHT</Text>
                  </TouchableOpacity>
                </View>
              </SettingRow>

              <View style={styles.separator} />

              <View style={styles.infoBox}>
                <Ionicons name="information-circle-outline" size={20} color="#888" />
                <Text style={styles.infoText}>
                  Settings are saved automatically and applied across all game sessions.
                </Text>
              </View>

            </View>

            <View style={styles.footer}>
              <Image 
                source={characters[1].winImage} 
                style={{ width: 80, height: 80, opacity: 0.8 }} 
                resizeMode="contain"
              />
            </View>
          </ScrollView>
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    backgroundColor: "transparent",
    borderBottomWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    zIndex: 10,
  },
  scrollContent: {
    alignItems: 'center',
    paddingVertical: 30,
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
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderRadius: 30,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  settingLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingLabel: {
    color: '#fff',
    fontWeight: '800',
    letterSpacing: 1,
  },
  toggleBase: {
    width: 60,
    height: 32,
    borderRadius: 16,
    padding: 4,
    justifyContent: 'center',
  },
  toggleKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 4,
    width: 160,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  segmentActive: {
    backgroundColor: '#FFD700',
  },
  segmentText: {
    color: '#888',
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 1,
  },
  segmentTextActive: {
    color: '#000',
  },
  separator: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    marginVertical: 20,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    backgroundColor: 'rgba(255,255,255,0.02)',
    padding: 15,
    borderRadius: 15,
    gap: 10,
  },
  infoText: {
    color: '#666',
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
  },
  footer: {
    marginTop: 30,
    alignItems: 'center',
  }
});

export default SettingsScreen;
