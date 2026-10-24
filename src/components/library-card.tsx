import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import type { LibraryWord } from '@/db/types';
import { meaningFor, translationFor } from '@/lib/meaning';
import { relativeDay } from '@/lib/relative-time';
import { toRomaji } from '@/lib/romaji';
import { speakJapanese } from '@/lib/speech';
import { useSettings } from '@/state/settings';
import colors from '@/theme/colors';

import { FuriganaText } from './furigana-text';
import { Icon, IconButton, Pill } from './ui';

type Props = { word: LibraryWord; onToggleStar: () => void };

function useOpen(id: number) {
  const router = useRouter();
  return () => router.push({ pathname: '/word/[id]', params: { id: String(id) } });
}

/** Status badge: 苦手 in vermilion, 習得 in charcoal. Starred is shown by the star button. */
function StatusBadge({ word }: { word: LibraryWord }) {
  const { t } = useTranslation();
  if (word.status === 'weak') return <Pill label={t('library.badge.weak')} icon="priority-high" tone="shu" />;
  if (word.status === 'known') return <Pill label={t('library.badge.known')} icon="check-circle" tone="sumi" />;
  return null;
}

/** A word in the library's list view: reading above the word, meaning, example and history. */
export function LibraryCard({ word, onToggleStar }: Props) {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const open = useOpen(word.id);
  const kanaOnly = word.reading === word.word;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${word.word} ${word.reading}`}
      onPress={open}
      className="gap-3 rounded-card bg-paper p-4 shadow-md shadow-sumi/10 active:opacity-80">
      <View className="flex-row items-center justify-between gap-2">
        <View className="flex-1 flex-row flex-wrap gap-1.5">
          {word.jlpt && <Pill label={`JLPT N${word.jlpt}`} tone="amber" />}
          <Pill label={t(`pos.${word.pos}`)} />
          {word.topic && <Pill label={t(`topic.${word.topic}`)} tone="outline" />}
        </View>
        <View className="flex-row items-center gap-1.5">
          <StatusBadge word={word} />
          <IconButton
            icon={word.starredAt ? 'star' : 'star-border'}
            tone={word.starredAt ? 'amber' : 'cream'}
            size={32}
            label={word.starredAt ? t('word.starred') : t('word.star')}
            onPress={onToggleStar}
          />
        </View>
      </View>

      <View className="flex-row items-center justify-between gap-3">
        <View className="flex-1">
          {settings.showFurigana && !kanaOnly && (
            <Text className="text-[12px] font-semibold tracking-widest text-amber-deep">{word.reading}</Text>
          )}
          <Text className="text-[28px] font-bold leading-9 text-sumi">{word.word}</Text>
          {settings.showRomaji && (
            <Text className="font-display-medium text-[12px] tracking-wide text-sumi-light">
              {toRomaji(word.reading)}
            </Text>
          )}
        </View>
        <IconButton icon="volume-up" tone="cream" label={t('word.listen')} onPress={() => speakJapanese(word.reading)} />
      </View>

      <View className="gap-2 rounded-xl bg-cream/60 p-3">
        <Text className="text-[15px] font-semibold leading-5 text-sumi">
          {meaningFor(word, settings.meaningLanguage)}
        </Text>
        {word.example && (
          <View className="gap-0.5 rounded-lg bg-paper/80 px-2.5 py-2">
            <FuriganaText
              markup={word.example.ja}
              size={14}
              showFurigana={false}
              targetClassName="font-bold text-amber-deep"
            />
            <Text className="text-[12px] leading-4 text-sumi-light">
              {translationFor(word.example, settings.meaningLanguage)}
            </Text>
          </View>
        )}
      </View>

      <View className="flex-row items-center gap-1">
        <Icon name="schedule" size={13} color={colors.sumi.muted} />
        <Text className="font-display-medium text-[11px] text-sumi-muted">
          {word.lastReviewedAt
            ? t('library.lastReviewed', { when: relativeDay(word.lastReviewedAt, t) })
            : t('library.added', { when: relativeDay(word.savedAt ?? word.createdAt, t) })}
        </Text>
      </View>
    </Pressable>
  );
}

/** A word in the library's compact grid view. */
export function LibraryTile({ word, onToggleStar }: Props) {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const open = useOpen(word.id);
  const kanaOnly = word.reading === word.word;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${word.word} ${word.reading}`}
      onPress={open}
      className="flex-1 gap-1 rounded-2xl bg-paper p-3 shadow-md shadow-sumi/10 active:opacity-80">
      <View className="flex-row items-start justify-between">
        <View className="flex-1">
          {settings.showFurigana && !kanaOnly && (
            <Text numberOfLines={1} className="text-[10px] font-semibold tracking-wider text-amber-deep">
              {word.reading}
            </Text>
          )}
          <Text numberOfLines={1} className="text-[22px] font-bold text-sumi">
            {word.word}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={word.starredAt ? t('word.starred') : t('word.star')}
          hitSlop={10}
          onPress={onToggleStar}>
          <Icon
            name={word.starredAt ? 'star' : 'star-border'}
            size={20}
            color={word.starredAt ? colors.amber.dark : colors.sumi.muted}
          />
        </Pressable>
      </View>
      <Text numberOfLines={1} className="text-[12px] text-sumi-light">
        {meaningFor(word, settings.meaningLanguage)}
      </Text>
      {word.status && (
        <View
          className={`mt-1 h-1 w-8 rounded-full ${word.status === 'weak' ? 'bg-shu' : 'bg-sumi'}`}
        />
      )}
    </Pressable>
  );
}
