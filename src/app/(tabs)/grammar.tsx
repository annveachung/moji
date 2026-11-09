import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { AppHeader } from '@/components/app-header';
import { DailyReading } from '@/components/daily-reading';
import { ImportSheet, type ImportReview } from '@/components/import-sheet';
import { TagPill } from '@/components/library-card';
import { Mascot, StarButton } from '@/components/mascot';
import { Card, Chip, ClearFilters, EmptyState, Icon, IconButton, LabelButton, SectionHeader, TagRow, ViewToggle, type IconName } from '@/components/ui';
import {
  applyGrammarImport,
  deleteGrammarSentence,
  getGrammarRules,
  planGrammarImport,
  saveGrammarSentence,
  setGrammarStarred,
  type GrammarImportPlan,
} from '@/db/grammar';
import type { GrammarRule, JlptLevel } from '@/db/types';
import { generateGrammarSentence } from '@/lib/ai';
import { aiErrorMessage } from '@/lib/ai-errors';
import { showAlert } from '@/lib/alert';
import { GRAMMAR_FUNCTIONS, type GrammarFunction } from '@/lib/categories';
import { pickCsvText } from '@/lib/file-io';
import { useSortGrammar } from '@/lib/use-sort-grammar';
import { padRows, useLayout } from '@/lib/layout';
import { csvToGrammar, type GrammarCsvProblem } from '@/lib/grammar-csv';
import { highlightPattern } from '@/lib/grammar-highlight';
import { meaningFor, translationFor } from '@/lib/meaning';
import { speakJapanese } from '@/lib/speech';
import { useSettings } from '@/state/settings';
import { useSync } from '@/state/sync';
import colors from '@/theme/colors';

const LEVELS: JlptLevel[] = [5, 4, 3, 2, 1];

type Importing = { plan: GrammarImportPlan; problems: GrammarCsvProblem[]; unknownColumns: string[] };

/**
 * 文法: grammar N5 → N1, from moji's shared list and your own spreadsheet. At the top, a daily
 * reading (easy NHK news + a short AI reading). Cards come as a list (with one example each)
 * or a compact grid.
 */
