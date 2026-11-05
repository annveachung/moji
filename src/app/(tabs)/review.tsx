import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, ScrollView, Text, View } from 'react-native';

import { AppHeader } from '@/components/app-header';
import { LibraryCard } from '@/components/library-card';
import { StarButton } from '@/components/mascot';
import { Chip, EmptyState, IconButton, Pill, StampButton } from '@/components/ui';
import { WordFilters } from '@/components/word-filters';
import { getStarredGrammar, setGrammarStarred } from '@/db/grammar';
import { getLibrary, setWordStarred } from '@/db/queries';
import type { GrammarRule, JlptLevel, LibraryFilters, LibraryWord } from '@/db/types';
import { GRAMMAR_FUNCTIONS, type GrammarFunction } from '@/lib/categories';
import { padRows, useLayout } from '@/lib/layout';
import { meaningFor } from '@/lib/meaning';
import { useSettings } from '@/state/settings';
import { useSync } from '@/state/sync';

type Section = 'words' | 'grammar';

const LEVELS: JlptLevel[] = [5, 4, 3, 2, 1];
const STARRED: LibraryFilters = { search: '', pos: null, verbGroup: null, jlpt: null, topic: null, status: 'starred' };

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
  const [words, setWords] = useState<LibraryWord[] | null>(null);
  const [grammar, setGrammar] = useState<GrammarRule[] | null>(null);
  // The same filter tags as 単語帳 (level, part of speech, verb group, topic), on your ⭐ words.
  const [filters, setFilters] = useState<LibraryFilters>(STARRED);
  const updateFilters = (patch: Partial<LibraryFilters>) => setFilters((current) => ({ ...current, ...patch }));
  const filtering = filters.pos !== null || filters.jlpt !== null || filters.topic !== null;
  // 文法 has one tag, its JLPT level (the same chips as the 文法 tab).
  const [grammarLevel, setGrammarLevel] = useState<JlptLevel | null>(null);
  const pickLevel = (level: JlptLevel | null) => setGrammarLevel(grammarLevel === level ? null : level);
  const [grammarFn, setGrammarFn] = useState<GrammarFunction | 'other' | null>(null);
  const pickFn = (fn: GrammarFunction | 'other') => setGrammarFn(grammarFn === fn ? null : fn);

  const load = useCallback(async () => {
    setWords(await getLibrary(db, filters));
    setGrammar(await getStarredGrammar(db, 'recent'));
    // dataVersion: reload when stars change on your other devices.
  }, [db, filters, dataVersion]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const unstarWord = async (word: LibraryWord) => {
    await setWordStarred(db, word.id, false);
    load();
  };
  const unstarRule = async (rule: GrammarRule) => {
    await setGrammarStarred(db, rule.id, false);
    load();
  };

  const shownGrammar =
    grammar?.filter(
      (rule) =>
        (grammarLevel === null || rule.jlpt === grammarLevel) &&
        (grammarFn === null || (rule.category ?? 'other') === grammarFn),
    ) ?? null;
  const items = section === 'words' ? words : shownGrammar;
  const columns = layout.columns;

  return (
    <View className="flex-1 bg-surface">
      <AppHeader subtitle={t('nav.review')} />
      <FlatList<LibraryWord | GrammarRule | null>
        key={`${section}-${columns}`}
        numColumns={columns}
        columnWrapperClassName={columns > 1 ? 'gap-3' : undefined}
        data={padRows<LibraryWord | GrammarRule>(items ?? [], columns)}
        keyExtractor={(item, index) => (item ? `${section}-${item.id}` : `empty-${index}`)}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={layout.page('list')}
        contentContainerClassName="gap-3 pb-8"
        ListHeaderComponent={
          <View className="gap-3 pb-1 pt-3">
            <SectionSwitch section={section} onChange={setSection} />
            {section === 'words' ? (
              <WordFilters filters={filters} onChange={updateFilters} />
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 px-0.5 py-1">
                <Chip label={t('grammar.all')} selected={grammarLevel === null} onPress={() => setGrammarLevel(null)} />
                {LEVELS.map((level) => (
                  <Chip key={level} label={`N${level}`} selected={grammarLevel === level} onPress={() => pickLevel(level)} />
                ))}
              </ScrollView>
            )}
            {section === 'grammar' ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 px-0.5 py-1">
                {[...GRAMMAR_FUNCTIONS, 'other' as const].map((fn) => (
                  <Chip key={fn} label={t(`grammarFn.${fn}`)} selected={grammarFn === fn} onPress={() => pickFn(fn)} />
                ))}
              </ScrollView>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          items !== null ? (
            <View className="items-center gap-3">
              {(section === 'words' && filtering) || (section === 'grammar' && (grammarLevel !== null || grammarFn !== null)) ? (
                <EmptyState message={t('library.noResults')} />
              ) : (
                <>
                  <EmptyState
                    message={section === 'words' ? t('review.wordsEmpty') : t('review.grammarEmpty')}
                  />
                  <StampButton
                    label={section === 'words' ? t('review.goLibrary') : t('review.goGrammar')}
                    tone="quiet"
                    onPress={() => router.navigate(section === 'words' ? '/' : '/grammar')}
                  />
                </>
              )}
            </View>
          ) : undefined
        }
        renderItem={({ item }) => (
          <View style={columns > 1 ? { flex: 1 } : undefined}>
            {item === null ? null : section === 'words' ? (
              <LibraryCard
                word={item as LibraryWord}
                onToggleStar={() => unstarWord(item as LibraryWord)}
                filters={filters}
                onFilter={updateFilters}
              />
            ) : (
              <StarredRule
                rule={item as GrammarRule}
                onUnstar={() => unstarRule(item as GrammarRule)}
                activeLevel={grammarLevel}
                onLevel={pickLevel}
                activeFn={grammarFn}
                onFn={pickFn}
              />
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

/** A starred grammar rule: pattern, meaning and how it attaches (接続). */
function StarredRule({
  rule,
  onUnstar,
  activeLevel,
  onLevel,
  activeFn,
  onFn,
}: {
  rule: GrammarRule;
  onUnstar: () => void;
  activeLevel: JlptLevel | null;
  /** Tap the level tag to show only that level (tap again to clear). */
  onLevel: (level: JlptLevel) => void;
  activeFn: GrammarFunction | 'other' | null;
  /** Tap the function tag to show only that kind of pattern. */
  onFn: (fn: GrammarFunction | 'other') => void;
}) {
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
        {rule.jlpt !== null ? (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: activeLevel === rule.jlpt }}
            hitSlop={4}
            onPress={() => onLevel(rule.jlpt!)}>
            <Pill
              label={`JLPT N${rule.jlpt}`}
              tone={activeLevel === rule.jlpt ? 'primary' : 'mustard'}
              icon={activeLevel === rule.jlpt ? 'filter-alt' : undefined}
            />
          </Pressable>
        ) : null}
        <StarButton starred size={34} label={t('review.unstar')} onPress={onUnstar} />
      </View>
      <Text className="text-[15px] font-semibold leading-5 text-ink">{meaningFor(rule, settings.meaningLanguage)}</Text>
      <View className="flex-row flex-wrap items-center gap-1.5">
        {rule.category ? (
          <Pressable accessibilityRole="button" hitSlop={4} onPress={() => onFn(rule.category!)}>
            <Pill
              label={t(`grammarFn.${rule.category}`)}
              tone={activeFn === rule.category ? 'primary' : 'outline'}
              icon={activeFn === rule.category ? 'filter-alt' : undefined}
            />
          </Pressable>
        ) : null}
        {rule.formation ? (
          <View className="rounded-lg bg-surface-low px-2.5 py-1">
            <Text className="text-[12px] text-ink-soft">{rule.formation}</Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}
