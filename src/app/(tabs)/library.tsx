import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { AppHeader } from '@/components/app-header';
import { LibraryCard, LibraryTile } from '@/components/library-card';
import { Chip, EmptyState, Icon, IconButton, type IconName } from '@/components/ui';
import { getLibrary, getLibraryStats, setWordStarred } from '@/db/queries';
import type {
  JlptLevel,
  LibraryFilters,
  LibraryStats,
  LibraryWord,
  PartOfSpeech,
  ReviewFilter,
} from '@/db/types';
import colors from '@/theme/colors';

const STATUSES: ReviewFilter[] = ['all', 'starred', 'weak'];
const POS: PartOfSpeech[] = ['noun', 'verb', 'i-adj', 'na-adj', 'adverb', 'expression'];
const JLPT: JlptLevel[] = [5, 4, 3, 2, 1];

type ViewMode = 'list' | 'grid';

/** 単語帳: every word you've saved, searchable and filterable. */
export default function LibraryScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const { t } = useTranslation();
  const [filters, setFilters] = useState<LibraryFilters>({ search: '', pos: null, jlpt: null, status: 'all' });
  const [words, setWords] = useState<LibraryWord[] | null>(null);
  const [stats, setStats] = useState<LibraryStats | null>(null);
  const [view, setView] = useState<ViewMode>('list');

  const load = useCallback(() => {
    getLibrary(db, filters).then(setWords);
    getLibraryStats(db).then(setStats);
  }, [db, filters]);

  // Reload when the screen comes back into view (e.g. after adding a word) or filters change.
  useFocusEffect(load);

  const update = (patch: Partial<LibraryFilters>) => setFilters((current) => ({ ...current, ...patch }));
  const filtering = filters.search.trim() !== '' || filters.pos || filters.jlpt || filters.status !== 'all';

  const toggleStar = async (word: LibraryWord) => {
    await setWordStarred(db, word.id, word.starredAt === null);
    load();
  };

  const addButton = (
    <IconButton icon="add" tone="sumi" size={38} label={t('library.add')} onPress={() => router.push('/word-form')} />
  );

  const header = (
    <View className="gap-3 pb-1 pt-3">
      {stats && stats.total > 0 && <StatsStrip stats={stats} />}

      <View className="flex-row items-center gap-2 rounded-2xl bg-paper px-3.5 shadow-sm shadow-sumi/10">
        <Icon name="search" size={20} color={colors.sumi.muted} />
        <TextInput
          value={filters.search}
          onChangeText={(search) => update({ search })}
          placeholder={t('library.searchPlaceholder')}
          placeholderTextColor={colors.sumi.muted}
          autoCorrect={false}
          clearButtonMode="while-editing"
          returnKeyType="search"
          className="h-12 flex-1 text-[15px] text-sumi"
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 py-1">
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
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 py-1">
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
        <View className="flex-row items-center justify-between px-1">
          <Text className="font-display-semibold text-[12px] text-sumi-light">
            {t('library.count', { count: words.length })}
          </Text>
          <View className="flex-row rounded-xl bg-cream-dark/60 p-0.5">
            <ViewToggle icon="view-agenda" label={t('library.listView')} selected={view === 'list'} onPress={() => setView('list')} />
            <ViewToggle icon="grid-view" label={t('library.gridView')} selected={view === 'grid'} onPress={() => setView('grid')} />
          </View>
        </View>
      )}
    </View>
  );

  return (
    <View className="flex-1 bg-cream">
      <AppHeader subtitle={t('nav.library')} right={addButton} />
      <FlatList
        // Switching between 1 and 2 columns needs a fresh list.
        key={view}
        numColumns={view === 'grid' ? 2 : 1}
        columnWrapperClassName={view === 'grid' ? 'gap-3' : undefined}
        data={words ?? []}
        keyExtractor={(word) => String(word.id)}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerClassName="w-full max-w-[720px] self-center gap-3 px-4 pb-8"
        ListHeaderComponent={header}
        ListEmptyComponent={
          words ? (
            <EmptyState
              icon={filtering ? 'search-off' : 'auto-stories'}
              message={filtering ? t('library.noResults') : t('library.empty')}
            />
          ) : undefined
        }
        renderItem={({ item }) =>
          view === 'grid' ? (
            <LibraryTile word={item} onToggleStar={() => toggleStar(item)} />
          ) : (
            <LibraryCard word={item} onToggleStar={() => toggleStar(item)} />
          )
        }
        ListFooterComponent={
          words && words.length > 0 && !filtering ? (
            <View className="items-center gap-1 py-6">
              <Icon name="menu-book" size={18} color={colors.amber.dark} />
              <Text className="text-[17px] font-bold text-sumi">{t('library.quote')}</Text>
              <Text className="max-w-[280px] text-center text-[12px] text-sumi-light">{t('library.quoteMeaning')}</Text>
            </View>
          ) : undefined
        }
      />
    </View>
  );
}

/** Total words, starred count, and a ring showing how often you remember in review. */
function StatsStrip({ stats }: { stats: LibraryStats }) {
  const { t } = useTranslation();
  const percent = stats.accuracy === null ? null : Math.round(stats.accuracy * 100);
  const size = 44;
  const stroke = 4;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <View className="flex-row items-center gap-4 rounded-card bg-paper p-4 shadow-md shadow-sumi/10">
      <View style={{ width: size, height: size }} className="items-center justify-center">
        <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
          <Circle cx={size / 2} cy={size / 2} r={radius} stroke={colors.cream.dark} strokeWidth={stroke} fill="none" />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={colors.amber.DEFAULT}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - (percent ?? 0) / 100)}
          />
        </Svg>
        <Text className="font-display text-[11px] text-sumi">{percent === null ? '—' : `${percent}%`}</Text>
      </View>
      <View className="flex-1 flex-row items-end justify-between">
        <Stat value={stats.total} label={t('library.stats.words')} />
        <Stat value={stats.starred} label={t('library.stats.starred')} />
        <Stat value={percent === null ? '—' : `${percent}%`} label={t('library.stats.remembered')} />
      </View>
    </View>
  );
}

function Stat({ value, label }: { value: number | string; label: string }) {
  return (
    <View className="items-center">
      <Text className="font-display text-[20px] text-sumi">{value}</Text>
      <Text className="font-display-medium text-[11px] text-sumi-light">{label}</Text>
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
      className={`rounded-lg p-1.5 ${selected ? 'bg-paper shadow-sm shadow-sumi/10' : ''}`}>
      <Icon name={icon} size={18} color={selected ? colors.sumi.DEFAULT : colors.sumi.muted} />
    </Pressable>
  );
}
