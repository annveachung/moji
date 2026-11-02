import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, Text, TextInput, View } from 'react-native';

import { AppHeader } from '@/components/app-header';
import { ImportSheet, type ImportReview } from '@/components/import-sheet';
import { QuickAdd } from '@/components/quick-add';
import { WordFilters } from '@/components/word-filters';
import { LibraryCard, LibraryTile } from '@/components/library-card';
import { EmptyState, Icon, IconButton, type IconName } from '@/components/ui';
import {
  applyImport,
  getAllLibraryWords,
  getLibrary,
  planImport,
  setWordStarred,
  type ImportPlan,
} from '@/db/queries';
import type { LibraryFilters, LibraryWord } from '@/db/types';
import { showAlert } from '@/lib/alert';
import { toLocalDay } from '@/lib/date';
import { pickCsvText, shareCsv } from '@/lib/file-io';
import { padRows, useLayout } from '@/lib/layout';
import { meaningFor } from '@/lib/meaning';
import { useSortOther } from '@/lib/use-sort-other';
import { csvToWords, wordsToCsv, type CsvProblem } from '@/lib/word-csv';
import { useSettings } from '@/state/settings';
import { useSync } from '@/state/sync';
import colors from '@/theme/colors';

const NO_FILTERS: LibraryFilters = { search: '', pos: null, verbGroup: null, jlpt: null, topic: null, status: 'all' };

type ViewMode = 'list' | 'grid';

