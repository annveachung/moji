import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import type { LibraryFilters, LibraryWord } from '@/db/types';
import { meaningFor, translationFor } from '@/lib/meaning';
import { relativeDay } from '@/lib/relative-time';
import { toRomaji } from '@/lib/romaji';
import { speakJapanese } from '@/lib/speech';
import { useSettings } from '@/state/settings';
import colors from '@/theme/colors';

import { FuriganaText } from './furigana-text';
import { Icon, IconButton, Pill, type PillTone } from './ui';

type Props = { word: LibraryWord; onToggleStar: () => void };

/** A pill you can tap to filter the library by that tag (tap again to clear it). */
function TagPill({
  label,
  tone,
  active,
  onPress,
}: {
  label: string;
  tone: PillTone;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: active }} hitSlop={4} onPress={onPress}>
      <Pill label={label} tone={active ? 'primary' : tone} icon={active ? 'filter-alt' : undefined} />
    </Pressable>
  );
}

function useOpen(id: number) {
  const router = useRouter();
  return () => router.push({ pathname: '/word/[id]', params: { id: String(id) } });
}

/** 習得 badge for words you usually get right. Starred is shown by the star button. */
function StatusBadge({ word }: { word: LibraryWord }) {
  const { t } = useTranslation();
  if (word.status === 'known') return <Pill label={t('library.badge.known')} icon="check-circle" tone="matcha" />;
  return null;
}

/** A word in the library's list view: reading above the word, meaning, example and history. */
export function LibraryCard({
  word,
  onToggleStar,
  filters,
  onFilter,
}: Props & { filters: LibraryFilters; onFilter: (patch: Partial<LibraryFilters>) => void }) {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const open = useOpen(word.id);
  const kanaOnly = word.reading === word.word;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${word.word} ${word.reading}`}
      onPress={open}
      className="gap-3 rounded-card bg-card p-4 shadow-md shadow-ink/10 active:opacity-80">
      <View className="flex-row items-center justify-between gap-2">
        <View className="flex-1 flex-row flex-wrap gap-1.5">
          {word.jlpt !== null ? (
            <TagPill
              label={`JLPT N${word.jlpt}`}
              tone="mustard"
              active={filters.jlpt === word.jlpt}
              onPress={() => onFilter({ jlpt: filters.jlpt === word.jlpt ? null : word.jlpt })}
            />
          ) : null}
          <TagPill
            label={t(`pos.${word.pos}`)}
            tone="neutral"
            active={filters.pos === word.pos}
            onPress={() => onFilter({ pos: filters.pos === word.pos ? null : word.pos })}
          />
          {/* Words without a topic (like most you add yourself) are grouped as その他. */}
          <TagPill
            label={t(`topic.${word.topic ?? 'other'}`)}
            tone="outline"
            active={filters.topic === (word.topic ?? 'other')}
            onPress={() => {
              const topic = word.topic ?? 'other';
              onFilter({ topic: filters.topic === topic ? null : topic });
            }}
          />
        </View>
        <View className="flex-row items-center gap-1.5">
          <StatusBadge word={word} />
          <IconButton
            icon={word.starredAt ? 'star' : 'star-border'}
            tone={word.starredAt ? 'star' : 'quiet'}
            size={32}
            label={word.starredAt ? t('word.starred') : t('word.star')}
            onPress={onToggleStar}
          />
        </View>
      </View>

      <View className="flex-row items-center justify-between gap-3">
        <View className="flex-1">
          {settings.showFurigana && !kanaOnly && (
            <Text className="text-[12px] font-semibold tracking-widest text-primary">{word.reading}</Text>
          )}
          <Text className="text-[28px] font-bold leading-9 text-ink">{word.word}</Text>
          {settings.showRomaji && (
            <Text className="font-display-medium text-[12px] tracking-wide text-ink-soft">
              {toRomaji(word.reading)}
            </Text>
          )}
        </View>
        <IconButton icon="volume-up" tone="quiet" label={t('word.listen')} onPress={() => speakJapanese(word.reading)} />
      </View>

      <View className="gap-2 rounded-xl bg-surface-low p-3">
        <Text className="text-[15px] font-semibold leading-5 text-ink">
          {meaningFor(word, settings.meaningLanguage)}
        </Text>
        {word.example !== null ? (
          <View className="gap-0.5 rounded-lg bg-card/80 px-2.5 py-2">
            <FuriganaText
              markup={word.example.ja}
              size={14}
              showFurigana={false}
              targetClassName="font-bold text-primary"
            />
            <Text className="text-[12px] leading-4 text-ink-soft">
              {translationFor(word.example, settings.meaningLanguage)}
            </Text>
          </View>
        ) : null}
      </View>

      <View className="flex-row items-center gap-1">
        <Icon name="schedule" size={13} color={colors.ink.muted} />
        <Text className="font-display-medium text-[11px] text-ink-muted">
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
      className="flex-1 gap-1 rounded-2xl bg-card p-3 shadow-md shadow-ink/10 active:opacity-80">
      <View className="flex-row items-start justify-between">
        <View className="flex-1">
          {settings.showFurigana && !kanaOnly && (
            <Text numberOfLines={1} className="text-[10px] font-semibold tracking-wider text-primary">
              {word.reading}
            </Text>
          )}
          <Text numberOfLines={1} className="text-[22px] font-bold text-ink">
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
            color={word.starredAt ? colors.mustard.DEFAULT : colors.ink.muted}
          />
        </Pressable>
      </View>
      <Text numberOfLines={1} className="text-[12px] text-ink-soft">
        {meaningFor(word, settings.meaningLanguage)}
      </Text>
      {word.status === 'known' ? <View className="mt-1 h-1 w-8 rounded-full bg-matcha" /> : null}
    </Pressable>
  );
}
