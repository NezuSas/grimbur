import React, { useEffect, useRef } from 'react';
import { ImageSourcePropType, StyleSheet, View } from 'react-native';
import SpriteImage from './SpriteImage';

type Props = {
  images: ImageSourcePropType[];
  /** Called once every image has been drawn (or failed), or after `timeoutMs`. */
  onDone: () => void;
  /** Called after each image is drawn, with how many are done and how many there are. */
  onProgress?: (done: number, total: number) => void;
  timeoutMs?: number;
};

/**
 * Draws every image once, invisibly, so the platform decodes and caches them before the first
 * real screen. Downloading an asset is not enough: the decode on first draw is what makes
 * sprites flash in. Never blocks longer than `timeoutMs`.
 */
const ImageWarmup: React.FC<Props> = ({ images, onDone, onProgress, timeoutMs = 3000 }) => {
  const remaining = useRef(images.length);
  const finished = useRef(false);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  const finish = () => {
    if (finished.current) return;
    finished.current = true;
    doneRef.current();
  };

  useEffect(() => {
    if (images.length === 0) finish();
    const timer = setTimeout(finish, timeoutMs);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const settle = () => {
    remaining.current -= 1;
    onProgress?.(images.length - Math.max(0, remaining.current), images.length);
    if (remaining.current <= 0) finish();
  };

  return (
    <View style={styles.hidden} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {images.map((source, i) => (
        <SpriteImage key={i} source={source} style={styles.image} onLoadEnd={settle} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  hidden: { position: 'absolute', left: 0, top: 0, width: 1, height: 1, overflow: 'hidden', opacity: 0.01 },
  image: { width: 64, height: 64 },
});

export default ImageWarmup;
