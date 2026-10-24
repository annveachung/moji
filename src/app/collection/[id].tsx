import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/app-header';
import { EmptyState, Icon, IconButton } from '@/components/ui';
import { WordRow } from '@/components/word-row';
import { getCollectionWords, setWordSaved } from '@/db/queries';
import type { Word } from '@/db/types';
import { findCollection } from '@/lib/collections';
import colors from '@/theme/colors';

/** All catalog words in one collection or topic, easiest first, with one-tap save. */
export default function CollectionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const collection = findCollection(id);
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [words, setWords] = useState<Word[] | null>(null);

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
        <AppHeader subtitle={t('nav.explore')} back />
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
      <AppHeader subtitle={title} back />
      <FlatList
        data={words ?? []}
        keyExtractor={(word) => String(word.id)}
        contentContainerClassName="w-full max-w-[720px] self-center gap-2 px-4"
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
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
