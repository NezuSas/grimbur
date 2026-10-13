// src/ui/components/DirectionButton.tsx
import React, { memo } from "react";
import {
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
  ViewStyle,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import characters from "../../data/characters";

type Direction = "left" | "right" | "up" | "down";

type Props = {
  iconName: React.ComponentProps<typeof Ionicons>["name"];
  direction: "left" | "right" | "up" | "down";
  onPress?: () => void;
  characterIndex: number;
  size?: number;
  iconSize?: number;
};

const DirectionButton: React.FC<Props> = memo(
  ({ iconName, direction, onPress, characterIndex, size = 70, iconSize = 45 }) => {
    const { height } = useWindowDimensions();
    const base = height * 0.25;
    const half = size / 2;

    const positionStyle: ViewStyle = (() => {
      switch (direction) {
        case "left":
          return { position: "absolute", zIndex: 2, top: base - half };
        case "right":
          return { position: "absolute", zIndex: 2, top: base - half, right: 0 };
        case "up":
          return { position: "absolute", zIndex: 2, top: 0, left: base - half };
        case "down":
          return { position: "absolute", zIndex: 2, bottom: 0, left: base - half };
        default:
          return {};
      }
    })();

    const arrowColor = characters?.[characterIndex]?.arrowColor ?? "#FFD54F";

    return (
      <View style={positionStyle}>
        <Pressable
          onPress={onPress}
          android_ripple={{ borderless: false }}
          style={[
            styles.button,
            { width: size, height: size, backgroundColor: arrowColor },
          ]}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`direction-${direction}`}
        >
          <Ionicons name={iconName} size={iconSize} color="black" />
        </Pressable>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  button: {
    borderRadius: 999,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default DirectionButton;
