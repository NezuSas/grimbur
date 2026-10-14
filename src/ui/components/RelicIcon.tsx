import React from 'react';
import { Image } from 'react-native';
import { RELICS, type RelicId } from '../../core/engine/relics';
import Text from './Text';
import { RELIC_IMAGES } from '../relicImages';
import SpriteImage from "./SpriteImage";

type Props = { id: RelicId; size: number };

const RelicIcon: React.FC<Props> = ({ id, size }) => {
  const source = RELIC_IMAGES[id];
  // Relics without art yet show their emoji.
  if (!source) {
    return (
      <Text style={{ width: size, height: size, fontSize: size * 0.72, lineHeight: size, textAlign: 'center' }} accessibilityElementsHidden>
        {RELICS[id].icon}
      </Text>
    );
  }
  return (
    <SpriteImage
      source={source}
      style={{ width: size, height: size }}
      resizeMode="contain"
      accessibilityIgnoresInvertColors
    />
  );
};

export default RelicIcon;
