import React from 'react';
import { Animated, Image, ImageProps } from 'react-native';

/**
 * The game's illustration component. Two defaults matter on Android:
 *  - `fadeDuration={0}`: the platform fades every image in over 300 ms the first time it appears, which reads as
 *    a flicker when a sprite is swapped (shooting, uncovering a tile);
 *  - `resizeMethod="none"`: the file is decoded once at full size and cached under one key, so the invisible
 *    warm-up at start-up (`ImageWarmup`) really covers every size the sprite is later drawn at.
 * A full-size decode is NOT free (a 512 px sprite holds ~1 MB of RGBA): what keeps memory in check is that
 * `preloadImages.ts` only warms the art actually on screen in the first minutes, never the outfit catalogue.
 */
const SpriteImage = React.forwardRef<React.ComponentRef<typeof Image>, ImageProps>((props, ref) => (
  <Image fadeDuration={0} resizeMethod="none" {...props} ref={ref} />
));
SpriteImage.displayName = 'SpriteImage';

export const AnimatedSprite = Animated.createAnimatedComponent(SpriteImage);

export default SpriteImage;
