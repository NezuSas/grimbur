import React from 'react';
import { Image } from 'react-native';
import type { RelicId } from '../../core/engine/relics';
import { RELIC_IMAGES } from '../relicImages';
import SpriteImage from "./SpriteImage";

type Props = { id: RelicId; size: number };

const RelicIcon: React.FC<Props> = ({ id, size }) => (
  <SpriteImage
    source={RELIC_IMAGES[id]}
    style={{ width: size, height: size }}
    resizeMode="contain"
    accessibilityIgnoresInvertColors
  />
);

export default RelicIcon;
