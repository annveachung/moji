import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, Text, View } from 'react-native';

import { AppHeader } from '@/components/app-header';
import { FuriganaText } from '@/components/furigana-text';
import { EmptyState, IconButton, Pill, StampButton } from '@/components/ui';
import { getStarredGrammar, setGrammarStarred } from '@/db/grammar';
import { getStarredWords, setWordStarred } from '@/db/queries';
import type { GrammarRule, Word } from '@/db/types';
import { padRows, useLayout } from '@/lib/layout';
import { meaningFor } from '@/lib/meaning';
import { posLabel } from '@/lib/verb';
import { useSettings } from '@/state/settings';
import { useSync } from '@/state/sync';

type Section = 'words' | 'grammar';

/**
 * 復習: everything you ⭐ starred, in one place, so you can focus on reviewing it.
 * Two sections, 単語 (words) and 文法 (grammar), newest star first. Tap one to open it;
 * the ⭐ takes it off the list.
 */
export default function ReviewScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const { t } = useTranslation();
  const layout = useLayout();
  const { dataVersion } = useSync();
  const [section, setSection] = useState<Section>('words');
  const [words, setWords] = useState<Word[] | null>(null);
  const [grammar, setGrammar] = useState<GrammarRule[] | null>(null);

  const load = useCallback(async () => {
    setWords(await getStarredWords(db));
    setGrammar(await getStarredGrammar(db, 'recent'));
    // dataVersion: reload when stars change on your other devices.
  }, [db, dataVersion]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const unstarWord = async (word: Word) => {
    await setWordStarred(db, word.id, false);
    load();
  };
  const unstarRule = async (rule: GrammarRule) => {
    await setGrammarStarred(db, rule.id, false);
    load();
  };

  const items = section === 'words' ? words : grammar;
  const columns = layout.columns;

  return (
    <View className="flex-1 bg-surface">
      <AppHeader subtitle={t('nav.review')} />
      <FlatList<Word | GrammarRule | null>
        key={`${section}-${columns}`}
        numColumns={columns}
        columnWrapperClassName={columns > 1 ? 'gap-3' : undefined}
        data={padRows<Word | GrammarRule>(items ?? [], columns)}
        keyExtractor={(item, index) => (item ? `${section}-${item.id}` : `empty-${index}`)}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={layout.page('list')}
        contentContainerClassName="gap-3 pb-8"
        ListHeaderComponent={
          <View className="pb-1 pt-3">
            <SectionSwitch section={section} onChange={setSection} />
          </View>
        }
        ListEmptyComponent={
          items !== null ? (
            <View className="items-center gap-3">
              <EmptyState
                icon="star-border"
                message={section === 'words' ? t('review.wordsEmpty') : t('review.grammarEmpty')}
              />
              <StampButton
                label={section === 'words' ? t('review.goLibrary') : t('review.goGrammar')}
                tone="quiet"
                onPress={() => router.navigate(section === 'words' ? '/' : '/grammar')}
              />
            </View>
          ) : undefined
        }
        renderItem={({ item }) => (
          <View style={columns > 1 ? { flex: 1 } : undefined}>
            {item === null ? null : section === 'words' ? (
              <StarredWord word={item as Word} onUnstar={() => unstarWord(item as Word)} />
            ) : (
              <StarredRule rule={item as GrammarRule} onUnstar={() => unstarRule(item as GrammarRule)} />
            )}
          </View>
        )}
      />
    </View>
  );
}

/** 単語 | 文法 */
function SectionSwitch({ section, onChange }: { section: Section; onChange: (section: Section) => void }) {
  const { t } = useTranslation();
  const options: { value: Section; label: string }[] = [
    { value: 'words', label: t('review.tabWords') },
    { value: 'grammar', label: t('review.tabGrammar') },
  ];
  return (
    <View className="flex-row rounded-2xl bg-surface-high p-1">
      {options.map((option) => {
        const selected = section === option.value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            className={`flex-1 items-center rounded-xl py-2.5 ${selected ? 'bg-card shadow-sm shadow-ink/10' : ''}`}>
            <Text className={`text-[15px] ${selected ? 'font-bold text-ink' : 'font-semibold text-ink-muted'}`}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** A starred word: furigana, meaning, level and part of speech. */
function StarredWord({ word, onUnstar }: { word: Word; onUnstar: () => void }) {
  const router = useRouter();
  const { t } = useTranslation();
  const { settings } = useSettings();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${word.word} ${word.reading}`}
      onPress={() => router.push({ pathname: '/word/[id]', params: { id: String(word.id) } })}
      className="gap-2 rounded-card bg-card p-4 shadow-md shadow-ink/10 active:opacity-80">
      <View className="flex-row items-start justify-between gap-2">
        <View className="flex-1">
          <FuriganaText markup={word.furigana} size={26} showFurigana={settings.showFurigana} className="font-bold text-ink" />
        </View>
        <IconButton icon="star" tone="star" size={34} label={t('review.unstar')} onPress={onUnstar} />
      </View>
      <Text className="text-[15px] font-semibold leading-5 text-ink">{meaningFor(word, settings.meaningLanguage)}</Text>
      <View className="flex-row flex-wrap gap-1.5">
        {word.jlpt !== null ? <Pill label={`N${word.jlpt}`} tone="mustard" /> : null}
        <Pill label={posLabel(t, word)} tone="outline" />
      </View>
    </Pressable>
  );
}

/** A starred grammar rule: pattern, meaning and how it attaches (接続). */
function StarredRule({ rule, onUnstar }: { rule: GrammarRule; onUnstar: () => void }) {
  const router = useRouter();
  const { t } = useTranslation();
  const { settings } = useSettings();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={rule.pattern}
      onPress={() => router.push({ pathname: '/grammar/[id]', params: { id: String(rule.id) } })}
      className="gap-2 rounded-card bg-card p-4 shadow-md shadow-ink/10 active:opacity-80">
      <View className="flex-row items-start justify-between gap-2">
        <Text className="flex-1 text-[22px] font-bold leading-7 text-ink">{rule.pattern}</Text>
        {rule.jlpt !== null ? <Pill label={`N${rule.jlpt}`} tone="mustard" /> : null}
        <IconButton icon="star" tone="star" size={34} label={t('review.unstar')} onPress={onUnstar} />
      </View>
      <Text className="text-[15px] font-semibold leading-5 text-ink">{meaningFor(rule, settings.meaningLanguage)}</Text>
      {rule.formation ? (
        <View className="self-start rounded-lg bg-surface-low px-2.5 py-1">
          <Text className="text-[12px] text-ink-soft">{rule.formation}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}
