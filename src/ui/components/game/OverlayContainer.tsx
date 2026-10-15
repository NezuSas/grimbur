import React, { useEffect, useRef, useState } from 'react';
import { Animated, Keyboard, Platform, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  children: React.ReactNode;
  /** Let touches inside text inputs keep the keyboard open. */
  keyboardAvoiding?: boolean;
  /** The dimmed layer fades in over this long (ms) instead of cutting to black in one frame. */
  fadeMs?: number;
};

/**
 * Full-screen dimmed layer for game overlays. It
 *  - respects the safe-area insets (notch, gesture bar),
 *  - scrolls when the content is taller than the window (small landscape phones, big fonts, keyboard),
 *  - tells screen readers that only its content is active (`accessibilityViewIsModal`).
 */
const OverlayContainer = ({ children, keyboardAvoiding = false, fadeMs = 220 }: Props) => {
  const insets = useSafeAreaInsets();
  // The layer used to appear at once at 88% black while the card inside took 200 ms to come in: one almost-black frame in between.
  const fade = useRef(new Animated.Value(fadeMs > 0 ? 0 : 1)).current;
  useEffect(() => {
    if (fadeMs > 0) Animated.timing(fade, { toValue: 1, duration: fadeMs, useNativeDriver: true }).start();
  }, [fade, fadeMs]);
  const { height } = useWindowDimensions();
  const [keyboard, setKeyboard] = useState(0);

  // The window is edge-to-edge, so the OS does not resize it: lift the content above the keyboard ourselves.
  useEffect(() => {
    if (!keyboardAvoiding) return;
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', e =>
      setKeyboard(e.endCoordinates?.height ?? 0),
    );
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () =>
      setKeyboard(0),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, [keyboardAvoiding]);

  return (
    <Animated.View
      style={[styles.overlay, { opacity: fade }]}
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
            paddingBottom: Math.max(insets.bottom, 8) + keyboard,
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
    </Animated.View>
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
