import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

import { AppHeader } from '@/components/app-header';
import { ImportSheet, type ImportReview } from '@/components/import-sheet';
import { QuickAdd } from '@/components/quick-add';
import { LibraryCard, LibraryTile } from '@/components/library-card';
import { Chip, EmptyState, Icon, IconButton, Pill, type IconName, type PillTone } from '@/components/ui';
import {
  applyImport,
  getAllLibraryWords,
  getLibrary,
  getLibraryStats,
  planImport,
  setWordStarred,
  type ImportPlan,
} from '@/db/queries';
import type {
  JlptLevel,
  LibraryFilters,
  LibraryStats,
  LibraryWord,
  PartOfSpeech,
  ReviewFilter,
} from '@/db/types';
import { showAlert } from '@/lib/alert';
import { toLocalDay } from '@/lib/date';
import { pickCsvText, shareCsv } from '@/lib/file-io';
import { padRows, useLayout } from '@/lib/layout';
import { meaningFor } from '@/lib/meaning';
import { useSortOther } from '@/lib/use-sort-other';
import { VERB_GROUPS } from '@/lib/verb';
import { csvToWords, wordsToCsv, type CsvProblem } from '@/lib/word-csv';
import { useSettings } from '@/state/settings';
import { useSync } from '@/state/sync';
import colors from '@/theme/colors';

const STATUSES: ReviewFilter[] = ['all', 'starred'];
const POS: PartOfSpeech[] = ['noun', 'verb', 'i-adj', 'na-adj', 'adverb', 'expression'];
const JLPT: JlptLevel[] = [5, 4, 3, 2, 1];
const NO_FILTERS: LibraryFilters = { search: '', pos: null, verbGroup: null, jlpt: null, topic: null, status: 'all' };

type ViewMode = 'list' | 'grid';

