import { Text, View } from 'react-native';

import { makeFurigana, parseFurigana } from '@/lib/furigana';

type Props = {
  /** Furigana markup, e.g. 毎日[まいにち]{勉強[べんきょう]}する */
  markup: string;
  showFurigana?: boolean;
  /** Font size of the main text; furigana is drawn at half this size. */
  size?: number;
  /** Tailwind classes for the main text (color, weight). */
  className?: string;
  /** Extra classes for the {target} word, e.g. to highlight it. */
  targetClassName?: string;
  /** Replace the {target} word with a blank (fill-in-the-blank exercises). */
  hideTarget?: boolean;
  /** Classes for the wrapping row, e.g. `justify-center`. */
  containerClassName?: string;
  /** Classes for the small reading above the kanji. */
  rubyClassName?: string;
  /** Without furigana only: cut the text to this many lines, ending in "…". */
  numberOfLines?: number;
  /** false: keep it on one line (a word on a card) instead of wrapping like a sentence. */
  wrap?: boolean;
};

/**
 * Renders Japanese with furigana above the kanji.
 * React Native has no <ruby> tag, so each piece is a small column: [reading] over [text].
 * Plain kana get an empty reading row, which keeps every line the same height.
 */
export function FuriganaText({
  markup,
  showFurigana = true,
  size = 18,
  className = 'text-ink',
  targetClassName = '',
  hideTarget = false,
  containerClassName = '',
  rubyClassName = 'text-primary',
  numberOfLines,
  wrap = true,
}: Props) {
  const rubySize = Math.round(size * 0.5);
  const segments = parseFurigana(markup);

  // Replace the target with one blank, keeping the surrounding text.
  const pieces = hideTarget
    ? segments.reduce<typeof segments>((out, s) => {
        if (!s.target) return [...out, s];
        if (out.at(-1)?.text === '＿＿＿') return out;
        return [...out, { text: '＿＿＿', target: true }];
      }, [])
    : segments;

  if (!showFurigana) {
    return (
      <Text
        numberOfLines={numberOfLines}
        className={`${className} ${containerClassName.includes('justify-center') ? 'text-center' : ''}`}
        style={{ fontSize: size, lineHeight: size * 1.5 }}>
        {pieces.map((s, i) => (
          <Text key={i} className={s.target ? targetClassName : undefined}>
            {s.text}
          </Text>
        ))}
      </Text>
    );
  }

  // Split plain text into single characters so long sentences can wrap anywhere,
  // as Japanese text normally does (it has no spaces between words).
  const units = pieces.flatMap((s) =>
    s.ruby || (hideTarget && s.target) ? [s] : [...s.text].map((char) => ({ ...s, text: char })),
  );

  return (
    <View className={`flex-row items-end ${wrap ? 'flex-wrap' : 'overflow-hidden'} ${containerClassName}`}>
      {units.map((unit, i) => (
        <View key={i} className="items-center">
          <Text
            className={`font-semibold tracking-wide ${rubyClassName}`}
            style={{ fontSize: rubySize, lineHeight: rubySize * 1.3 }}>
            {unit.ruby ?? ' '}
          </Text>
          <Text
            className={`${className} ${unit.target ? targetClassName : ''}`}
            style={{ fontSize: size, lineHeight: size * 1.4 }}>
            {unit.text}
          </Text>
        </View>
      ))}
    </View>
  );
}

/**
 * A word on a card. With furigana on, each reading sits over its own kanji (走[はし]る, not はしる
 * over the whole word); off, just the word, shrunk to fit one line.
 */
export function CardWord({
  word,
  reading,
  furigana,
  size,
  showFurigana,
}: {
  word: string;
  reading: string;
  /** The word's furigana markup, if known; otherwise worked out from the reading. */
  furigana?: string;
  size: number;
  showFurigana: boolean;
}) {
  if (!showFurigana) {
    return (
      <Text numberOfLines={1} adjustsFontSizeToFit className="font-bold text-ink" style={{ fontSize: size, lineHeight: size * 1.4 }}>
        {word}
      </Text>
    );
  }
  return <FuriganaText markup={furigana || makeFurigana(word, reading)} size={size} className="font-bold text-ink" wrap={false} />;
}
