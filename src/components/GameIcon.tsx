import React from 'react';
import {
  Ban,
  ChevronLeft,
  Hammer,
  Lightbulb,
  Play,
  RotateCcw,
  Shuffle,
  Trophy,
  Volume2,
  VolumeX,
} from 'lucide-react-native';
import { palette } from '../theme/theme';

type GameIconName =
  | 'back'
  | 'best'
  | 'blocked'
  | 'break'
  | 'hint'
  | 'play'
  | 'restart'
  | 'shuffle'
  | 'sound-off'
  | 'sound-on';

interface Props {
  name: GameIconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

const icons = {
  back: ChevronLeft,
  best: Trophy,
  blocked: Ban,
  break: Hammer,
  hint: Lightbulb,
  play: Play,
  restart: RotateCcw,
  shuffle: Shuffle,
  'sound-off': VolumeX,
  'sound-on': Volume2,
} as const;

export default function GameIcon({
  name,
  size = 24,
  color = palette.text,
  strokeWidth = 2.7,
}: Props) {
  const Icon = icons[name];
  return (
    <Icon
      color={color}
      size={size}
      strokeWidth={strokeWidth}
      absoluteStrokeWidth
    />
  );
}
