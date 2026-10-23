import { Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import colors from '@/theme/colors';

/**
 * Circular progress, e.g. 2/3 of today's goal.
 * Two circles: a pale track, and an amber arc whose visible length is set with
 * strokeDasharray (dash = whole circumference) and strokeDashoffset (hide the rest).
 */
export function ProgressRing({
  value,
  max,
  label,
  size = 60,
  stroke = 5,
}: {
  value: number;
  max: number;
  label: string;
  size?: number;
  stroke?: number;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = max > 0 ? Math.min(value / max, 1) : 0;

  return (
    <View
      style={{ width: size, height: size }}
      className="items-center justify-center"
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max, now: Math.min(value, max) }}>
      {/* Rotate so the arc starts at 12 o'clock instead of 3 o'clock */}
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.cream.dark}
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.amber.DEFAULT}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
        />
      </Svg>
      <Text className="font-display text-[14px] leading-4 text-sumi">
        {Math.min(value, max)}/{max}
      </Text>
      <Text className="text-[8px] font-bold uppercase text-sumi-muted">{label}</Text>
    </View>
  );
}