/** 単語帳: every word you've saved, searchable and filterable. */
export default function LibraryScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const { t } = useTranslation();
  const [filters, setFilters] = useState<LibraryFilters>(NO_FILTERS);
  const [words, setWords] = useState<LibraryWord[] | null>(null);
  const [stats, setStats] = useState<LibraryStats | null>(null);
  const [view, setView] = useState<ViewMode>('list');
  const { settings } = useSettings();
  const [importing, setImporting] = useState<{ plan: ImportPlan; problems: CsvProblem[] } | null>(null);
  const { dataVersion, topicLabel } = useSync();
  const { sorting, sort } = useSortOther(() => load());
  const layout = useLayout();
  // Cards per row: list view 1 → 3 as the window widens; the compact grid view one more.
  const columns = view === 'grid' ? layout.columns + 1 : layout.columns;

  const load = useCallback(() => {
    getLibrary(db, filters).then(setWords);
    getLibraryStats(db).then(setStats);
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
      {/* Quick add (type or dictate just the word; the AI fills in the rest) and your stats:
          stacked on phones, side by side on wider screens. */}
      <View className={layout.isCompact ? 'gap-3' : 'flex-row items-start gap-3'}>
        <View className={layout.isCompact ? '' : 'flex-[3]'}>
          <QuickAdd onAdded={load} />
        </View>
        {stats !== null && stats.total > 0 ? (
          <View className={layout.isCompact ? '' : 'flex-[2]'}>
            <StatsCard
              stats={stats}
              status={filters.status}
              onStatus={(status) => update({ status: filters.status === status ? 'all' : status })}
              onReview={() => router.navigate('/review')}
            />
          </View>
        ) : null}
      </View>

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

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 px-0.5 py-1">
        {STATUSES.map((status) => (
          <Chip
            key={status}
            label={t(`library.status.${status}`)}
            selected={filters.status === status}
            onPress={() => update({ status })}
          />
        ))}
        <View className="mx-1 w-px bg-ink/15" />
        {JLPT.map((level) => (
          <Chip
            key={level}
            label={`N${level}`}
            selected={filters.jlpt === level}
            onPress={() => update({ jlpt: filters.jlpt === level ? null : level })}
          />
        ))}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 px-0.5 py-1">
        {POS.map((pos) => (
          <Chip
            key={pos}
            label={t(`pos.${pos}`)}
            selected={filters.pos === pos}
            onPress={() => update({ pos: filters.pos === pos ? null : pos, verbGroup: null })}
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
              onPress={() => update({ verbGroup: filters.verbGroup === group ? null : group })}
            />
          ))}
        </ScrollView>
      ) : null}

      {/* Topic filters come from tapping a topic tag on a card; show it so it can be cleared. */}
      {filters.topic !== null ? (
        <View className="flex-row flex-wrap items-center gap-2">
          <Pressable
            accessibilityRole="button"
            onPress={() => update({ topic: null })}
            className="flex-row items-center gap-1.5 self-start rounded-full bg-primary-soft px-3 py-1.5">
            <Icon name="filter-alt" size={14} color={colors.primary.DEFAULT} />
            <Text className="font-display-semibold text-[12px] text-primary">{topicLabel(filters.topic === 'other' ? null : filters.topic)}</Text>
            <Icon name="close" size={14} color={colors.primary.DEFAULT} />
          </Pressable>
          {/* その他 is where words without a topic wait: let the AI sort them. */}
          {filters.topic === 'other' && words !== null && words.length > 0 ? (
            <Pressable
              accessibilityRole="button"
              disabled={sorting}
              onPress={sort}
              className={`flex-row items-center gap-1.5 rounded-full bg-card px-3 py-1.5 shadow-sm shadow-ink/10 ${sorting ? 'opacity-50' : ''}`}>
              <Icon name="auto-awesome" size={14} color={colors.primary.DEFAULT} />
              <Text className="font-display-semibold text-[12px] text-ink">{sorting ? t('ai.sorting') : t('ai.sortOther')}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

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

/**
 * The stats card: a gradient ring with how often you remember in review,
 * your word count, a tappable ⭐ count, the 習得 count, and a shortcut to review.
 */
function StatsCard({
  stats,
  status,
  onStatus,
  onReview,
}: {
  stats: LibraryStats;
  status: ReviewFilter;
  onStatus: (status: ReviewFilter) => void;
  onReview: () => void;
}) {
  const { t } = useTranslation();
  const percent = stats.accuracy === null ? null : Math.round(stats.accuracy * 100);

  return (
    <View className="flex-row items-center gap-4 rounded-[24px] bg-card p-4 shadow-md shadow-ink/10">
      <ProgressRing percent={percent} label={t('library.stats.remembered')} />

      <View className="flex-1 gap-2">
        <View className="flex-row items-baseline gap-1">
          <Text className="font-display text-[30px] leading-9 text-ink">{stats.total}</Text>
          <Text className="font-display-semibold text-[13px] text-ink-soft">{t('library.stats.words')}</Text>
        </View>
        <View className="flex-row flex-wrap gap-1.5">
          <CountPill
            icon="star"
            count={stats.starred}
            tone="mustard"
            active={status === 'starred'}
            onPress={() => onStatus('starred')}
          />
          <CountPill icon="check-circle" label={t('library.badge.known')} count={stats.known} tone="matcha" />
        </View>
      </View>

      {stats.starred > 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('nav.review')}
          onPress={onReview}
          className="items-center gap-0.5 rounded-2xl border-b-[3px] border-primary-deep bg-primary px-3 py-2.5 active:translate-y-[2px] active:border-b-[1px]">
          <Icon name="play-arrow" size={22} color="#FFFFFF" />
          <Text className="font-display text-[11px] text-white">{t('nav.review')}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** A ring that fills from vermilion to mustard, with the percentage in the middle. */
function ProgressRing({ percent, label }: { percent: number | null; label: string }) {
  const size = 68;
  const stroke = 7;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const filled = (percent ?? 0) / 100;

  return (
    <View
      style={{ width: size, height: size }}
      className="items-center justify-center"
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: percent ?? 0 }}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Defs>
          <LinearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={colors.primary.bright} />
            <Stop offset="1" stopColor={colors.mustard.dim} />
          </LinearGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={colors.surface.high} strokeWidth={stroke} fill="none" />
        {filled > 0 ? (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="url(#ring)"
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - filled)}
          />
        ) : null}
      </Svg>
      <Text className="font-display text-[15px] text-ink">{percent === null ? '—' : `${percent}%`}</Text>
    </View>
  );
}

/** A small count like "⭐ 5". Tappable ones filter the list. */
function CountPill({
  icon,
  label,
  count,
  tone,
  active = false,
  onPress,
}: {
  icon: IconName;
  label?: string;
  count: number;
  tone: PillTone;
  active?: boolean;
  onPress?: () => void;
}) {
  const pill = <Pill icon={icon} label={label ? `${label} ${count}` : String(count)} tone={active ? 'primary' : tone} />;
  if (!onPress) return pill;
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: active }} hitSlop={4} onPress={onPress}>
      {pill}
    </Pressable>
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
