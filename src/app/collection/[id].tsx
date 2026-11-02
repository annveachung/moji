import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, SectionList, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/app-header';
import { EmptyState, Icon, IconButton } from '@/components/ui';
import { WordRow } from '@/components/word-row';
import { getCollectionWords, setWordSaved } from '@/db/queries';
import type { Word } from '@/db/types';
import { CATEGORY_ICON, isWordCategory, WORD_CATEGORIES } from '@/lib/categories';
import { findCollection } from '@/lib/collections';
import { useLayout } from '@/lib/layout';
import colors from '@/theme/colors';

type Group = { category: (typeof WORD_CATEGORIES)[number] | 'other'; words: Word[]; saved: number };

/** Words grouped by category, in the fixed order (その他 last); empty groups are left out. */
function groupByCategory(words: Word[]): Group[] {
  const order = [...WORD_CATEGORIES, 'other' as const];
  return order
    .map((category) => {
      const inGroup = words.filter((w) => (isWordCategory(w.topic) ? w.topic : 'other') === category);
      return { category, words: inGroup, saved: inGroup.filter((w) => w.savedAt !== null).length };
    })
    .filter((group) => group.words.length > 0);
}

/**
 * One level (or collection): its words grouped by category, each group with saved/total and a
 * preview; tap a group to open it. One tap saves a word.
 */
export default function CollectionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const collection = findCollection(id);
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const layout = useLayout();
  const [words, setWords] = useState<Word[] | null>(null);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const toggleGroup = (category: string) =>
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });

  const load = useCallback(() => {
    if (collection) getCollectionWords(db, collection.filter).then(setWords);
    // collection is derived from the id, so the id is the real dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, id]);

  useFocusEffect(load);

  const toggleSaved = async (word: Word) => {
    await setWordSaved(db, word.id, word.savedAt === null);
    load();
  };

  if (!collection) {
    return (
      <View className="flex-1 bg-surface">
        <AppHeader subtitle={t('nav.explore')} back kind="reading" />
        <View className="p-4">
          <EmptyState icon="search-off" message={t('explore.empty')} />
        </View>
      </View>
    );
  }

  const title = t(collection.titleKey);
  const body = t(`${collection.titleKey}Body`, { defaultValue: '' });
  const saved = words?.filter((w) => w.savedAt !== null).length ?? 0;

  return (
    <View className="flex-1 bg-surface">
      <AppHeader subtitle={title} back kind="reading" />
      <SectionList
        sections={groupByCategory(words ?? []).map((group) => ({
          ...group,
          // Closed groups show only their header (with a preview of the words).
          data: open.has(group.category) ? group.words : [],
        }))}
        keyExtractor={(word) => String(word.id)}
        stickySectionHeadersEnabled={false}
        contentContainerClassName="gap-2"
        contentContainerStyle={{ ...layout.page('reading'), paddingBottom: insets.bottom + 24 }}
        ListHeaderComponent={
          <View className="mb-2 gap-2 pt-3">
            <View className="flex-row items-center gap-3">
              <View className="h-11 w-11 items-center justify-center rounded-full bg-primary-soft">
                <Icon name={collection.icon} size={22} color={colors.primary.DEFAULT} />
              </View>
              <View className="flex-1">
                <Text className="font-display text-[20px] text-ink">{title}</Text>
                {words !== null ? (
                  <Text className="font-display-medium text-[12px] text-ink-muted">
                    {t('explore.progress', { saved, total: words.length })}
                  </Text>
                ) : null}
              </View>
            </View>
            {body ? <Text className="text-[13px] leading-5 text-ink-soft">{body}</Text> : null}
          </View>
        }
        ListEmptyComponent={words !== null ? <EmptyState icon="inbox" message={t('explore.empty')} /> : undefined}
        renderSectionHeader={({ section }) => {
          const expanded = open.has(section.category);
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded }}
              onPress={() => toggleGroup(section.category)}
              className="mt-1 gap-1.5 rounded-2xl bg-card p-3.5 shadow-sm shadow-ink/10 active:opacity-80">
              <View className="flex-row items-center gap-2.5">
                <Icon name={CATEGORY_ICON[section.category]} size={20} color={colors.primary.DEFAULT} />
                <Text className="flex-1 text-[15px] font-bold text-ink">{t(`category.${section.category}`)}</Text>
                <Text className="font-display-medium text-[12px] text-ink-muted">
                  {section.saved} / {section.words.length}
                </Text>
                <Icon name={expanded ? 'expand-less' : 'expand-more'} size={20} color={colors.ink.muted} />
              </View>
              <View className="h-1 overflow-hidden rounded-full bg-surface-high">
                <View
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${Math.round((section.saved / section.words.length) * 100)}%` }}
                />
              </View>
              {!expanded ? (
                <Text numberOfLines={1} className="text-[13px] text-ink-soft">
                  {section.words.slice(0, 6).map((w) => w.word).join('　')}
                  {section.words.length > 6 ? ' …' : ''}
                </Text>
              ) : null}
            </Pressable>
          );
        }}
        renderItem={({ item }) => (
          <WordRow
            word={item}
            right={
              <IconButton
                icon={item.savedAt ? 'check' : 'add'}
                tone={item.savedAt ? 'soft' : 'primary'}
                size={36}
                label={item.savedAt ? t('explore.saved') : t('explore.save')}
                onPress={() => toggleSaved(item)}
              />
            }
          />
        )}
      />
    </View>
  );
}
