import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { AppHeader } from '@/components/app-header';
import { DailyReading } from '@/components/daily-reading';
import { ImportSheet, type ImportReview } from '@/components/import-sheet';
import { Card, Chip, EmptyState, Icon, IconButton, Pill, SectionHeader, type IconName } from '@/components/ui';
import {
  applyGrammarImport,
  getGrammarRules,
  planGrammarImport,
  setGrammarStarred,
  type GrammarImportPlan,
} from '@/db/grammar';
import type { GrammarRule, JlptLevel } from '@/db/types';
import { showAlert } from '@/lib/alert';
import { pickCsvText } from '@/lib/file-io';
import { padRows, useLayout } from '@/lib/layout';
import { csvToGrammar, type GrammarCsvProblem } from '@/lib/grammar-csv';
import { meaningFor } from '@/lib/meaning';
import { useSettings } from '@/state/settings';
import { useSync } from '@/state/sync';
import colors from '@/theme/colors';

const LEVELS: JlptLevel[] = [5, 4, 3, 2, 1];

type Importing = { plan: GrammarImportPlan; problems: GrammarCsvProblem[]; unknownColumns: string[] };

/**
 * 文法: grammar rules N5 → N1, imported from your spreadsheet. At the top, a daily
 * reading (easy NHK news + a short AI reading) once the AI server is ready.
 */
export default function GrammarScreen() {
  const db = useSQLiteContext();
  const { t } = useTranslation();
  const { settings } = useSettings();
  const [search, setSearch] = useState('');
  const [level, setLevel] = useState<JlptLevel | null>(null);
  const [rules, setRules] = useState<GrammarRule[] | null>(null);
  const [importing, setImporting] = useState<Importing | null>(null);

  const { dataVersion } = useSync();
  const layout = useLayout();

  const load = useCallback(() => {
    getGrammarRules(db, { search, jlpt: level }).then(setRules);
  }, [db, search, level, dataVersion]);

  useFocusEffect(load);

  const filtering = search.trim() !== '' || level !== null;

  const toggleStar = async (rule: GrammarRule) => {
    await setGrammarStarred(db, rule.id, rule.starredAt === null);
    load();
  };

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

      {rules !== null && rules.length > 0 ? (
        <Text className="px-1 font-display-semibold text-[12px] text-ink-soft">
          {t('grammar.count', { count: rules.length })}
        </Text>
      ) : null}
    </View>
  );

  return (
    <View className="flex-1 bg-surface">
      <AppHeader
        subtitle={t('nav.grammar')}
        right={<IconButton icon="file-download" size={36} label={t('grammar.importCsv')} onPress={importCsv} />}
      />
      {importing !== null ? (
        <ImportSheet review={toReview(importing)} onCancel={() => setImporting(null)} onConfirm={confirmImport} />
      ) : null}
      <FlatList
        key={layout.columns}
        numColumns={layout.columns}
        columnWrapperClassName={layout.columns > 1 ? 'gap-3' : undefined}
        data={padRows(rules ?? [], layout.columns)}
        keyExtractor={(rule, index) => (rule ? String(rule.id) : `empty-${index}`)}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={layout.page('list')}
        contentContainerClassName="gap-3 pb-32"
        ListHeaderComponent={header}
        ListEmptyComponent={
          rules !== null ? (
            <EmptyState
              icon={filtering ? 'search-off' : 'auto-stories'}
              message={filtering ? t('grammar.noResults') : t('grammar.empty')}
            />
          ) : undefined
        }
        renderItem={({ item }) => (
          <View style={layout.columns > 1 ? { flex: 1 } : undefined}>
            {item ? <GrammarCard rule={item} onToggleStar={() => toggleStar(item)} /> : null}
          </View>
        )}
      />
    </View>
  );
}

/** One rule in the list: pattern, level, ⭐, meaning, formation and how many examples. */
function GrammarCard({ rule, onToggleStar }: { rule: GrammarRule; onToggleStar: () => void }) {
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
        <IconButton
          icon={rule.starredAt ? 'star' : 'star-border'}
          tone={rule.starredAt ? 'star' : 'quiet'}
          size={32}
          label={rule.starredAt ? t('grammar.unstar') : t('grammar.star')}
          onPress={onToggleStar}
        />
      </View>
      <Text className="text-[15px] font-semibold leading-5 text-ink">{meaningFor(rule, settings.meaningLanguage)}</Text>
      {rule.formation ? (
        <View className="self-start rounded-lg bg-surface-low px-2.5 py-1">
          <Text className="text-[12px] text-ink-soft">{rule.formation}</Text>
        </View>
      ) : null}
      {rule.sentenceCount > 0 ? (
        <View className="flex-row items-center gap-1">
          <Icon name="format-quote" size={14} color={colors.ink.muted} />
          <Text className="font-display-medium text-[11px] text-ink-muted">
            {t('grammar.sentences', { count: rule.sentenceCount })}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}