/** 単語帳: every word you've saved, searchable and filterable. */
export default function LibraryScreen() {
  const db = useSQLiteContext();
  const { t } = useTranslation();
  const [filters, setFilters] = useState<LibraryFilters>(NO_FILTERS);
  const [words, setWords] = useState<LibraryWord[] | null>(null);
  const [view, setView] = useState<ViewMode>('list');
  const { settings } = useSettings();
  const [importing, setImporting] = useState<{ plan: ImportPlan; problems: CsvProblem[] } | null>(null);
  const { dataVersion, topicLabel } = useSync();
  const { sorting, sort, sortOnce } = useSortOther(() => load());

  // After the move to fixed categories, words whose old topic didn't carry over get sorted once.
  useEffect(() => {
    sortOnce();
    // Only on opening the tab; sortOnce remembers when it's done.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const layout = useLayout();
  // Cards per row: list view 1 → 3 as the window widens; the compact grid view one more.
  const columns = view === 'grid' ? layout.columns + 1 : layout.columns;

  const load = useCallback(() => {
    getLibrary(db, filters).then(setWords);
    // dataVersion: reload when changes arrive from your other devices.
  }, [db, filters, dataVersion]);

  // Reload when the screen comes back into view (e.g. after adding a word) or filters change.
  useFocusEffect(load);

  const update = (patch: Partial<LibraryFilters>) => setFilters((current) => ({ ...current, ...patch }));
  const filtering =
    filters.search.trim() !== '' ||
    filters.pos !== null ||
    filters.verbGroup !== null ||
    filters.jlpt !== null ||
    filters.topic !== null ||
    filters.status !== 'all';

  /** Write the whole library to a CSV file and open the share sheet (Files, AirDrop, Mail…). */
  const exportCsv = async () => {
    const all = await getAllLibraryWords(db);
    if (all.length === 0) {
      showAlert(t('library.exportCsv'), t('library.exportEmpty'));
      return;
    }
    await shareCsv(`moji-${toLocalDay(new Date())}.csv`, wordsToCsv(all), t('library.exportCsv'));
  };

  /** Pick a CSV, read it, and open the review sheet. Nothing is saved until you confirm. */
  const importCsv = async () => {
    try {
      const text = await pickCsvText();
      if (text === null) return;
      const { words: rows, problems } = csvToWords(text);
      setImporting({ plan: await planImport(db, rows), problems });
    } catch {
      showAlert(t('importing.title'), t('importing.error'));
    }
  };

  const confirmImport = async (mergeIds: Set<number>) => {
    if (!importing) return;
    const result = await applyImport(db, importing.plan, mergeIds);
    setImporting(null);
    load();
    showAlert(t('importing.doneTitle'), t('importing.doneBody', result));
  };

  /** Describe a word import for the review sheet. */
  const toReview = (plan: ImportPlan, problems: CsvProblem[]): ImportReview => ({
    title: t('importing.title'),
    fresh: plan.fresh.map(({ csv }) => ({ key: String(csv.line), title: csv.word, subtitle: csv.reading })),
    freshTitle: t('importing.newWords', { count: plan.fresh.length }),
    duplicates: plan.duplicates.map(({ csv, existing }) => ({
      id: existing.id,
      title: existing.word,
      subtitle: existing.reading,
      current: meaningFor(existing, settings.meaningLanguage),
      incoming: meaningFor(csv, settings.meaningLanguage),
    })),
    duplicatesTitle: t('importing.duplicates', { count: plan.duplicates.length }),
    duplicatesHint: t('importing.duplicatesHint'),
    problems: problems.map((p) => ({ line: p.line, reason: t(`importing.reason.${p.reason}`) })),
    problemsTitle: t('importing.problems', { count: problems.length }),
    notes: [
      ...(plan.repeated > 0 ? [t('importing.repeated', { count: plan.repeated })] : []),
      ...(problems.length > 0 ? [t('importing.formatHint')] : []),
    ],
  });

  const headerButtons = (
    <View className="flex-row gap-2">
      <IconButton icon="file-download" size={36} label={t('library.importCsv')} onPress={importCsv} />
      <IconButton icon="ios-share" size={36} label={t('library.exportCsv')} onPress={exportCsv} />
    </View>
  );

  const toggleStar = async (word: LibraryWord) => {
    await setWordStarred(db, word.id, word.starredAt === null);
    load();
  };

  const header = (
    <View className="gap-3 pb-1 pt-3">
      {/* Quick add: type or dictate just the word; the AI fills in the rest. */}
      <QuickAdd onAdded={load} />

      <View className="flex-row items-center gap-2 rounded-2xl bg-card px-3.5 shadow-sm shadow-ink/10">
        <Icon name="search" size={20} color={colors.ink.muted} />
        <TextInput
          value={filters.search}
          onChangeText={(search) => update({ search })}
          placeholder={t('library.searchPlaceholder')}
          placeholderTextColor={colors.ink.muted}
          autoCorrect={false}
          clearButtonMode="while-editing"
          returnKeyType="search"
          className="h-12 flex-1 text-[15px] text-ink"
        />
      </View>

      <WordFilters
        filters={filters}
        onChange={update}
        showStatus
        topicExtra={
          // その他 is where words without a topic wait: let the AI sort them.
          filters.topic === 'other' && words !== null && words.length > 0 ? (
            <Pressable
              accessibilityRole="button"
              disabled={sorting}
              onPress={sort}
              className={`flex-row items-center gap-1.5 rounded-full bg-card px-3 py-1.5 shadow-sm shadow-ink/10 ${sorting ? 'opacity-50' : ''}`}>
              <Icon name="auto-awesome" size={14} color={colors.primary.DEFAULT} />
              <Text className="font-display-semibold text-[12px] text-ink">{sorting ? t('ai.sorting') : t('ai.sortOther')}</Text>
            </Pressable>
          ) : null
        }
      />


      {words !== null && words.length > 0 ? (
        <View className="flex-row items-center justify-between px-1">
          <Text className="font-display-semibold text-[12px] text-ink-soft">
            {t('library.count', { count: words.length })}
          </Text>
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
      <AppHeader subtitle={t('nav.library')} right={headerButtons} />
      {importing !== null ? (
        <ImportSheet
          review={toReview(importing.plan, importing.problems)}
          onCancel={() => setImporting(null)}
          onConfirm={confirmImport}
        />
      ) : null}
      <FlatList
        // Changing the number of columns needs a fresh list.
        key={`${view}-${columns}`}
        numColumns={columns}
        columnWrapperClassName={columns > 1 ? 'gap-3' : undefined}
        data={padRows(words ?? [], columns)}
        keyExtractor={(word, index) => (word ? String(word.id) : `empty-${index}`)}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={layout.page('list')}
        contentContainerClassName="gap-3 pb-8"
        ListHeaderComponent={header}
        ListEmptyComponent={
          words !== null ? (
            <EmptyState
              icon={filtering ? 'search-off' : 'auto-stories'}
              message={filtering ? t('library.noResults') : t('library.empty')}
            />
          ) : undefined
        }
        renderItem={({ item }) => (
          <View style={columns > 1 ? { flex: 1 } : undefined}>
            {item === null ? null : view === 'grid' ? (
              <LibraryTile word={item} onToggleStar={() => toggleStar(item)} />
            ) : (
              <LibraryCard word={item} onToggleStar={() => toggleStar(item)} filters={filters} onFilter={update} />
            )}
          </View>
        )}
        ListFooterComponent={
          words !== null && words.length > 0 && !filtering ? (
            <View className="items-center gap-1 py-6">
              <Icon name="menu-book" size={18} color={colors.primary.DEFAULT} />
              <Text className="text-[17px] font-bold text-ink">{t('library.quote')}</Text>
              <Text className="max-w-[280px] text-center text-[12px] text-ink-soft">{t('library.quoteMeaning')}</Text>
            </View>
          ) : undefined
        }
      />
    </View>
  );
}

function ViewToggle({
  icon,
  label,
  selected,
  onPress,
}: {
  icon: IconName;
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      className={`rounded-lg p-1.5 shadow-sm ${selected ? 'bg-card shadow-ink/10' : 'shadow-transparent'}`}>
      <Icon name={icon} size={18} color={selected ? colors.primary.DEFAULT : colors.ink.muted} />
    </Pressable>
  );
}
