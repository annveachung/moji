import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { AppHeader } from '@/components/app-header';
import { FuriganaText } from '@/components/furigana-text';
import { Card, Icon, IconButton, Pill, StampButton } from '@/components/ui';
import { getShownSentences, getStarredShuffled, recordReview, setWordStarred } from '@/db/queries';
import type { Sentence, Word } from '@/db/types';
import { meaningFor, translationFor } from '@/lib/meaning';
import { toRomaji } from '@/lib/romaji';
import { speakJapanese } from '@/lib/speech';
import { useSettings } from '@/state/settings';
import colors from '@/theme/colors';

/**
 * 復習: go through all your ⭐ starred words in random order.
 * See the Japanese, try to remember, tap to check. "まだ" puts the word back at
 * the end of this round; "覚えた" moves on.
 */
export default function ReviewScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const { t } = useTranslation();
  const { settings } = useSettings();

  const [queue, setQueue] = useState<Word[] | null>(null);
  const [position, setPosition] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [example, setExample] = useState<Sentence | null>(null);
  const [starred, setStarred] = useState(true);
  const [mode, setMode] = useState<'text' | 'audio'>('text');
  // Read by startRound without making it re-run (which would restart the round) on a mode switch.
  const modeRef = useRef(mode);
  const [answers, setAnswers] = useState({ right: 0, total: 0 });

  const current = queue?.[position];

  const show = useCallback(
    async (word: Word | undefined, currentMode: 'text' | 'audio') => {
      setRevealed(false);
      setStarred(true);
      setExample(word ? ((await getShownSentences(db, word.id))[0] ?? null) : null);
      // In audio mode the word is played instead of shown.
      if (word && currentMode === 'audio') speakJapanese(word.reading);
    },
    [db],
  );

  const startRound = useCallback(async () => {
    const words = await getStarredShuffled(db);
    setQueue(words);
    setPosition(0);
    setAnswers({ right: 0, total: 0 });
    await show(words[0], modeRef.current);
  }, [db, show]);

  // A fresh round each time you open the tab.
  useFocusEffect(
    useCallback(() => {
      startRound();
    }, [startRound]),
  );

  const answer = async (remembered: boolean) => {
    if (!queue || !current) return;
    await recordReview(db, current.id, remembered);
    // "Not yet" (and still starred): see it again at the end of this round.
    const next = !remembered && starred ? [...queue, current] : queue;
    setQueue(next);
    setPosition(position + 1);
    setAnswers((a) => ({ right: a.right + (remembered ? 1 : 0), total: a.total + 1 }));
    await show(next[position + 1], mode);
  };

  const toggleStar = async () => {
    if (!current) return;
    await setWordStarred(db, current.id, !starred);
    setStarred(!starred);
  };

  const remaining = queue ? queue.length - position : 0;
  const switchMode = (next: 'text' | 'audio') => {
    setMode(next);
    modeRef.current = next;
    if (current && !revealed && next === 'audio') speakJapanese(current.reading);
  };

  return (
    <View className="flex-1 bg-surface">
      <AppHeader subtitle={t('nav.review')} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerClassName="w-full max-w-[720px] flex-grow self-center gap-4 p-4">
        {queue === null ? null : !current ? (
          <RoundEnd
            reviewed={position}
            onAgain={startRound}
            onLibrary={() => router.navigate('/library')}
          />
        ) : (
          <>
            <ModeSwitch mode={mode} onChange={switchMode} />
            <ProgressPanel
              done={position}
              total={queue.length}
              remaining={remaining}
              accuracy={answers.total > 0 ? answers.right / answers.total : null}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityHint={revealed ? undefined : t('review.tapToReveal')}
              disabled={revealed}
              onPress={() => {
                setRevealed(true);
                speakJapanese(current.reading);
              }}
              className="min-h-[320px] items-center justify-center gap-4 overflow-hidden rounded-[28px] bg-card p-6 shadow-lg shadow-ink/10">
              <View className="absolute right-3 top-3">
                <IconButton
                  icon={starred ? 'star' : 'star-border'}
                  tone={starred ? 'star' : 'quiet'}
                  size={36}
                  label={starred ? t('review.unstar') : t('word.star')}
                  onPress={toggleStar}
                />
              </View>

              {mode === 'audio' && !revealed ? (
                <View className="items-center gap-3">
                  <IconButton
                    icon="volume-up"
                    tone="primary"
                    size={88}
                    label={t('review.playAgain')}
                    onPress={() => speakJapanese(current.reading)}
                  />
                  <Text className="font-display-medium text-[13px] text-ink-soft">{t('review.listenPrompt')}</Text>
                </View>
              ) : (
                <FuriganaText
                  markup={current.furigana}
                  size={56}
                  showFurigana={settings.showFurigana}
                  className="font-bold text-ink"
                  containerClassName="justify-center"
                />
              )}

              {!revealed ? (
                <View className="flex-row items-center gap-2 rounded-full border border-dashed border-ink/30 px-4 py-2">
                  <Icon name="touch-app" size={18} color={colors.ink.muted} />
                  <Text className="text-[14px] text-ink-muted">{t('review.tapToReveal')}</Text>
                </View>
              ) : (
                <Animated.View entering={FadeIn.duration(250)} style={{ alignSelf: 'stretch' }}>
                  <View className="items-center gap-3">
                    {settings.showRomaji && (
                      <Text className="text-[14px] font-semibold text-ink-soft">
                        [ {toRomaji(current.reading)} ]
                      </Text>
                    )}
                    <View className="flex-row items-center gap-2">
                      <Pill label={t(`pos.${current.pos}`)} tone="outline" />
                      <IconButton
                        icon="volume-up"
                        size={34}
                        label={t('word.listen')}
                        onPress={() => speakJapanese(current.reading)}
                      />
                    </View>
                    <View className="self-stretch rounded-2xl bg-primary-soft/60 p-4">
                      <Text className="text-center text-[22px] font-bold leading-8 text-ink">
                        {meaningFor(current, settings.meaningLanguage)}
                      </Text>
                    </View>
                  </View>
                </Animated.View>
              )}
            </Pressable>

            {revealed && example && (
              <Animated.View entering={FadeIn.delay(100).duration(250)}>
                <Card>
                  <Text className="font-display text-[12px] text-primary">{t('review.example')}</Text>
                  <FuriganaText
                    markup={example.ja}
                    size={17}
                    showFurigana={settings.showFurigana}
                    targetClassName="font-bold bg-primary-soft"
                  />
                  <Text className="text-[13px] text-ink-soft">
                    {translationFor(example, settings.meaningLanguage)}
                  </Text>
                </Card>
              </Animated.View>
            )}

            {revealed && (
              <Animated.View entering={FadeIn.delay(150).duration(250)}>
                <View className="flex-row gap-3">
                  <StampButton label={t('review.notYet')} icon="replay" tone="quiet" className="flex-1" onPress={() => answer(false)} />
                  <StampButton label={t('review.gotIt')} icon="check" tone="primary" className="flex-1" onPress={() => answer(true)} />
                </View>
              </Animated.View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function RoundEnd({
  reviewed,
  onAgain,
  onLibrary,
}: {
  reviewed: number;
  onAgain: () => void;
  onLibrary: () => void;
}) {
  const { t } = useTranslation();
  const finished = reviewed > 0;
  return (
    <Card className="items-center gap-3 py-10">
      <View className="h-16 w-16 items-center justify-center rounded-full bg-primary-soft">
        <Icon name={finished ? 'celebration' : 'star-border'} size={32} color={colors.primary.DEFAULT} />
      </View>
      <Text className="font-display text-[22px] text-ink">
        {finished ? t('review.doneTitle') : t('review.emptyTitle')}
      </Text>
      <Text className="px-4 text-center text-[14px] leading-5 text-ink-muted">
        {finished ? t('review.doneBody', { count: reviewed }) : t('review.emptyBody')}
      </Text>
      <View className="mt-2 flex-row gap-2">
        <StampButton label={t('review.goLibrary')} tone="quiet" onPress={onLibrary} />
        {finished && <StampButton label={t('review.again')} icon="replay" tone="primary" onPress={onAgain} />}
      </View>
    </Card>
  );
}

function ModeSwitch({ mode, onChange }: { mode: 'text' | 'audio'; onChange: (mode: 'text' | 'audio') => void }) {
  const { t } = useTranslation();
  const options = [
    { value: 'text' as const, icon: 'translate' as const, label: t('review.modeText') },
    { value: 'audio' as const, icon: 'headphones' as const, label: t('review.modeAudio') },
  ];
  return (
    <View className="flex-row rounded-full bg-surface-highest p-1">
      {options.map((option) => {
        const selected = mode === option.value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            className={`flex-1 flex-row items-center justify-center gap-1.5 rounded-full py-2 ${
              selected ? 'bg-card shadow-sm shadow-ink/10' : ''
            }`}>
            <Icon name={option.icon} size={16} color={selected ? colors.ink.DEFAULT : colors.ink.muted} />
            <Text className={`font-display-semibold text-[13px] ${selected ? 'text-ink' : 'text-ink-muted'}`}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** "7 / 20", a progress bar, words left, and how many you got right this round. */
function ProgressPanel({
  done,
  total,
  remaining,
  accuracy,
}: {
  done: number;
  total: number;
  remaining: number;
  accuracy: number | null;
}) {
  const { t } = useTranslation();
  const progress = total > 0 ? done / total : 0;
  return (
    <View className="gap-2 rounded-2xl bg-card p-3.5 shadow-sm shadow-ink/10">
      <View className="flex-row items-center justify-between">
        <Text className="font-display text-[18px] text-ink">
          {done} <Text className="font-display-medium text-[14px] text-ink-soft">/ {total}</Text>
        </Text>
        <View className="flex-row items-center gap-2">
          <Pill label={t('review.remaining', { count: remaining })} />
          {accuracy !== null && (
            <Pill label={t('review.accuracy', { percent: Math.round(accuracy * 100) })} icon="verified" tone="matcha" />
          )}
        </View>
      </View>
      <View className="h-3 overflow-hidden rounded-full bg-surface-high">
        {/* The filled part is a gradient from vermilion to mustard, drawn with SVG. */}
        <View className="h-full overflow-hidden rounded-full" style={{ width: `${Math.max(Math.round(progress * 100), 4)}%` }}>
          <Svg width="100%" height="100%">
            <Defs>
              <LinearGradient id="bar" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor={colors.primary.DEFAULT} />
                <Stop offset="0.6" stopColor={colors.primary.bright} />
                <Stop offset="1" stopColor={colors.mustard.dim} />
              </LinearGradient>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#bar)" />
          </Svg>
        </View>
      </View>
    </View>
  );
}
