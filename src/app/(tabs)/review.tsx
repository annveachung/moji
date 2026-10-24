import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { AppHeader } from '@/components/app-header';
import { FuriganaText } from '@/components/furigana-text';
import { Card, Icon, IconButton, Pill } from '@/components/ui';
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

  const current = queue?.[position];

  const show = useCallback(
    async (word: Word | undefined) => {
      setRevealed(false);
      setStarred(true);
      setExample(word ? ((await getShownSentences(db, word.id))[0] ?? null) : null);
    },
    [db],
  );

  const startRound = useCallback(async () => {
    const words = await getStarredShuffled(db);
    setQueue(words);
    setPosition(0);
    await show(words[0]);
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
    await show(next[position + 1]);
  };

  const toggleStar = async () => {
    if (!current) return;
    await setWordStarred(db, current.id, !starred);
    setStarred(!starred);
  };

  const remaining = queue ? queue.length - position : 0;

  return (
    <View className="flex-1 bg-cream">
      <AppHeader
        subtitle={t('nav.review')}
        right={current ? <Pill label={t('review.remaining', { count: remaining })} tone="amber" /> : null}
      />
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
            <Pressable
              accessibilityRole="button"
              accessibilityHint={revealed ? undefined : t('review.tapToReveal')}
              disabled={revealed}
              onPress={() => {
                setRevealed(true);
                speakJapanese(current.reading);
              }}
              className="min-h-[320px] items-center justify-center gap-4 overflow-hidden rounded-card border border-amber/60 bg-cream-light p-6 shadow-sm shadow-sumi/10">
              <View className="absolute right-3 top-3">
                <IconButton
                  icon={starred ? 'star' : 'star-border'}
                  tone={starred ? 'amber' : 'cream'}
                  size={36}
                  label={starred ? t('review.unstar') : t('word.star')}
                  onPress={toggleStar}
                />
              </View>

              <FuriganaText
                markup={current.furigana}
                size={56}
                showFurigana={settings.showFurigana}
                className="font-bold text-sumi"
                containerClassName="justify-center"
              />

              {!revealed ? (
                <View className="flex-row items-center gap-2 rounded-full border border-dashed border-sumi/30 px-4 py-2">
                  <Icon name="touch-app" size={18} color={colors.sumi.muted} />
                  <Text className="text-[14px] text-sumi-muted">{t('review.tapToReveal')}</Text>
                </View>
              ) : (
                <Animated.View entering={FadeIn.duration(250)} style={{ alignSelf: 'stretch' }}>
                  <View className="items-center gap-3">
                    {settings.showRomaji && (
                      <Text className="text-[14px] font-semibold text-sumi-light">
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
                    <View className="self-stretch rounded-xl border-2 border-amber bg-amber/35 p-4">
                      <Text className="text-center text-[22px] font-bold leading-8 text-sumi">
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
                  <Text className="text-[12px] font-bold text-sumi-light">{t('review.example')}</Text>
                  <FuriganaText
                    markup={example.ja}
                    size={17}
                    showFurigana={settings.showFurigana}
                    targetClassName="font-bold bg-amber/50"
                  />
                  <Text className="text-[13px] text-sumi-light">
                    {translationFor(example, settings.meaningLanguage)}
                  </Text>
                </Card>
              </Animated.View>
            )}

            {revealed && (
              <Animated.View entering={FadeIn.delay(150).duration(250)}>
                <View className="flex-row gap-3">
                  <AnswerButton label={t('review.notYet')} icon="replay" tone="quiet" onPress={() => answer(false)} />
                  <AnswerButton label={t('review.gotIt')} icon="check" tone="amber" onPress={() => answer(true)} />
                </View>
              </Animated.View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function AnswerButton({
  label,
  icon,
  tone,
  onPress,
}: {
  label: string;
  icon: 'replay' | 'check';
  tone: 'quiet' | 'amber';
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className={`flex-1 flex-row items-center justify-center gap-2 rounded-2xl py-4 active:scale-95 ${
        tone === 'amber' ? 'border border-sumi/20 bg-amber' : 'border border-sumi/25 bg-cream-light'
      }`}>
      <Icon name={icon} size={20} />
      <Text className="text-[16px] font-bold text-sumi">{label}</Text>
    </Pressable>
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
      <View className="h-16 w-16 items-center justify-center rounded-full bg-amber">
        <Icon name={finished ? 'celebration' : 'star-border'} size={32} />
      </View>
      <Text className="font-display text-[22px] text-sumi">
        {finished ? t('review.doneTitle') : t('review.emptyTitle')}
      </Text>
      <Text className="px-4 text-center text-[14px] leading-5 text-sumi-muted">
        {finished ? t('review.doneBody', { count: reviewed }) : t('review.emptyBody')}
      </Text>
      <View className="mt-2 flex-row gap-2">
        <Pressable
          accessibilityRole="button"
          onPress={onLibrary}
          className="rounded-xl border border-sumi/25 px-4 py-3 active:bg-cream-dark">
          <Text className="text-[14px] font-bold text-sumi">{t('review.goLibrary')}</Text>
        </Pressable>
        {finished && (
          <Pressable
            accessibilityRole="button"
            onPress={onAgain}
            className="rounded-xl border border-sumi/20 bg-amber px-4 py-3 active:bg-amber-hover">
            <Text className="text-[14px] font-bold text-sumi">{t('review.again')}</Text>
          </Pressable>
        )}
      </View>
    </Card>
  );
}
