import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { AppHeader } from '@/components/app-header';
import { FuriganaText } from '@/components/furigana-text';
import { ProgressRing } from '@/components/progress-ring';
import { Card, EmptyState, Icon, Pill, SectionHeader } from '@/components/ui';
import { WordCard } from '@/components/word-card';
import { getRecommendedWords } from '@/db/queries';
import type { Word } from '@/db/types';
import { useDashboard } from '@/hooks/use-dashboard';
import { useSettings } from '@/state/settings';
import colors from '@/theme/colors';

function greetingKey(hour: number) {
  if (hour < 11) return 'dashboard.greeting.morning';
  if (hour < 18) return 'dashboard.greeting.afternoon';
  return 'dashboard.greeting.evening';
}

export default function DashboardScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const db = useSQLiteContext();
  const { settings } = useSettings();
  const data = useDashboard(settings.dailyGoal);
  const zh = settings.meaningLanguage === 'zh-TW';

  const openWord = (word: Word) =>
    router.push({ pathname: '/word/[id]', params: { id: String(word.id) } });

  // "Learn New Words" opens the next word you haven't started: today's first new card,
  // or, once the goal is met, the next recommendation beyond it.
  const learnNext = async () => {
    const next =
      data?.today.find((item) => item.status === 'new')?.word ??
      (await getRecommendedWords(db, 1))[0];
    if (next) openWord(next);
  };

  const now = new Date();
  const dateLabel = new Intl.DateTimeFormat(i18n.language, {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(now);

  const streakBadge = (
    <View className="flex-row items-center gap-1 rounded-full border border-sumi/15 bg-amber px-3 py-1">
      <Icon name="local-fire-department" size={14} color={colors.shu.DEFAULT} />
      <Text className="text-[12px] font-bold text-sumi">
        {t('dashboard.streakDays', { count: data?.streak ?? 0 })}
      </Text>
    </View>
  );

  // A note about a Chinese connection from today's words, false friends first.
  const tipWord =
    data?.today.find((item) => item.word.zhLinkKind === 'false-friend')?.word ??
    data?.today.find((item) => item.word.zhNoteEn)?.word;

  return (
    <View className="flex-1 bg-cream">
      <AppHeader subtitle={t('nav.dashboard')} right={streakBadge} />
      {data && (
        <ScrollView contentContainerClassName="w-full max-w-[720px] self-center gap-4 p-4 pb-8">
          {/* Greeting and today's goal */}
          <Card className="overflow-hidden">
            <View className="absolute -bottom-6 -right-6 h-28 w-28 rounded-full bg-amber/25" />
            <View className="flex-row items-start justify-between gap-3">
              <View className="flex-1">
                <View className="mb-1 flex-row items-center gap-1.5">
                  <View className="h-2 w-2 rounded-full bg-shu" />
                  <Text className="text-[11px] font-bold uppercase tracking-wide text-sumi-light">
                    {dateLabel}
                  </Text>
                </View>
                <Text className="font-display text-[22px] text-sumi">{t(greetingKey(now.getHours()))}</Text>
                <Text className="mt-0.5 text-[13px] text-sumi-muted">
                  {t('dashboard.goal', { count: settings.dailyGoal })}
                </Text>
              </View>
              <ProgressRing value={data.learnedToday} max={settings.dailyGoal} label={t('dashboard.ringDone')} />
            </View>
            <View className="flex-row items-center gap-3 rounded-2xl border border-sumi/10 bg-cream p-3">
              <View className="h-8 w-8 items-center justify-center rounded-full border border-sumi/10 bg-amber">
                <Icon name="verified" size={18} />
              </View>
              <View className="flex-1">
                <Text className="text-[13px] font-bold text-sumi">{t('dashboard.motivation')}</Text>
                <Text className="text-[11px] text-sumi-muted">
                  {data.due > 0 ? t('dashboard.dueToday', { count: data.due }) : t('dashboard.allCaughtUp')}
                </Text>
              </View>
            </View>
          </Card>

          {/* Quick actions */}
          <View className="flex-row gap-3">
            <QuickAction
              tone="sumi"
              icon="sync"
              title="復習を始める"
              subtitle={t('dashboard.startReview')}
              badge={t('dashboard.dueBadge', { count: data.due })}
              onPress={() => router.navigate('/review')}
            />
            <QuickAction
              tone="amber"
              icon="add-circle"
              title="新しい単語"
              subtitle={t('dashboard.learnNew')}
              badge={
                data.learnedToday >= settings.dailyGoal
                  ? t('dashboard.allLearnedBadge')
                  : t('dashboard.learnBadge')
              }
              onPress={learnNext}
            />
          </View>

          {/* Today's words */}
          <View className="gap-3">
            <View className="flex-row items-center justify-between px-1">
              <View className="flex-row items-center gap-2">
                <Text className="text-[17px] font-bold text-sumi">{t('dashboard.todayTitle')}</Text>
                <Pill label={t('dashboard.cards', { count: data.today.length })} />
              </View>
              <Pressable
                accessibilityRole="link"
                onPress={() => router.navigate('/library')}
                hitSlop={8}
                className="flex-row items-center">
                <Text className="text-[13px] font-bold text-sumi">{t('dashboard.seeAll')}</Text>
                <Icon name="chevron-right" size={18} />
              </Pressable>
            </View>
            {data.today.length > 0 ? (
              data.today.map((item) => <WordCard key={item.word.id} item={item} />)
            ) : (
              <EmptyState icon="celebration" message={t('dashboard.noWordsLeft')} />
            )}
          </View>

          {/* Weak words */}
          <Card>
            <SectionHeader
              icon="priority-high"
              title={t('dashboard.weakTitle')}
              right={<Text className="text-[11px] font-bold text-shu">{t('dashboard.weakSubtitle')}</Text>}
            />
            {data.weak.length === 0 ? (
              <EmptyState icon="sentiment-satisfied" message={t('dashboard.weakEmpty')} />
            ) : (
              data.weak.map(({ word, accuracy }) => (
                <View
                  key={word.id}
                  className="flex-row items-center justify-between gap-2 rounded-2xl border border-sumi/10 bg-cream p-3">
                  <View className="flex-1 gap-0.5">
                    <View className="flex-row items-end gap-2">
                      <FuriganaText
                        markup={word.furigana}
                        size={18}
                        showFurigana={settings.showFurigana}
                        className="font-bold text-sumi"
                      />
                      {accuracy !== null && (
                        <Pill
                          label={t('dashboard.accuracy', { percent: Math.round(accuracy * 100) })}
                          tone={accuracy < 0.5 ? 'shu' : 'amber'}
                        />
                      )}
                    </View>
                    <Text numberOfLines={1} className="text-[12px] text-sumi-muted">
                      {zh ? word.meaningZh : word.meaningEn}
                    </Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => openWord(word)}
                    className="flex-row items-center gap-1 rounded-full border border-sumi/20 bg-cream-light px-3 py-1.5 active:bg-amber">
                    <Icon name="refresh" size={14} />
                    <Text className="text-[12px] font-bold text-sumi">{t('dashboard.reviewAction')}</Text>
                  </Pressable>
                </View>
              ))
            )}
          </Card>

          {/* Recently learned */}
          <Card>
            <SectionHeader icon="history" title={t('dashboard.recentTitle')} />
            {data.recent.length === 0 ? (
              <EmptyState icon="school" message={t('dashboard.recentEmpty')} />
            ) : (
              <View className="flex-row flex-wrap gap-2">
                {data.recent.map((word) => (
                  <Pressable
                    key={word.id}
                    accessibilityRole="button"
                    onPress={() => openWord(word)}
                    className="rounded-2xl border border-sumi/10 bg-cream px-3 py-2 active:bg-amber/40">
                    <Text className="text-[16px] font-bold text-sumi">{word.word}</Text>
                    <Text className="text-[11px] text-sumi-muted">{word.reading}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </Card>

          {/* Stats */}
          <Card>
            <SectionHeader icon="insights" title={t('dashboard.statsTitle')} />
            <View className="flex-row gap-2">
              <Stat value={String(data.stats.mastered)} label={t('dashboard.statMastered')} />
              <Stat
                value={data.stats.retention7d === null ? '—' : `${Math.round(data.stats.retention7d * 100)}%`}
                label={t('dashboard.statRetention')}
                accent
              />
              <Stat value={String(data.streak)} label={t('dashboard.statStreak')} />
            </View>
          </Card>

          {/* Did you know? A Chinese-Japanese connection from today's words */}
          {tipWord && (
            <View className="flex-row items-start gap-3 rounded-2xl border border-sumi/15 bg-amber/35 p-3.5">
              <View className="mt-0.5 h-6 w-6 items-center justify-center rounded-full bg-sumi">
                <Icon name="lightbulb" size={14} color={colors.amber.DEFAULT} />
              </View>
              <Text className="flex-1 text-[13px] leading-5 text-sumi">
                <Text className="font-bold">
                  {t('dashboard.tipTitle')} {tipWord.word}：
                </Text>
                {zh ? tipWord.zhNoteZh : tipWord.zhNoteEn}
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

function QuickAction({
  tone,
  icon,
  title,
  subtitle,
  badge,
  onPress,
}: {
  tone: 'sumi' | 'amber';
  icon: 'sync' | 'add-circle';
  title: string;
  subtitle: string;
  badge: string;
  onPress: () => void;
}) {
  const dark = tone === 'sumi';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={subtitle}
      onPress={onPress}
      className={`flex-1 justify-between gap-4 rounded-card p-4 shadow-md shadow-sumi/20 active:translate-y-0.5 ${
        dark ? 'bg-sumi' : 'border border-sumi/20 bg-amber'
      }`}>
      <View className="flex-row items-center justify-between">
        <View
          className={`h-8 w-8 items-center justify-center rounded-full ${dark ? 'bg-amber' : 'bg-sumi'}`}>
          <Icon name={icon} size={20} color={dark ? colors.sumi.DEFAULT : colors.amber.DEFAULT} />
        </View>
        <View className={`rounded-full px-2 py-0.5 ${dark ? 'bg-amber' : 'border border-sumi/15 bg-cream-light'}`}>
          <Text className="text-[11px] font-bold text-sumi">{badge}</Text>
        </View>
      </View>
      <View>
        <Text className={`text-[15px] font-bold ${dark ? 'text-cream-light' : 'text-sumi'}`}>{title}</Text>
        <Text className={`mt-0.5 text-[12px] ${dark ? 'text-cream/80' : 'text-sumi/80'}`}>{subtitle}</Text>
      </View>
    </Pressable>
  );
}

function Stat({ value, label, accent = false }: { value: string; label: string; accent?: boolean }) {
  return (
    <View className="flex-1 items-center justify-center rounded-2xl border border-sumi/10 bg-cream p-3">
      <Text className={`font-display text-[22px] ${accent ? 'text-amber-dark' : 'text-sumi'}`}>{value}</Text>
      <Text className="mt-0.5 text-center text-[11px] font-medium text-sumi-muted">{label}</Text>
    </View>
  );
}