export default function GrammarScreen() {
  const db = useSQLiteContext();
  const { t } = useTranslation();
  const { settings } = useSettings();
  const [search, setSearch] = useState('');
  const [level, setLevel] = useState<JlptLevel | null>(null);
  // What the pattern does (条件, 理由…); 'other' = not sorted.
  const [fn, setFn] = useState<GrammarFunction | 'other' | null>(null);
  const [rules, setRules] = useState<GrammarRule[] | null>(null);
  const [importing, setImporting] = useState<Importing | null>(null);
  const [view, setView] = useState<'list' | 'grid'>('list');
  /** The rule whose example the AI is writing right now. */
  const [regenerating, setRegenerating] = useState<number | null>(null);

  const { dataVersion } = useSync();
  const layout = useLayout();

  const load = useCallback(() => {
    getGrammarRules(db, { search, jlpt: level, category: fn }).then(setRules);
  }, [db, search, level, fn, dataVersion]);

  useFocusEffect(load);
  const { sorting, sort, sortQuietly } = useSortGrammar(load);

  // Rules imported before categories (or while offline) get sorted when you open 文法.
  useEffect(() => {
    sortQuietly();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtering = search.trim() !== '' || level !== null || fn !== null;
  const pickFn = (value: GrammarFunction | 'other') => setFn(fn === value ? null : value);

  const toggleStar = async (rule: GrammarRule) => {
    await setGrammarStarred(db, rule.id, rule.starredAt === null);
    load();
  };

  /** A new example from the AI takes the place of the one on the card. */
  const regenerate = async (rule: GrammarRule) => {
    setRegenerating(rule.id);
    try {
      const fresh = await generateGrammarSentence({
        pattern: rule.pattern,
        meaning: rule.meaningEn,
        formation: rule.formation,
        jlpt: rule.jlpt,
        avoid: rule.example ? [rule.example.ja] : [],
      });
      await saveGrammarSentence(db, rule.id, fresh, 'ai');
      if (rule.example) await deleteGrammarSentence(db, rule.example.id);
      load();
    } catch (error) {
      showAlert(t('grammar.examples'), aiErrorMessage(t, error));
    } finally {
      setRegenerating(null);
    }
  };

  const removeExample = async (rule: GrammarRule) => {
    if (!rule.example) return;
    await deleteGrammarSentence(db, rule.example.id);
    load();
  };

  // Cards per row: list view 1 → 3 as the window widens; the compact grid view one more.
  const columns = view === 'grid' ? layout.columns + 1 : layout.columns;

  /** Pick a CSV, read it, and open the review sheet. Nothing is saved until you confirm. */
  const importCsv = async () => {
    try {
      const text = await pickCsvText();
      if (text === null) return;
      const { rules: rows, problems, unknownColumns } = csvToGrammar(text);
      setImporting({ plan: await planGrammarImport(db, rows), problems, unknownColumns });
    } catch {
      showAlert(t('grammar.importTitle'), t('importing.error'));
    }
  };

  const confirmImport = async (mergeIds: Set<number>) => {
    if (!importing) return;
    const result = await applyGrammarImport(db, importing.plan, mergeIds);
    setImporting(null);
    load();
    showAlert(t('importing.doneTitle'), t('grammar.doneBody', result));
    // New rules get their function from the AI in the background.
    sortQuietly();
  };

  const toReview = ({ plan, problems, unknownColumns }: Importing): ImportReview => ({
    title: t('grammar.importTitle'),
    fresh: plan.fresh.map((row) => ({
      key: String(row.line),
      title: row.pattern,
      subtitle: row.jlpt ? `N${row.jlpt}` : '',
    })),
    freshTitle: t('grammar.newRules', { count: plan.fresh.length }),
    duplicates: plan.duplicates.map(({ csv, existing }) => ({
      id: existing.id,
      title: existing.pattern,
      subtitle: existing.jlpt ? `N${existing.jlpt}` : '',
      current: meaningFor(existing, settings.meaningLanguage),
      incoming: meaningFor(csv, settings.meaningLanguage),
    })),
    duplicatesTitle: t('grammar.duplicates', { count: plan.duplicates.length }),
    duplicatesHint: t('grammar.duplicatesHint'),
    problems: problems.map((p) => ({ line: p.line, reason: t('grammar.missingPattern') })),
    problemsTitle: t('importing.problems', { count: problems.length }),
    notes: [
      ...(plan.repeated > 0 ? [t('grammar.repeated', { count: plan.repeated })] : []),
      ...(unknownColumns.length > 0 ? [t('grammar.unknownColumns', { columns: unknownColumns.join(', ') })] : []),
      t('grammar.formatHint'),
    ],
  });

  const header = (
    <View className="gap-3 pb-1 pt-3">
      <DailyReading />

      <View className="flex-row items-center gap-2 rounded-2xl bg-card px-3.5 shadow-sm shadow-ink/10">
        <Icon name="search" size={20} color={colors.ink.muted} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder={t('grammar.searchPlaceholder')}
          placeholderTextColor={colors.ink.muted}
          autoCorrect={false}
          clearButtonMode="while-editing"
          returnKeyType="search"
          className="h-12 flex-1 text-[15px] text-ink"
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 px-0.5 py-1">
        <Chip label={t('grammar.all')} selected={level === null} onPress={() => setLevel(null)} />
        {LEVELS.map((n) => (
          <Chip key={n} label={`N${n}`} selected={level === n} onPress={() => setLevel(level === n ? null : n)} />
        ))}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 px-0.5 py-1">
        {[...GRAMMAR_FUNCTIONS, 'other' as const].map((value) => (
          <Chip key={value} label={t(`grammarFn.${value}`)} selected={fn === value} onPress={() => pickFn(value)} />
        ))}
      </ScrollView>
      {fn === 'other' && rules !== null && rules.length > 0 ? (
        <Pressable
          accessibilityRole="button"
          disabled={sorting}
          onPress={sort}
          className={`flex-row items-center gap-1.5 self-start rounded-full bg-card px-3 py-1.5 shadow-sm shadow-ink/10 ${sorting ? 'opacity-50' : ''}`}>
          <Icon name="auto-awesome" size={14} color={colors.primary.DEFAULT} />
          <Text className="font-display-semibold text-[12px] text-ink">
            {sorting ? t('categoryUi.sortingGrammar') : t('categoryUi.sortGrammar')}
          </Text>
        </Pressable>
      ) : null}

      {filtering ? (
        <ClearFilters
          label={t('common.clearFilters')}
          onPress={() => {
            setSearch('');
            setLevel(null);
            setFn(null);
          }}
        />
      ) : null}

      {rules !== null && rules.length > 0 ? (
        <View className="flex-row items-center justify-between px-1">
          <Text className="font-display-semibold text-[12px] text-ink-soft">{t('grammar.count', { count: rules.length })}</Text>
          <View className="flex-row rounded-xl bg-surface-high p-0.5">
            <ViewToggle icon="view-agenda" label={t('library.listView')} selected={view === 'list'} onPress={() => setView('list')} />
            <ViewToggle icon="grid-view" label={t('library.gridView')} selected={view === 'grid'} onPress={() => setView('grid')} />
          </View>
        </View>
      ) : null}
    </View>
  );

  return (
    <View className="flex-1 bg-surface">
      <AppHeader
        subtitle={t('nav.grammar')}
        right={
          <LabelButton icon="upload-file" label={t('common.import')} accessibilityLabel={t('grammar.importCsv')} onPress={importCsv} />
        }
      />
      {importing !== null ? (
        <ImportSheet review={toReview(importing)} onCancel={() => setImporting(null)} onConfirm={confirmImport} />
      ) : null}
      <FlatList
        key={`${view}-${columns}`}
        numColumns={columns}
        columnWrapperClassName={columns > 1 ? 'gap-3' : undefined}
        data={padRows(rules ?? [], columns)}
        keyExtractor={(rule, index) => (rule ? String(rule.id) : `empty-${index}`)}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={layout.page('list')}
        contentContainerClassName="gap-3 pb-8"
        ListHeaderComponent={header}
        ListEmptyComponent={
          rules !== null ? (
            <EmptyState
              message={filtering ? t('grammar.noResults') : t('grammar.empty')}
            />
          ) : undefined
        }
        renderItem={({ item }) => (
          <View style={columns > 1 ? { flex: 1 } : undefined}>
            {item === null ? null : view === 'grid' ? (
              <GrammarTile rule={item} onToggleStar={() => toggleStar(item)} />
            ) : (
              <GrammarCard
                rule={item}
                onToggleStar={() => toggleStar(item)}
                activeFn={fn}
                onFn={pickFn}
                activeLevel={level}
                onLevel={(value) => setLevel(level === value ? null : value)}
                regenerating={regenerating === item.id}
                onRegenerate={() => regenerate(item)}
                onRemoveExample={() => removeExample(item)}
              />
            )}
          </View>
        )}
      />
    </View>
  );
}

/** Read a pattern aloud without its 〜 and alternatives: ちゃいけない・じゃいけない → ちゃいけない. */
const spokenPattern = (pattern: string) => pattern.replace(/[〜～~]/g, '').split(/[・／/]/)[0]!.trim();

/**
 * One rule in the list view, laid out like a word card: tags and ⭐ on top, the pattern with 🔊,
 * then the meaning and one example (with ↻ and ✕). Every part has a fixed number of lines, so
 * all cards are the same size.
 */
function GrammarCard({
  rule,
  onToggleStar,
  activeFn,
  onFn,
  activeLevel,
  onLevel,
  regenerating,
  onRegenerate,
  onRemoveExample,
}: {
  rule: GrammarRule;
  onToggleStar: () => void;
  activeFn: GrammarFunction | 'other' | null;
  /** Tap the function tag to show only that kind of pattern. */
  onFn: (fn: GrammarFunction | 'other') => void;
  activeLevel: JlptLevel | null;
  /** Tap the level tag to show only that level. */
  onLevel: (level: JlptLevel) => void;
  regenerating: boolean;
  onRegenerate: () => void;
  onRemoveExample: () => void;
}) {
  const router = useRouter();
  const { t } = useTranslation();
  const { settings } = useSettings();
  const example = rule.example;
  const fn = rule.category ?? 'other';

  return (
    // A link, not a button: on the web a button can't hold the card's own buttons.
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={rule.pattern}
      onPress={() => router.push({ pathname: '/grammar/[id]', params: { id: String(rule.id) } })}
      className="gap-3 rounded-card bg-card p-4 shadow-md shadow-ink/10 active:opacity-80">
      <View className="flex-row items-center justify-between gap-2">
        <TagRow>
          {rule.jlpt !== null ? (
            <TagPill label={`N${rule.jlpt}`} tone="mustard" active={activeLevel === rule.jlpt} onPress={() => onLevel(rule.jlpt!)} />
          ) : null}
          <TagPill label={t(`grammarFn.${fn}`)} tone="outline" active={activeFn === fn} onPress={() => onFn(fn)} />
        </TagRow>
        <StarButton
          starred={Boolean(rule.starredAt)}
          size={32}
          label={rule.starredAt ? t('grammar.unstar') : t('grammar.star')}
          onPress={onToggleStar}
        />
      </View>

      <View className="flex-row items-center justify-between gap-3">
        <Text numberOfLines={1} adjustsFontSizeToFit className="flex-1 text-[28px] font-bold leading-9 text-ink">
          {rule.pattern}
        </Text>
        <IconButton icon="volume-up" tone="quiet" label={t('word.listen')} onPress={() => speakJapanese(spokenPattern(rule.pattern))} />
      </View>

      <View className="gap-2 rounded-xl bg-surface-low p-3">
        <Text numberOfLines={1} className="text-[15px] font-semibold leading-5 text-ink">
          {meaningFor(rule, settings.meaningLanguage)}
        </Text>
        <View className="flex-row items-center gap-1 rounded-lg bg-card/80 py-2 pl-2.5 pr-1">
          <View className="flex-1 gap-0.5">
            <Text numberOfLines={1} className="text-[14px] leading-5 text-ink">
              {example
                ? highlightPattern(example.ja, rule.pattern).map((part, i) => (
                    <Text key={i} className={part.match ? 'font-bold text-primary' : undefined}>
                      {part.text}
                    </Text>
                  ))
                : t('grammar.noExample')}
            </Text>
            <Text numberOfLines={1} className="text-[12px] leading-4 text-ink-soft">
              {example ? translationFor(example, settings.meaningLanguage) : ' '}
            </Text>
          </View>
          {example ? (
            <IconButton icon="volume-up" tone="quiet" size={28} label={t('word.listen')} onPress={() => speakJapanese(example.ja)} />
          ) : null}
          <IconButton
            icon={regenerating ? 'hourglass-empty' : 'refresh'}
            tone="quiet"
            size={28}
            label={t('word.regenerate')}
            disabled={regenerating}
            onPress={onRegenerate}
          />
          {example ? (
            <IconButton icon="close" tone="quiet" size={28} label={t('word.removeExample')} onPress={onRemoveExample} />
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

/** One rule in the compact grid, like a word tile: the pattern with ⭐, and its meaning. */
function GrammarTile({ rule, onToggleStar }: { rule: GrammarRule; onToggleStar: () => void }) {
  const router = useRouter();
  const { t } = useTranslation();
  const { settings } = useSettings();
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={rule.pattern}
      onPress={() => router.push({ pathname: '/grammar/[id]', params: { id: String(rule.id) } })}
      className="flex-1 gap-1 rounded-2xl bg-card p-3 shadow-md shadow-ink/10 active:opacity-80">
      <View className="flex-row items-start justify-between">
        <Text numberOfLines={1} adjustsFontSizeToFit className="flex-1 text-[22px] font-bold leading-[30px] text-ink">
          {rule.pattern}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={rule.starredAt ? t('grammar.unstar') : t('grammar.star')}
          hitSlop={10}
          onPress={onToggleStar}>
          <Mascot size={20} tone={rule.starredAt ? 'color' : 'faded'} />
        </Pressable>
      </View>
      <Text numberOfLines={1} className="text-[12px] text-ink-soft">
        {meaningFor(rule, settings.meaningLanguage)}
      </Text>
      {/* Same bottom space as a word tile, so the grids look alike. */}
      <View className="mt-1 h-1" />
    </Pressable>
  );
}
