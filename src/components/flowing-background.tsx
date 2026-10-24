import { useEffect } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

import colors from '@/theme/colors';

/**
 * Soft blobs of warm light drifting slowly behind the home screen, like sun through
 * a window at golden hour. Each blob is a radial gradient (solid in the middle, fading
 * to transparent) that moves back and forth forever on the UI thread, so it stays smooth
 * and light on battery. It holds still when "Reduce Motion" is on in iOS settings.
 *
 * Positions and drift are fractions of the screen size.
 */
const BLOBS = [
  { color: colors.amber.DEFAULT, size: 1.15, x: -0.35, y: -0.2, dx: 0.3, dy: 0.18, duration: 15000 },
  { color: '#F6A98B', size: 0.95, x: 0.4, y: 0.05, dx: -0.25, dy: 0.22, duration: 18000 },
  { color: colors.cream.light, size: 1.0, x: -0.2, y: 0.45, dx: 0.35, dy: -0.12, duration: 21000 },
  { color: '#F3C6A5', size: 0.85, x: 0.35, y: 0.62, dx: -0.3, dy: -0.18, duration: 17000 },
];

export function FlowingBackground() {
  const { width, height } = useWindowDimensions();
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: colors.cream.DEFAULT }]}>
      {BLOBS.map((blob, i) => (
        <Blob key={i} id={`blob-${i}`} {...blob} width={width} height={height} />
      ))}
    </View>
  );
}

function Blob({
  id,
  color,
  size,
  x,
  y,
  dx,
  dy,
  duration,
  width,
  height,
}: (typeof BLOBS)[number] & { id: string; width: number; height: number }) {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    // 0 → 1 → 0 → 1 … forever, easing in and out like breathing.
    progress.value = withRepeat(
      withTiming(1, { duration, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [progress, duration, reduceMotion]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: progress.value * dx * width },
      { translateY: progress.value * dy * height },
      { scale: 1 + progress.value * 0.15 },
    ],
  }));

  const diameter = size * width;
  return (
    <Animated.View
      style={[{ position: 'absolute', left: x * width, top: y * height, width: diameter, height: diameter }, style]}>
      <Svg width={diameter} height={diameter}>
        <Defs>
          <RadialGradient id={id} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={color} stopOpacity={0.9} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={diameter / 2} cy={diameter / 2} r={diameter / 2} fill={`url(#${id})`} />
      </Svg>
    </Animated.View>
  );
}
