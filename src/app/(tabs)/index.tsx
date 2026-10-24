import { BlurView } from 'expo-blur';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FlowingBackground } from '@/components/flowing-background';
import { Icon } from '@/components/ui';
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

/** Home: a calm place to jot down a new word, start a review, and see what you added lately. */
export default function HomeScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
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
    <View className="flex-1">
      <FlowingBackground />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerClassName="w-full max-w-[720px] self-center gap-5 px-5 pb-10"
        contentContainerStyle={{ paddingTop: insets.top + 12 }}>
        <View className="flex-row items-baseline gap-1.5">
          <Text className="font-display text-[20px] text-sumi">moji</Text>
          <Text className="text-[12px] font-bold text-amber-deep">文字</Text>
        </View>

        <View className="mt-10 gap-1">
          <Text className="font-display-medium text-[14px] tracking-wide text-sumi-light">{dateLabel}</Text>
          <Text className="text-[40px] font-bold leading-[48px] text-sumi">{t(greetingKey(now.getHours()))}</Text>
        </View>

        {/* Add a word */}
        <Glass>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('home.addPrompt')}
            onPress={() => router.push('/word-form')}
            className="flex-row items-center gap-4 p-5 active:opacity-70">
            <View className="h-12 w-12 items-center justify-center rounded-full bg-sumi">
              <Icon name="add" size={28} color={colors.amber.DEFAULT} />
            </View>
            <View className="flex-1 gap-0.5">
              <Text className="font-display text-[18px] text-sumi">{t('home.addPrompt')}</Text>
              <Text className="text-[13px] leading-5 text-sumi-light">{t('home.addHint')}</Text>
            </View>
          </Pressable>
        </Glass>

        {/* Review starred words */}
        <Glass>
          <View className="flex-row items-center gap-4 p-5">
            <View className="flex-1 gap-0.5">
              <Text className="font-display text-[15px] text-sumi">{t('home.reviewTitle')}</Text>
              <Text className="text-[13px] text-sumi-light">
                {starred > 0 ? t('home.starred', { count: starred }) : t('home.noStarred')}
              </Text>
            </View>
            {starred > 0 && (
              <Pressable
                accessibilityRole="button"
                onPress={() => router.navigate('/review')}
                className="flex-row items-center gap-1 rounded-full bg-amber px-4 py-2.5 active:bg-amber-hover">
                <Text className="font-display text-[14px] text-sumi">{t('home.startReview')}</Text>
                <Icon name="play-arrow" size={18} />
              </Pressable>
            )}
          </View>
        </Glass>

        {/* Recently added */}
        <View className="gap-3">
          <View className="flex-row items-center justify-between px-1">
            <Text className="font-display text-[15px] text-sumi">{t('home.recentTitle')}</Text>
            {recent.length > 0 && (
              <Pressable accessibilityRole="link" hitSlop={8} onPress={() => router.navigate('/library')}>
                <Text className="text-[13px] font-semibold text-sumi-light">{t('home.seeAll')}</Text>
              </Pressable>
            )}
          </View>
          {recent.length === 0 ? (
            <Text className="px-1 text-[13px] text-sumi-light">{t('home.recentEmpty')}</Text>
          ) : (
            <View className="flex-row flex-wrap gap-2">
              {recent.map((word) => (
                <Pressable
                  key={word.id}
                  accessibilityRole="button"
                  onPress={() => router.push({ pathname: '/word/[id]', params: { id: String(word.id) } })}
                  className="rounded-2xl bg-cream-light/80 px-3.5 py-2 active:opacity-70">
                  <Text className="text-[17px] font-bold text-sumi">{word.word}</Text>
                  <Text numberOfLines={1} className="max-w-[140px] text-[11px] text-sumi-light">
                    {meaningFor(word, settings.meaningLanguage)}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

/** Frosted glass card: the moving background shows through, softly blurred. */
function Glass({ children }: { children: ReactNode }) {
  return (
    <View className="overflow-hidden rounded-[28px] border border-white/60 shadow-sm shadow-sumi/10">
      <BlurView intensity={40} tint="light" style={{ backgroundColor: 'rgba(252, 245, 232, 0.45)' }}>
        {children}
      </BlurView>
    </View>
  );
}
