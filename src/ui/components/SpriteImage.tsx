import React from 'react';
import { Animated, Image, ImageProps } from 'react-native';

/**
 * The game's illustration component. Two defaults matter on Android:
 *  - `fadeDuration={0}`: the platform fades every image in over 300 ms the first time it appears, which reads as
 *    a flicker when a sprite is swapped (shooting, uncovering a tile);
 *  - `resizeMethod="none"`: the file is decoded once at full size and cached under one key, so the invisible
 *    warm-up at start-up (`ImageWarmup`) really covers every size the sprite is later drawn at.
 * Our sprites are at most 512 px, so keeping them undecimated costs very little memory.
 */
const SpriteImage = React.forwardRef<Image, ImageProps>((props, ref) => (
  <Image fadeDuration={0} resizeMethod="none" {...props} ref={ref} />
));
SpriteImage.displayName = 'SpriteImage';

export const AnimatedSprite = Animated.createAnimatedComponent(SpriteImage);

export default SpriteImage;
