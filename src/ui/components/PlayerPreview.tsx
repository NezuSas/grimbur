// src/ui/components/PlayerPreview.tsx
import React, { memo } from "react";
import {
  Image,
  ImageSourcePropType,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { useGameLayout } from "../layout/useGameLayout";
import characters from "../../data/characters";

type Props = {
  /** Index into characters[] to pick the player image */
  characterIndex: number;
  /** Optional style override */
  style?: any;
  /** Optional test identifier */
  testID?: string;
};

const PlayerPreview: React.FC<Props> = memo(
  ({ characterIndex, style, testID }) => {
    const { heroSize } = useGameLayout();

    const source =
      (characters?.[characterIndex]?.playerImage as ImageSourcePropType) ?? null;

    if (!source) {
      return (
        <View
          testID={testID}
          style={[styles.fallback, { width: heroSize, height: heroSize }]}
        />
      );
    }

    return (
      <Image
        testID={testID}
        style={[styles.image, { width: heroSize, height: heroSize }, style]}
        source={source}
      />
    );
  }
);

const styles = StyleSheet.create({
  image: {
    resizeMode: "contain", // keep aspect ratio; do not stretch
  },
  fallback: {
    backgroundColor: "transparent",
  },
});

export default PlayerPreview;
