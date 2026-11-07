import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';

import type { JlptLevel, LibraryFilters, PartOfSpeech, ReviewFilter } from '@/db/types';
import { WORD_CATEGORIES } from '@/lib/categories';
import { VERB_GROUPS } from '@/lib/verb';

import { Mascot } from './mascot';
import { Chip } from './ui';

const STATUSES: ReviewFilter[] = ['all', 'starred'];
const POS: PartOfSpeech[] = ['noun', 'verb', 'i-adj', 'na-adj', 'adverb', 'expression'];
const JLPT: JlptLevel[] = [5, 4, 3, 2, 1];

/**
 * The filter tags for word lists (単語帳 and 復習 → 単語): level, part of speech, verb group
 * when 動詞 is picked, and category (what it's about).
 */
export function WordFilters({
  filters,
  onChange,
  showStatus = false,
  topicExtra,
}: {
  filters: LibraryFilters;
  onChange: (patch: Partial<LibraryFilters>) => void;
  /** 全部 / 復習 (the 単語帳 only; 復習 is all starred already). */
  showStatus?: boolean;
  /** Shown next to the topic filter, e.g. "sort その他 with AI". */
  topicExtra?: ReactNode;
}) {
  const { t } = useTranslation();

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
                icon={status === 'starred' ? <Mascot size={16} /> : undefined}
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

      {/* What it's about: the fixed categories, then その他 */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 px-0.5 py-1">
        {[...WORD_CATEGORIES, 'other' as const].map((category) => (
          <Chip
            key={category}
            label={t(`category.${category}`)}
            selected={filters.topic === category}
            onPress={() => onChange({ topic: filters.topic === category ? null : category })}
          />
        ))}
      </ScrollView>
      {filters.topic !== null && topicExtra ? <View className="flex-row flex-wrap items-center gap-2">{topicExtra}</View> : null}
    </>
  );
}
