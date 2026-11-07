import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { WordCardFrame } from '@/components/ai-suggestions';
import { AppHeader } from '@/components/app-header';
import { EmptyState, Icon, IconButton, Toggle, TwoColumnGrid, type IconName } from '@/components/ui';
import { setWordsSeen } from '@/db/dictionary';
import { getCollectionWords, setWordSaved, type CatalogWord } from '@/db/queries';
import { showAlert } from '@/lib/alert';
import { CATEGORY_ICON, isWordCategory, WORD_CATEGORIES } from '@/lib/categories';
import { findCollection } from '@/lib/collections';
import { padRows, useLayout } from '@/lib/layout';
import { meaningFor } from '@/lib/meaning';
import { useSettings } from '@/state/settings';
import { useSync } from '@/state/sync';
import colors from '@/theme/colors';

type CategoryId = (typeof WORD_CATEGORIES)[number] | 'other';

type Group = { category: CategoryId; words: CatalogWord[]; saved: number; unseen: number };

const categoryOf = (word: CatalogWord): CategoryId => (isWordCategory(word.topic) ? word.topic : 'other');

/** Words grouped by category, in the fixed order (その他 last); empty groups are left out. */
function groupByCategory(words: CatalogWord[]): Group[] {
  return [...WORD_CATEGORIES, 'other' as const]
    .map((category) => {
      const inGroup = words.filter((w) => categoryOf(w) === category);
      return {
        category,
        words: inGroup,
        saved: inGroup.filter((w) => w.savedAt !== null).length,
        unseen: inGroup.filter((w) => w.unseen).length,
      };
    })
    .filter((group) => group.words.length > 0);
}

/**
 * One level (or collection). Without a category: a grid of category cards, each with saved/total,
 * how many words are new to you, and a preview. With ?category=: that category's words as word
 * cards. ＋ saves a word, the eye marks it as seen, and "New only" hides the ones you've dealt with.
 */
export default function CollectionScreen() {
  const { id, category } = useLocalSearchParams<{ id: string; category?: string }>();
  const collection = findCollection(id);
  const db = useSQLiteContext();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const layout = useLayout();
  const { dataVersion } = useSync();
  const [words, setWords] = useState<CatalogWord[] | null>(null);
  const [newOnly, setNewOnly] = useState(false);

  const load = useCallback(() => {
    if (collection) getCollectionWords(db, collection.filter).then(setWords);
    // collection is derived from the id, so the id is the real dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, id, dataVersion]);

  useFocusEffect(load);

  const toggleSaved = async (word: CatalogWord) => {
    await setWordSaved(db, word.id, word.savedAt === null);
    load();
  };

  const markSeen = async (list: CatalogWord[]) => {
    await setWordsSeen(db, list, true);
    load();
  };

  /** Many words at once: ask first. */
  const confirmMarkSeen = (list: CatalogWord[]) => {
    if (list.length === 1) return markSeen(list);
    showAlert(t('seen.markAllTitle', { count: list.length }), t('seen.markAllBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('seen.markAll'), onPress: () => markSeen(list) },
    ]);
  };

  if (!collection) {
    return (
      <View className="flex-1 bg-surface">
        <AppHeader subtitle={t('nav.explore')} back kind="list" />
        <View className="p-4">
          <EmptyState message={t('explore.empty')} />
        </View>
      </View>
    );
  }

  const title = t(collection.titleKey);
  const groups = groupByCategory(words ?? []);
  const group = category ? groups.find((g) => g.category === category) : undefined;

  // ── One category: its words as cards ──
  if (category) {
    const shown = (group?.words ?? []).filter((w) => !newOnly || w.unseen);
    const columns = layout.size === 'wide' ? 5 : layout.size === 'medium' ? 4 : 2;
    const categoryName = t(`category.${category}`, { defaultValue: '' });
    return (
      <View className="flex-1 bg-surface">
        <AppHeader subtitle={`${title} · ${categoryName}`} back kind="list" />
        <FlatList
          // A different number of columns needs a fresh list.
          key={columns}
          data={padRows(shown, columns)}
          numColumns={columns}
          keyExtractor={(word, i) => (word ? String(word.id) : `empty-${i}`)}
          columnWrapperStyle={columns > 1 ? { gap: 12 } : undefined}
          ItemSeparatorComponent={() => <View className="h-3" />}
          contentContainerStyle={{ ...layout.page('list'), paddingBottom: insets.bottom + 24 }}
          ListHeaderComponent={
            group ? (
              <View className="mb-3 gap-2 pt-3">
                <Heading
                  icon={CATEGORY_ICON[group.category]}
                  title={categoryName}
                  saved={group.saved}
                  total={group.words.length}
                  unseen={group.unseen}
                />
                <View className="flex-row items-center gap-3 rounded-2xl bg-card px-3.5 py-2.5 shadow-sm shadow-ink/10">
                  <Toggle value={newOnly} onChange={setNewOnly} label={t('seen.newOnly')} />
                  <Text className="flex-1 font-display-semibold text-[13px] text-ink">{t('seen.newOnly')}</Text>
                  {group.unseen > 0 ? (
                    <PillButton label={t('seen.markGroup')} onPress={() => confirmMarkSeen(group.words.filter((w) => w.unseen))} />
                  ) : null}
                </View>
              </View>
            ) : undefined
          }
          ListEmptyComponent={
            words !== null ? <EmptyState message={newOnly && group ? t('seen.noneNew') : t('explore.empty')} /> : undefined
          }
          renderItem={({ item }) =>
            item ? (
              <View className="flex-1">
                <CatalogCard
                  word={item}
                  onOpen={() => router.push({ pathname: '/word/[id]', params: { id: String(item.id) } })}
                  onSave={() => toggleSaved(item)}
                  onSeen={() => markSeen([item])}
                />
              </View>
            ) : (
              <View className="flex-1" />
            )
          }
        />
      </View>
    );
  }

  // ── The level: a card for each category ──
  const body = t(`${collection.titleKey}Body`, { defaultValue: '' });
  const saved = words?.filter((w) => w.savedAt !== null).length ?? 0;
  const unseen = words?.filter((w) => w.unseen) ?? [];

  return (
    <View className="flex-1 bg-surface">
      <AppHeader subtitle={title} back kind="list" />
      <ScrollView
        contentContainerClassName="gap-3"
        contentContainerStyle={{ ...layout.page('list'), paddingBottom: insets.bottom + 24 }}>
        <View className="mb-1 gap-2 pt-3">
          <Heading icon={collection.icon} title={title} saved={saved} total={words?.length ?? 0} unseen={unseen.length} />
          {body ? <Text className="text-[13px] leading-5 text-ink-soft">{body}</Text> : null}
          {unseen.length > 0 ? (
            <View className="flex-row">
              <PillButton label={t('seen.markAll')} onPress={() => confirmMarkSeen(unseen)} />
            </View>
          ) : null}
        </View>
        {words !== null && groups.length === 0 ? <EmptyState message={t('explore.empty')} /> : null}
        <TwoColumnGrid columns={layout.size === 'wide' ? 4 : layout.size === 'medium' ? 3 : 2}>
          {groups.map((g) => (
            <CategoryCard
              key={g.category}
              group={g}
              onPress={() => router.push({ pathname: '/collection/[id]', params: { id: collection.id, category: g.category } })}
            />
          ))}
        </TwoColumnGrid>
      </ScrollView>
    </View>
  );
}

/** The icon, name and "saved · new" line at the top of a level or category. */
function Heading({
  icon,
  title,
  saved,
  total,
  unseen,
}: {
  icon: IconName;
  title: string;
  saved: number;
  total: number;
  unseen: number;
}) {
  const { t } = useTranslation();
  return (
    <View className="flex-row items-center gap-3">
      <View className="h-11 w-11 items-center justify-center rounded-full bg-primary-soft">
        <Icon name={icon} size={22} color={colors.primary.DEFAULT} />
      </View>
      <View className="flex-1">
        <Text className="font-display text-[20px] text-ink">{title}</Text>
        <Text className="font-display-medium text-[12px] text-ink-muted">
          {t('explore.progress', { saved, total })}
          {unseen > 0 ? `  ·  ${t('seen.newCount', { count: unseen })}` : ''}
        </Text>
      </View>
    </View>
  );
}

function PillButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      hitSlop={6}
      className="rounded-full bg-surface-high px-3 py-1.5 active:bg-primary-soft">
      <Text className="font-display text-[12px] text-ink">{label}</Text>
    </Pressable>
  );
}

