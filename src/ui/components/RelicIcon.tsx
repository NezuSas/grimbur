import React from 'react';
import { Image } from 'react-native';
import type { RelicId } from '../../core/engine/relics';
import { RELIC_IMAGES } from '../relicImages';

type Props = { id: RelicId; size: number };

const RelicIcon: React.FC<Props> = ({ id, size }) => (
  <Image
    source={RELIC_IMAGES[id]}
    style={{ width: size, height: size }}
    resizeMode="contain"
    accessibilityIgnoresInvertColors
  />
);

export default RelicIcon;
