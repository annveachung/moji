import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { AppHeader } from '@/components/app-header';
import { Icon } from '@/components/ui';
import colors from '@/theme/colors';

function greetingKey(hour: number) {
  if (hour < 11) return 'home.greeting.morning';
  if (hour < 18) return 'home.greeting.afternoon';
  return 'home.greeting.evening';
}

/** Home: one job, adding a word you just met. */
export default function HomeScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();

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
      </ScrollView>
    </View>
  );
}
