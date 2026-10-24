import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { AppHeader } from '@/components/app-header';
import { Card, EmptyState, Icon, SectionHeader, StampButton } from '@/components/ui';
import { countStarred, getRecentlyAdded } from '@/db/queries';
import type { Word } from '@/db/types';
import { meaningFor } from '@/lib/meaning';
import { useSettings } from '@/state/settings';
import colors from '@/theme/colors';

function greetingKey(hour: number) {
  if (hour < 11) return 'home.greeting.morning';
  if (hour < 18) return 'home.greeting.afternoon';
  return 'home.greeting.evening';
}

/** Home: jot down a new word, start a review, and see what you added lately. */
export default function HomeScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const db = useSQLiteContext();
  const { settings } = useSettings();
  const [starred, setStarred] = useState(0);
  const [recent, setRecent] = useState<Word[]>([]);

  useFocusEffect(
    useCallback(() => {
      countStarred(db).then(setStarred);
      getRecentlyAdded(db, 6).then(setRecent);
    }, [db]),
  );

  const now = new Date();
  const dateLabel = new Intl.DateTimeFormat(i18n.language, {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(now);

  return (
    <View className="flex-1 bg-surface">
      <AppHeader subtitle={t('nav.home')} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerClassName="w-full max-w-[720px] self-center gap-4 px-4 pb-10 pt-3">
        <View className="gap-0.5 px-1 py-2">
          <Text className="font-display-medium text-[13px] tracking-wide text-ink-soft">{dateLabel}</Text>
          <Text className="text-[32px] font-bold leading-10 text-ink">{t(greetingKey(now.getHours()))}</Text>
        </View>

        {/* Add a word */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('home.addPrompt')}
          onPress={() => router.push('/word-form')}
          className="flex-row items-center gap-4 rounded-card bg-card p-5 shadow-md shadow-ink/10 active:opacity-80">
          <View className="h-12 w-12 items-center justify-center rounded-full bg-primary">
            <Icon name="add" size={28} color="#FFFFFF" />
          </View>
          <View className="flex-1 gap-0.5">
            <Text className="font-display text-[17px] text-ink">{t('home.addPrompt')}</Text>
            <Text className="text-[13px] leading-5 text-ink-soft">{t('home.addHint')}</Text>
          </View>
          <Icon name="chevron-right" size={22} color={colors.ink.muted} />
        </Pressable>

        {/* Review starred words */}
        <Card>
          <SectionHeader title={t('home.reviewTitle')} accent="mustard" />
          {starred > 0 ? (
            <View className="flex-row items-center justify-between gap-3">
              <View className="flex-row items-baseline gap-1">
                <Text className="font-display text-[30px] leading-9 text-ink">{starred}</Text>
                <Text className="font-display-semibold text-[13px] text-ink-soft">{t('library.stats.words')}</Text>
              </View>
              <StampButton label={t('home.startReview')} icon="play-arrow" onPress={() => router.navigate('/review')} />
            </View>
          ) : (
            <EmptyState icon="star-border" message={t('home.noStarred')} />
          )}
        </Card>

        {/* Recently added */}
        <Card>
          <SectionHeader
            title={t('home.recentTitle')}
            right={
              recent.length > 0 ? (
                <Pressable accessibilityRole="link" hitSlop={8} onPress={() => router.navigate('/library')}>
                  <Text className="font-display-semibold text-[13px] text-primary">{t('home.seeAll')}</Text>
                </Pressable>
              ) : undefined
            }
          />
          {recent.length === 0 ? (
            <EmptyState icon="auto-stories" message={t('home.recentEmpty')} />
          ) : (
            <View className="flex-row flex-wrap gap-2">
              {recent.map((word) => (
                <Pressable
                  key={word.id}
                  accessibilityRole="button"
                  onPress={() => router.push({ pathname: '/word/[id]', params: { id: String(word.id) } })}
                  className="rounded-2xl bg-surface-low px-3.5 py-2 active:opacity-70">
                  <Text className="text-[17px] font-bold text-ink">{word.word}</Text>
                  <Text numberOfLines={1} className="max-w-[140px] text-[11px] text-ink-soft">
                    {meaningFor(word, settings.meaningLanguage)}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </Card>
      </ScrollView>
    </View>
  );
}
