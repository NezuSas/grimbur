import React from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  children: React.ReactNode;
  /** Let touches inside text inputs keep the keyboard open. */
  keyboardAvoiding?: boolean;
};

/**
 * Full-screen dimmed layer for game overlays. It
 *  - respects the safe-area insets (notch, gesture bar),
 *  - scrolls when the content is taller than the window (small landscape phones, big fonts, keyboard),
 *  - tells screen readers that only its content is active (`accessibilityViewIsModal`).
 */
const OverlayContainer = ({ children, keyboardAvoiding = false }: Props) => {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();

  return (
    <View
      style={styles.overlay}
      accessibilityViewIsModal
      importantForAccessibility="yes"
    >
      <ScrollView
        style={StyleSheet.absoluteFill}
        contentContainerStyle={[
          styles.content,
          {
            minHeight: height,
            paddingTop: Math.max(insets.top, 8),
            paddingBottom: Math.max(insets.bottom, 8),
            paddingLeft: Math.max(insets.left, 12),
            paddingRight: Math.max(insets.right, 12),
          },
        ]}
        keyboardShouldPersistTaps={keyboardAvoiding ? 'handled' : 'never'}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {children}
      </ScrollView>
    </View>
  );
};

export default OverlayContainer;

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.88)',
    zIndex: 1000,
  },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
