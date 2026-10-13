import React from 'react';
import { StyleSheet, Text as RNText, TextProps } from 'react-native';
import { familyForWeight } from '../fonts';

/** Drop-in replacement for react-native's Text that uses the game's typeface and weight files. */
const Text = React.forwardRef<RNText, TextProps>(({ style, ...rest }, ref) => {
  const flat = StyleSheet.flatten(style) ?? {};
  const resolved = flat.fontFamily
    ? flat
    : { ...flat, fontFamily: familyForWeight(flat.fontWeight), fontWeight: undefined };
  return <RNText ref={ref} style={resolved} {...rest} />;
});
Text.displayName = 'Text';

export default Text;
