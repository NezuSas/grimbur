import React from 'react';
import type { StyleProp, ImageStyle } from 'react-native';
import SpriteImage from './SpriteImage';
import { GLYPHS, type GlyphName } from '../glyphArt';

/** A painted UI glyph, sized to sit inline with text the way the emoji it replaces did. */
const GlyphIcon = ({ name, size = 16, style }: { name: GlyphName; size?: number; style?: StyleProp<ImageStyle> }) => (
  <SpriteImage source={GLYPHS[name]} style={[{ width: size, height: size }, style]} resizeMode="contain" accessibilityIgnoresInvertColors />
);

export default GlyphIcon;
