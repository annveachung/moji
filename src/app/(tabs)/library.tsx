import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, ScrollView, Text, TextInput, View } from 'react-native';

import { AppHeader } from '@/components/app-header';
import { Chip, EmptyState, Icon, IconButton } from '@/components/ui';
import { WordRow } from '@/components/word-row';
import { getLibrary, setWordStarred } from '@/db/queries';
import type { JlptLevel, LibraryFilters, PartOfSpeech, ReviewFilter, Word } from '@/db/types';
import colors from '@/theme/colors';

const STATUSES: ReviewFilter[] = ['all', 'starred', 'weak'];
const POS: PartOfSpeech[] = ['noun', 'verb', 'i-adj', 'na-adj', 'adverb', 'expression'];
const JLPT: JlptLevel[] = [5, 4, 3, 2, 1];

/** 単語帳: every word you've saved, searchable and filterable. */
export default function LibraryScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const { t } = useTranslation();
  const [filters, setFilters] = useState<LibraryFilters>({ search: '', pos: null, jlpt: null, status: 'all' });
  const [words, setWords] = useState<Word[] | null>(null);

  const load = useCallback(() => {
    getLibrary(db, filters).then(setWords);
  }, [db, filters]);

  // Reload when the screen comes back into view (e.g. after adding a word) or filters change.
  useFocusEffect(load);

  const update = (patch: Partial<LibraryFilters>) => setFilters((current) => ({ ...current, ...patch }));
  const filtering = filters.search.trim() !== '' || filters.pos || filters.jlpt || filters.status !== 'all';

  const toggleStar = async (word: Word) => {
    await setWordStarred(db, word.id, word.starredAt === null);
    load();
  };

  const addButton = (
    <IconButton icon="add" tone="sumi" size={36} label={t('library.add')} onPress={() => router.push('/word-form')} />
  );

  return (
    <View className="flex-1 bg-cream">
      <AppHeader subtitle={t('nav.library')} right={addButton} />
      <FlatList
        data={words ?? []}
        keyExtractor={(word) => String(word.id)}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerClassName="w-full max-w-[720px] self-center gap-2 px-4 pb-8"
        ListHeaderComponent={
          <View className="gap-3 pb-1 pt-4">
            <View className="flex-row items-center gap-2 rounded-2xl border border-sumi/15 bg-cream-light px-3">
              <Icon name="search" size={20} color={colors.sumi.muted} />
              <TextInput
                value={filters.search}
                onChangeText={(search) => update({ search })}
                placeholder={t('library.searchPlaceholder')}
                placeholderTextColor={colors.sumi.muted}
                autoCorrect={false}
                clearButtonMode="while-editing"
                returnKeyType="search"
                className="h-11 flex-1 text-[15px] text-sumi"
              />
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
              {STATUSES.map((status) => (
                <Chip
                  key={status}
                  label={t(`library.status.${status}`)}
                  selected={filters.status === status}
                  onPress={() => update({ status })}
                />
              ))}
              <View className="mx-1 w-px bg-sumi/15" />
              {JLPT.map((level) => (
                <Chip
                  key={level}
                  label={`N${level}`}
                  selected={filters.jlpt === level}
                  onPress={() => update({ jlpt: filters.jlpt === level ? null : level })}
                />
              ))}
            </ScrollView>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
              {POS.map((pos) => (
                <Chip
                  key={pos}
                  label={t(`pos.${pos}`)}
                  selected={filters.pos === pos}
                  onPress={() => update({ pos: filters.pos === pos ? null : pos })}
                />
              ))}
            </ScrollView>

            {words && words.length > 0 && (
              <Text className="px-1 text-[12px] text-sumi-muted">
                {t('library.count', { count: words.length })}
              </Text>
            )}
          </View>
        }
        ListEmptyComponent={
          words ? (
            <EmptyState
              icon={filtering ? 'search-off' : 'auto-stories'}
              message={filtering ? t('library.noResults') : t('library.empty')}
            />
          ) : undefined
        }
        renderItem={({ item }) => (
          <WordRow
            word={item}
            right={
              <IconButton
                icon={item.starredAt ? 'star' : 'star-border'}
                tone={item.starredAt ? 'amber' : 'cream'}
                size={36}
                label={item.starredAt ? t('word.starred') : t('word.star')}
                onPress={() => toggleStar(item)}
              />
            }
          />
        )}
      />
    </View>
  );
}