/** One category of a level, the same card shape as 基本のことば: icon, name, a preview, progress and new words. */
function CategoryCard({ group, onPress }: { group: Group; onPress: () => void }) {
  const { t } = useTranslation();
  const ratio = group.saved / group.words.length;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="flex-1 gap-2 rounded-card bg-card p-4 shadow-md shadow-ink/10 active:opacity-80">
      <View className="flex-row items-center justify-between">
        <View className="h-10 w-10 items-center justify-center rounded-xl bg-primary-soft">
          <Icon name={CATEGORY_ICON[group.category]} size={20} color={colors.primary.DEFAULT} />
        </View>
        {group.unseen > 0 ? (
          <Text className="rounded-full bg-primary-soft px-2 py-0.5 font-display text-[11px] text-primary">
            {t('seen.newCount', { count: group.unseen })}
          </Text>
        ) : (
          <Icon name="chevron-right" size={20} color={colors.ink.muted} />
        )}
      </View>
      <Text numberOfLines={1} className="font-display text-[14px] text-ink">
        {t(`category.${group.category}`)}
      </Text>
      <Text numberOfLines={1} className="text-[12px] leading-4 text-ink-soft">
        {group.words.slice(0, 4).map((w) => w.word).join('、')}
        {group.words.length > 4 ? '…' : ''}
      </Text>
      <View className="mt-auto gap-1">
        <View className="h-1.5 overflow-hidden rounded-full bg-surface-high">
          <View className="h-full rounded-full bg-primary" style={{ width: `${Math.round(ratio * 100)}%` }} />
        </View>
        <Text className="font-display-medium text-[11px] text-ink-muted">
          {t('explore.progress', { saved: group.saved, total: group.words.length })}
        </Text>
      </View>
    </Pressable>
  );
}

/** A dictionary word as a small card: tap to open it, the eye marks it as seen, ＋ saves it. */
function CatalogCard({
  word,
  onOpen,
  onSave,
  onSeen,
}: {
  word: CatalogWord;
  onOpen: () => void;
  onSave: () => void;
  onSeen: () => void;
}) {
  const { t } = useTranslation();
  const { settings } = useSettings();
  return (
    <WordCardFrame
      reading={word.reading}
      word={word.word}
      meaning={meaningFor(word, settings.meaningLanguage)}
      jlpt={word.jlpt}
      newLabel={word.unseen ? t('seen.newDot') : undefined}
      onPress={onOpen}
      action={
        <View className="flex-row items-center gap-1">
          {word.unseen ? <IconButton icon="visibility" size={30} label={t('seen.markSeen')} onPress={onSeen} /> : null}
          {word.savedAt ? (
            <IconButton icon="check" tone="soft" size={30} label={t('explore.saved')} onPress={onSave} />
          ) : (
            <IconButton icon="add" tone="soft" size={30} label={t('explore.save')} onPress={onSave} />
          )}
        </View>
      }
    />
  );
}
