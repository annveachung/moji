import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import type { TodayWord } from '@/db/types';
import { toRomaji } from '@/lib/romaji';
import { speakJapanese } from '@/lib/speech';
import { useSettings } from '@/state/settings';

import { FuriganaText } from './furigana-text';
import { IconButton, Pill } from './ui';

/** One of "today's words" on the dashboard. Tap it to open the word's detail page. */
export function WordCard({ item }: { item: TodayWord }) {
  const { t } = useTranslation();
  const router = useRouter();
  const { settings } = useSettings();
  const { word, status } = item;
  const zh = settings.meaningLanguage === 'zh-TW';
  const open = () => router.push({ pathname: '/word/[id]', params: { id: String(word.id) } });

  return (
    <Pressable
      onPress={open}
      accessibilityRole="button"
      accessibilityLabel={`${word.word} ${word.reading}`}
      className="gap-3 rounded-card border border-sumi/15 bg-cream-light p-4 shadow-sm shadow-sumi/10 active:opacity-80">
      <View className="flex-row items-start justify-between">
        <View className="flex-row flex-wrap gap-1.5">
          <Pill label={t(`pos.${word.pos}`)} />
          <Pill
            label={word.jlpt ? t('jlpt.level', { level: word.jlpt }) : t('jlpt.none')}
            tone="amber"
          />
        </View>
        {status === 'known' ? (
          // A hanko seal: 済 means "done"
          <View className="h-8 w-8 rotate-6 items-center justify-center rounded-full border border-shu/40 bg-shu/10">
            <Text className="text-[13px] font-bold text-shu">済</Text>
          </View>
        ) : status === 'learning' ? (
          <Pill label={t('dashboard.status.learning')} icon="timelapse" tone="cream" />
        ) : (
          <Pill label={t('dashboard.status.new')} tone="amber" />
        )}
      </View>

      <View className="flex-row items-center justify-between gap-3">
        <View className="flex-1">
          <FuriganaText
            markup={word.furigana}
            size={34}
            showFurigana={settings.showFurigana}
            className="font-bold text-sumi"
          />
          {settings.showRomaji && (
            <Text className="text-[12px] font-medium text-sumi-light">{toRomaji(word.reading)}</Text>
          )}
        </View>
        <View className="flex-row gap-2">
          <IconButton icon="volume-up" label={t('word.listen')} onPress={() => speakJapanese(word.reading)} />
          {status === 'new' ? (
            <IconButton icon="play-arrow" label={t('dashboard.learnNew')} onPress={open} />
          ) : (
            <IconButton icon="check" tone="sumi" label={t(`dashboard.status.${status}`)} onPress={open} />
          )}
        </View>
      </View>

      <View className="flex-row items-baseline gap-2 rounded-2xl border border-sumi/10 bg-cream p-3">
        <Text className={`text-[10px] font-bold uppercase tracking-wider ${zh ? 'text-shu' : 'text-sumi-light'}`}>
          {zh ? '繁體' : 'EN'}
        </Text>
        <Text className="flex-1 text-[15px] font-bold text-sumi">{zh ? word.meaningZh : word.meaningEn}</Text>
      </View>
    </Pressable>
  );
}
