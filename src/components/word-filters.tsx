import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, View } from 'react-native';

import type { JlptLevel, LibraryFilters, PartOfSpeech, ReviewFilter } from '@/db/types';
import { VERB_GROUPS } from '@/lib/verb';
import { useSync } from '@/state/sync';
import colors from '@/theme/colors';

import { Chip, Icon } from './ui';

const STATUSES: ReviewFilter[] = ['all', 'starred'];
const POS: PartOfSpeech[] = ['noun', 'verb', 'i-adj', 'na-adj', 'adverb', 'expression'];
const JLPT: JlptLevel[] = [5, 4, 3, 2, 1];

/**
 * The filter tags for word lists (単語帳 and 復習 → 単語): level, part of speech, verb group
 * when 動詞 is picked, and the topic you tapped on a card (shown so it can be cleared).
 */
export function WordFilters({
  filters,
  onChange,
  showStatus = false,
  topicExtra,
}: {
  filters: LibraryFilters;
  onChange: (patch: Partial<LibraryFilters>) => void;
  /** 全部 / ⭐ (the 単語帳 only; 復習 is all starred already). */
  showStatus?: boolean;
  /** Shown next to the topic filter, e.g. "sort その他 with AI". */
  topicExtra?: ReactNode;
}) {
  const { t } = useTranslation();
  const { topicLabel } = useSync();

  return (
    <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 px-0.5 py-1">
        {showStatus ? (
          <>
            {STATUSES.map((status) => (
              <Chip
                key={status}
                label={t(`library.status.${status}`)}
                selected={filters.status === status}
                onPress={() => onChange({ status })}
              />
            ))}
            <View className="mx-1 w-px bg-ink/15" />
          </>
        ) : null}
        {JLPT.map((level) => (
          <Chip
            key={level}
            label={`N${level}`}
            selected={filters.jlpt === level}
            onPress={() => onChange({ jlpt: filters.jlpt === level ? null : level })}
          />
        ))}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 px-0.5 py-1">
        {POS.map((pos) => (
          <Chip
            key={pos}
            label={t(`pos.${pos}`)}
            selected={filters.pos === pos}
            onPress={() => onChange({ pos: filters.pos === pos ? null : pos, verbGroup: null })}
          />
        ))}
      </ScrollView>
      {/* 動詞 picked: narrow to one verb group */}
      {filters.pos === 'verb' ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 px-0.5 py-1">
          {VERB_GROUPS.map((group) => (
            <Chip
              key={group}
              label={t(`verbGroup.${group}`)}
              selected={filters.verbGroup === group}
              onPress={() => onChange({ verbGroup: filters.verbGroup === group ? null : group })}
            />
          ))}
        </ScrollView>
      ) : null}

      {/* Topic filters come from tapping a topic tag on a card; show it so it can be cleared. */}
      {filters.topic !== null ? (
        <View className="flex-row flex-wrap items-center gap-2">
          <Pressable
            accessibilityRole="button"
            onPress={() => onChange({ topic: null })}
            className="flex-row items-center gap-1.5 self-start rounded-full bg-primary-soft px-3 py-1.5">
            <Icon name="filter-alt" size={14} color={colors.primary.DEFAULT} />
            <Text className="font-display-semibold text-[12px] text-primary">
              {topicLabel(filters.topic === 'other' ? null : filters.topic)}
            </Text>
            <Icon name="close" size={14} color={colors.primary.DEFAULT} />
          </Pressable>
          {topicExtra}
        </View>
      ) : null}
    </>
  );
}
