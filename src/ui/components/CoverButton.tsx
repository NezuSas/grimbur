import React, { memo, useRef } from "react";
import {
  Pressable,
  StyleSheet,
  View,
  ViewStyle,
  TextStyle,
  StyleProp,
  Animated,
} from "react-native";
import Text from "./Text";
import { LinearGradient } from "expo-linear-gradient";
import { haptic } from "../../shared/haptics";
import { useGameLayout } from "../layout/useGameLayout";

type Props = {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  fullWidth?: boolean;
  variant?: "primary" | "secondary";
  /** Smaller height and text, for crowded rows. */
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  testID?: string;
};

const CoverButton: React.FC<Props> = memo(
  ({ label, onPress, disabled = false, fullWidth = false, variant = "primary", compact = false, style, textStyle, testID }) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const { fontSize } = useGameLayout();

    const handlePressIn = () => {
      if (disabled) return;
      haptic.impact();
      Animated.spring(scaleAnim, {
        toValue: 0.95,
        useNativeDriver: true,
      }).start();
    };

    const handlePressOut = () => {
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 3,
        tension: 40,
        useNativeDriver: true,
      }).start();
    };

    const gradientColors = variant === "primary" 
      ? ["#333", "#111"] // Obsidian Stone
      : ["#1a2a3a", "#0a1a2a"]; // Temple Night Blue

    const borderColor = variant === "primary" ? "#FFD54F" : "#4fc3f7";

    return (
      <View style={styles.wrapper}>
        <Animated.View style={{ transform: [{ scale: scaleAnim }], width: "100%" }}>
          <Pressable
            testID={testID}
            onPress={onPress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityState={{ disabled }}
            accessibilityLabel={label}
          >
            <LinearGradient
              colors={gradientColors as any}
              style={[
                styles.button,
                { minHeight: compact ? 46 : 52, borderRadius: 14, borderColor, paddingHorizontal: 12, paddingVertical: 6 },
                fullWidth ? { width: '100%' } : null,
                disabled && styles.disabled,
                style,
              ]}
            >
              <Text
                style={[
                  styles.text,
                  { fontSize: compact ? 12 : Math.max(14, fontSize(20)), color: variant === "primary" ? "#FFD54F" : "#fff" },
                  disabled && styles.textDisabled,
                  textStyle,
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
                maxFontSizeMultiplier={1.2}
              >
                {label.toLocaleUpperCase()}
              </Text>
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  wrapper: { alignSelf: "stretch", marginVertical: 6 },
  button: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    // Intense shadow for deep stone look
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  disabled: { 
    opacity: 0.5,
  },
  text: { 
    fontWeight: "900",
    letterSpacing: 2,
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  textDisabled: { color: "#666" },
});

export default CoverButton;
