import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Rect } from 'react-native-svg';

/**
 * moji's mascot: a round caramel mochi with a tea sprout, drawn as pixel art (the same
 * picture as the app icon). B = body, E = eyes, G = sprout.
 */
const ART = [
  '.....GG..GG.....',
  '......GGGG......',
  '.......GG.......',
  '.....BBBBBB.....',
  '....BBBBBBBB....',
  '...BBBBBBBBBB...',
  '..BBBBBBBBBBBB..',
  '..BBBEBBBBEBBB..',
  '.BBBBEBBBBEBBBB.',
  '.BBBBBBBBBBBBBB.',
  '.BBBBBBBBBBBBBB.',
  '..BBBBBBBBBBBB..',
  '...BBBBBBBBBB...',
];
const COLS = ART[0].length;
const ROWS = ART.length;

/** color: the real mascot. faded: pale, for "not starred". */
export type MascotTone = 'color' | 'faded';

const PALETTES: Record<MascotTone, Record<string, string>> = {
  color: { B: '#C98245', E: '#2A2018', G: '#6E9A52' },
  faded: { B: '#DCCFC0', E: '#9C8B7D', G: '#C9BCAB' },
};

/** Each run of same-colour pixels in a row becomes one rectangle (fewer shapes to draw). */
function runs(look: -1 | 0 | 1) {
  const out: { x: number; y: number; w: number; key: string }[] = [];
  ART.forEach((row, y) => {
    // Looking left or right: the eyes move one pixel that way.
    const cells = [...row].map((ch) => (ch === 'E' ? 'B' : ch));
    [...row].forEach((ch, x) => {
      if (ch === 'E') cells[x + look] = 'E';
    });
    let x = 0;
    while (x < COLS) {
      const ch = cells[x];
      let end = x;
      while (end + 1 < COLS && cells[end + 1] === ch) end++;
      if (ch !== '.') out.push({ x, y, w: end - x + 1, key: ch });
      x = end + 1;
    }
  });
  return out;
}
const RUNS = { [-1]: runs(-1), 0: runs(0), 1: runs(1) } as Record<-1 | 0 | 1, ReturnType<typeof runs>>;

/** The mascot at a given width (its height follows, 13:16). */
export function Mascot({ size = 24, tone = 'color', look = 0 }: { size?: number; tone?: MascotTone; look?: -1 | 0 | 1 }) {
  const palette = PALETTES[tone];
  return (
    <Svg width={size} height={(size * ROWS) / COLS} viewBox={`0 0 ${COLS} ${ROWS}`}>
      {RUNS[look].map((r) => (
        // A hair taller than a pixel, so no hairline gaps show between rows when scaled.
        <Rect key={`${r.x}-${r.y}`} x={r.x} y={r.y} width={r.w} height={r.y === ROWS - 1 ? 1 : 1.04} fill={palette[r.key]} />
      ))}
    </Svg>
  );
}

/** The ⭐ button, as the mascot: in colour when starred, pale when not. */
export function StarButton({
  starred,
  onPress,
  label,
  size = 32,
}: {
  starred: boolean;
  onPress: () => void;
  label: string;
  size?: number;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: starred }}
      hitSlop={6}
      onPress={onPress}
      style={{ width: size, height: size }}
      className={`items-center justify-center rounded-full active:opacity-70 ${starred ? 'bg-primary-soft' : 'bg-surface-high'}`}>
      <Mascot size={Math.round(size * 0.62)} tone={starred ? 'color' : 'faded'} />
    </Pressable>
  );
}

/**
 * A little mascot strolling back and forth along a strip, bobbing as it walks and looking
 * where it's going; tap it and it hops. Stands still if the device asks for reduced motion.
 */
export function WalkingMascot({ size = 22 }: { size?: number }) {
  const reduceMotion = useReducedMotion();
  const [width, setWidth] = useState(0);
  const [look, setLook] = useState<-1 | 1>(1);
  const x = useSharedValue(0);
  const bob = useSharedValue(0);
  const hop = useSharedValue(0);
  const pixel = size / COLS;

  useEffect(() => {
    if (reduceMotion || width <= size) return;
    const distance = width - size;
    const duration = distance * 30;
    const walk = (to: number) => withTiming(to, { duration, easing: Easing.inOut(Easing.quad) });
    x.value = withRepeat(withSequence(walk(distance), withDelay(1400, walk(0)), withDelay(1400, withTiming(0, { duration: 0 }))), -1);
    bob.value = withRepeat(withSequence(withTiming(-pixel, { duration: 170 }), withTiming(0, { duration: 170 })), -1);
    return () => {
      cancelAnimation(x);
      cancelAnimation(bob);
    };
  }, [width, size, pixel, reduceMotion, x, bob]);

  // Turn to look the other way only when the direction changes (not every frame).
  const facing = useSharedValue(1);
  useAnimatedReaction(
    () => x.value,
    (current, previous) => {
      if (previous === null || current === previous) return;
      const direction = current > previous ? 1 : -1;
      if (direction === facing.value) return;
      facing.value = direction;
      runOnJS(setLook)(direction);
    },
  );

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { translateY: bob.value + hop.value }],
  }));

  const jump = () => {
    hop.value = withSequence(withTiming(-size * 0.7, { duration: 160, easing: Easing.out(Easing.quad) }), withTiming(0, { duration: 220, easing: Easing.in(Easing.quad) }));
  };

  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{ height: size * 1.6, justifyContent: 'flex-end' }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      <Animated.View style={[{ width: size }, style]}>
        <Pressable onPress={jump} hitSlop={10}>
          <Mascot size={size} look={reduceMotion ? 0 : look} />
        </Pressable>
      </Animated.View>
    </View>
  );
}
