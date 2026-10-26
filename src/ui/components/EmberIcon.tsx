import React from 'react';
import type { StyleProp, ImageStyle } from 'react-native';
import SpriteImage from './SpriteImage';

const EMBER = require('../../assets/sprites/items/Icon_Ember.png');
const EMBER_PILE = require('../../assets/sprites/items/Icon_EmberPile.png');

/**
 * The ember currency, as painted art instead of the 🔥 emoji (which renders differently on every phone
 * and clashed with the game's style). `pile` is the richer variant for big rewards.
 */
const EmberIcon = ({ size = 16, pile = false, style }: { size?: number; pile?: boolean; style?: StyleProp<ImageStyle> }) => (
  <SpriteImage source={pile ? EMBER_PILE : EMBER} style={[{ width: size, height: size }, style]} resizeMode="contain" accessibilityIgnoresInvertColors />
);

export default EmberIcon;
