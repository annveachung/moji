import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, ScrollView, Text, View } from 'react-native';

import { AppHeader } from '@/components/app-header';
import { Chip, IconButton } from '@/components/ui';
import { WordRow } from '@/components/word-row';
import { getCatalog, setWordSaved } from '@/db/queries';
import type { Topic, Word } from '@/db/types';

const TOPICS: Topic[] = ['daily-life', 'travel', 'relationships', 'work-tech', 'anime-games'];

/** 発見: the starter catalog by topic. One tap saves a word to your library. */
export default function ExploreScreen() {
  const db = useSQLiteContext();
  const { t } = useTranslation();
  const [topic, setTopic] = useState<Topic | null>(null);
  const [words, setWords] = useState<Word[]>([]);

  const load = useCallback(() => {
    getCatalog(db, topic).then(setWords);
  }, [db, topic]);

  useFocusEffect(load);

  const toggleSaved = async (word: Word) => {
    await setWordSaved(db, word.id, word.savedAt === null);
    load();
  };

  return (
    <View className="flex-1 bg-cream">
      <AppHeader subtitle={t('nav.explore')} />
      <FlatList
        data={words}
        keyExtractor={(word) => String(word.id)}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerClassName="w-full max-w-[720px] self-center gap-2 px-4 pb-8"
        ListHeaderComponent={
          <View className="gap-3 pb-1 pt-4">
            <Text className="px-1 text-[13px] leading-5 text-sumi-light">{t('explore.intro')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
              <Chip label={t('explore.all')} selected={topic === null} onPress={() => setTopic(null)} />
              {TOPICS.map((item) => (
                <Chip key={item} label={t(`topic.${item}`)} selected={topic === item} onPress={() => setTopic(item)} />
              ))}
            </ScrollView>
          </View>
        }
        renderItem={({ item }) => (
          <WordRow
            word={item}
            right={
              <IconButton
                icon={item.savedAt ? 'check' : 'add'}
                tone={item.savedAt ? 'sumi' : 'amber'}
                size={36}
                label={item.savedAt ? t('explore.saved') : t('explore.save')}
                onPress={() => toggleSaved(item)}
              />
            }
          />
        )}
        ListFooterComponent={<View className="h-2" />}
      />
    </View>
  );
}
