// src/screens/CharactersScreen.tsx
import React, { memo, useCallback, useMemo, useRef } from "react";
import {
  Image,
  StatusBar,
  StyleSheet,
  Text,
  View,
  Pressable,
  Animated,
  FlatList,
  ImageBackground,
  Dimensions,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import characters, { type Character } from "../data/characters";
import { RootStackParamList } from "../navigation/types";
import { useFocusEffect } from "@react-navigation/native";
import { emitSound } from "../audio/audioEventBus";
import { SafeAreaView } from "react-native-safe-area-context";
import { useGameLayout } from "../ui/layout/useGameLayout";
import { Ionicons } from "@expo/vector-icons";
import { TouchableOpacity } from "react-native-gesture-handler";

type Props = NativeStackScreenProps<RootStackParamList, "CharactersScreen">;

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
const LOOP_MULT = 100;

const CharactersScreen: React.FC<Props> = ({ navigation, route }) => {
  const mode = route.params?.mode ?? "endless";
  const { spacing, titleSize, textSize, fontSize, isTablet } = useGameLayout();
  
  // Dimensions - Refined for better alignment
  const cardWidth = screenWidth * 0.32; 
  const itemMargin = 15;
  const itemLength = cardWidth + (itemMargin * 2);
  const scrollX = useRef(new Animated.Value(0)).current;

  // Handle selection music on focus
  useFocusEffect(
    useCallback(() => {
      emitSound('SELECTION_SCREEN_START');
      return () => emitSound('SELECTION_SCREEN_STOP');
    }, [])
  );

  const base = characters;
  const data = useMemo(() => Array.from({ length: LOOP_MULT }, () => base).flat(), [base]);
  const baseCount = base.length;
  const startBlock = Math.floor(LOOP_MULT / 2);
  const initialIndex = startBlock * baseCount;
  const listRef = useRef<FlatList<Character>>(null);
  const activeIndexRef = useRef(initialIndex);

  const handlePlayPress = useCallback((characterIndex: number, renderIndex: number) => {
    if (renderIndex !== activeIndexRef.current) {
      // Scroll to the card if it was tapped but not focused
      listRef.current?.scrollToIndex({ index: renderIndex, animated: true });
      return;
    }
    try {
      navigation.navigate("GameScreen", { characterIndex, mode });
      emitSound('GAME_MUSIC_START');
    } catch (e) { console.warn("[CharactersScreen] nav error:", e); }
  }, [navigation, mode]);

  const RenderItem = memo(({ ch, index }: { ch: Character; index: number }) => {
    const inputRange = [(index - 1) * itemLength, index * itemLength, (index + 1) * itemLength];

    const scale = scrollX.interpolate({
      inputRange,
      outputRange: [0.85, 1.05, 0.85],
      extrapolate: "clamp",
    });

    const opacity = scrollX.interpolate({
      inputRange,
      outputRange: [0.6, 1, 0.6],
      extrapolate: "clamp",
    });

    const portraitSize = Math.min(screenHeight * 0.35, 110);

    return (
      <View style={{ width: itemLength, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View style={[styles.itemWrapper, { width: cardWidth, transform: [{ scale }], opacity }]}>
          <View style={[styles.card, { borderColor: ch.arrowColor }]}>
            
            {/* Character Spotlight */}
            <View style={[styles.imageContainer, { 
              width: portraitSize, 
              height: portraitSize, 
              borderRadius: portraitSize / 2,
              borderColor: ch.arrowColor + '44' 
            }]}>
               <Image source={ch.playerImage} style={{ width: portraitSize * 0.75, height: portraitSize * 0.75, resizeMode: 'contain' }} />
            </View>

            {/* Character Info */}
            <View style={styles.infoContainer}>
              <Text style={[styles.characterName, { color: '#fff', fontSize: fontSize(26), textShadowColor: ch.arrowColor }]}>
                {ch.playerName.toUpperCase()}
              </Text>
              <View style={[styles.infoUnderline, { backgroundColor: ch.arrowColor }]} />
            </View>
            
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => handlePlayPress(ch.id - 1, index)}
              style={[styles.playButton, { backgroundColor: ch.arrowColor, paddingVertical: spacing(11), paddingHorizontal: spacing(35) }]}
            >
              <Text style={[styles.playButtonText, { fontSize: fontSize(15) }]}>SELECT</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    );
  });

  const keyExtractor = useCallback((_: Character, idx: number) => String(idx), []);
  const getItemLayout = useCallback((_: any, index: number) => ({ length: itemLength, offset: itemLength * index, index }), [itemLength]);

  const onMomentumScrollEnd = useCallback((e: any) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const rawIndex = Math.round(offsetX / itemLength);
    const localPos = rawIndex % baseCount;
    const normalizedLocalPos = (localPos + baseCount) % baseCount;
    const centerIndex = startBlock * baseCount + normalizedLocalPos;
    if (Math.abs(centerIndex - rawIndex) > baseCount * 2) {
      listRef.current?.scrollToIndex({ index: centerIndex, animated: false });
    }
  }, [baseCount, itemLength]);

  return (
    <ImageBackground source={require("../assets/sprites/backgrounds/Cover_Background.png")} style={styles.root} resizeMode="cover">
      <StatusBar hidden />
      <View style={styles.contentLayer}>
        <SafeAreaView style={{ flex: 1 }}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={[styles.title, { fontSize: fontSize(34) }]}>CHOOSE HERO</Text>
            <View style={styles.titleUnderline} />
          </View>

          <View style={styles.carouselContainer}>
            <Animated.FlatList
              ref={listRef}
              data={data}
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={itemLength}
              decelerationRate="fast"
              bounces={false}
              keyExtractor={keyExtractor}
              getItemLayout={getItemLayout}
              initialScrollIndex={initialIndex}
              initialNumToRender={5}
              windowSize={5}
              maxToRenderPerBatch={5}
              contentContainerStyle={{ paddingHorizontal: (screenWidth - itemLength) / 2, alignItems: 'center' }}
              onMomentumScrollEnd={onMomentumScrollEnd}
              onScroll={Animated.event(
                [{ nativeEvent: { contentOffset: { x: scrollX } } }], 
                { 
                  useNativeDriver: true,
                  listener: (e: any) => {
                    const x = e.nativeEvent.contentOffset.x;
                    activeIndexRef.current = Math.round(x / itemLength);
                  }
                }
              )}
              renderItem={({ item, index }) => <RenderItem ch={item} index={index} />}
            />
          </View>
        </SafeAreaView>
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  contentLayer: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", paddingTop: 10 },
  backButton: { position: "absolute", top: 20, left: 20, zIndex: 100, width: 40, height: 40, backgroundColor: "rgba(0,0,0,0.5)", borderRadius: 20, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" },
  header: { alignItems: "center", marginTop: 5 },
  title: { color: "#fff", fontWeight: "900", letterSpacing: 4, textShadowColor: "#000", textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 8 },
  titleUnderline: { height: 4, width: 60, backgroundColor: "#FFD700", marginTop: 4, borderRadius: 2 },
  carouselContainer: { flex: 1, justifyContent: 'center' },
  itemWrapper: { alignItems: "center", justifyContent: "center" },
  card: { backgroundColor: "rgba(0, 0, 0, 0.75)", borderRadius: 30, alignItems: "center", width: "100%", padding: 18, borderWidth: 3, shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 15, elevation: 15, gap: 10 },
  imageContainer: { backgroundColor: "rgba(255, 255, 255, 0.1)", alignItems: "center", justifyContent: "center", borderWidth: 2, marginTop: -5 },
  infoContainer: { alignItems: 'center', gap: 3 },
  characterName: { fontWeight: "900", textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 8 },
  infoUnderline: { height: 2, width: 30, borderRadius: 1 },
  playButton: { borderRadius: 18, alignItems: "center", justifyContent: "center", borderBottomWidth: 3, borderBottomColor: "rgba(0,0,0,0.3)", marginTop: 5 },
  playButtonText: { color: "#111", fontWeight: "900", letterSpacing: 1, textAlign: "center" },
});

export default CharactersScreen;
