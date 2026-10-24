import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { AppHeader } from '@/components/app-header';
import { EmptyState, Icon, IconButton, SectionHeader, TwoColumnGrid } from '@/components/ui';
import { getCollectionProgress, getCollectionWords, getSuggestions, setWordSaved } from '@/db/queries';
import type { Suggestion, Word } from '@/db/types';
import { KANJI_ADVANTAGE, LEVELS } from '@/lib/collections';
import { meaningFor } from '@/lib/meaning';
import { useSettings } from '@/state/settings';
import colors from '@/theme/colors';

type Progress = { saved: number; total: number };

/**
 * 発見: suggestions grown from your library, hard kanji words that are easy for
 * Chinese speakers, and the catalog by JLPT level. One tap saves a word.
 */
export default function ExploreScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const { t } = useTranslation();
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);
  const [kanjiWords, setKanjiWords] = useState<Word[]>([]);
  const [progress, setProgress] = useState<Record<string, Progress>>({});

  const load = useCallback(async () => {
    setSuggestions(await getSuggestions(db));
    const kanji = await getCollectionWords(db, KANJI_ADVANTAGE.filter);
    setKanjiWords(kanji.filter((w) => w.savedAt === null).slice(0, 10));
    const entries = await Promise.all(
      LEVELS.map(async ({ collection }) => [collection.id, await getCollectionProgress(db, collection.filter)]),
    );
    setProgress(Object.fromEntries(entries));
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const save = async (word: Word) => {
    await setWordSaved(db, word.id, true);
    load();
  };

  const open = (id: string) => router.push({ pathname: '/collection/[id]', params: { id } });

  const suggestionTitle = (s: Suggestion) => {
    switch (s.kind) {
      case 'shared-kanji':
        return t('explore.sharesKanji', { word: s.anchor.word });
      case 'same-topic':
        return t('explore.moreTopic', { topic: t(`topic.${s.topic}`) });
      case 'confusing':
        return t('explore.confusingWith', { word: s.anchor.word });
      case 'starter':
        return t('explore.starter');
    }
  };

  return (
    <View className="flex-1 bg-surface">
      <AppHeader subtitle={t('nav.explore')} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        // Extra room at the bottom so the last cards clear the floating tab bar.
        contentContainerClassName="w-full max-w-[720px] self-center gap-4 px-4 pb-32 pt-3">
        <Text className="px-1 text-[13px] leading-5 text-ink-soft">{t('explore.intro')}</Text>

        {/* 1. For you */}
        <SectionHeader title={t('explore.forYou')} />
        {suggestions === null ? null : suggestions.length === 0 ? (
          <EmptyState icon="celebration" message={t('explore.allSaved')} />
        ) : (
          suggestions.map((s, i) => (
            <WordStrip key={`${s.kind}-${i}`} title={suggestionTitle(s)} words={s.words} onSave={save} />
          ))
        )}

        {/* 2. Hard kanji words that are easy with Chinese */}
        {kanjiWords.length > 0 ? (
          <>
            <View className="mt-2">
              <SectionHeader
                title={t('explore.kanjiAdvantage')}
                accent="mustard"
                right={
                  <Pressable accessibilityRole="link" hitSlop={8} onPress={() => open(KANJI_ADVANTAGE.id)}>
                    <Text className="font-display-semibold text-[13px] text-primary">{t('explore.seeAll')}</Text>
                  </Pressable>
                }
              />
            </View>
            <Text className="px-1 text-[13px] leading-5 text-ink-soft">{t('explore.kanjiAdvantageBody')}</Text>
            <WordStrip words={kanjiWords} onSave={save} />
          </>
        ) : null}

        {/* 3. By JLPT level, N5 → N1 */}
        <View className="mt-2">
          <SectionHeader title={t('explore.levels')} accent="matcha" />
        </View>
        <TwoColumnGrid>
          {LEVELS.map(({ level, collection }) => (
            <LevelCard
              key={level}
              level={level}
              title={t(collection.titleKey)}
              body={t(`${collection.titleKey}Body`)}
              progress={progress[collection.id]}
              onPress={() => open(collection.id)}
            />
          ))}
        </TwoColumnGrid>
      </ScrollView>
    </View>
  );
}

/** A titled, sideways-scrolling row of small word cards. */
function WordStrip({ title, words, onSave }: { title?: string; words: Word[]; onSave: (word: Word) => void }) {
  return (
    <View className="gap-2">
      {title ? <Text className="px-1 font-display-semibold text-[13px] text-ink-soft">{title}</Text> : null}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        // Let cards run edge to edge while lining up with the page's padding.
        className="-mx-4"
        contentContainerClassName="gap-3 px-4 pb-2">
        {words.map((word) => (
          <WordCard key={word.id} word={word} onSave={() => onSave(word)} />
        ))}
      </ScrollView>
    </View>
  );
}

/** A small word card: tap to open, ＋ to save. */
function WordCard({ word, onSave }: { word: Word; onSave: () => void }) {
  const router = useRouter();
  const { t } = useTranslation();
  const { settings } = useSettings();
  const kanaOnly = word.reading === word.word;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${word.word} ${word.reading}`}
      onPress={() => router.push({ pathname: '/word/[id]', params: { id: String(word.id) } })}
      className="w-[150px] justify-between gap-2 rounded-2xl bg-card p-3 shadow-md shadow-ink/10 active:opacity-80">
      <View>
        {settings.showFurigana && !kanaOnly ? (
          <Text numberOfLines={1} className="text-[10px] font-semibold tracking-wider text-primary">
            {word.reading}
          </Text>
        ) : null}
        <Text numberOfLines={1} className="text-[22px] font-bold text-ink">
          {word.word}
        </Text>
        <Text numberOfLines={2} className="text-[12px] leading-4 text-ink-soft">
          {meaningFor(word, settings.meaningLanguage)}
        </Text>
      </View>
      <View className="flex-row items-center justify-between">
        <Text className="font-display text-[10px] text-ink-muted">{word.jlpt !== null ? `N${word.jlpt}` : ''}</Text>
        <IconButton icon="add" tone="soft" size={30} label={t('explore.save')} onPress={onSave} />
      </View>
    </Pressable>
  );
}

/** One JLPT level: big level badge, name, description and a saved/total bar. */
function LevelCard({
  level,
  title,
  body,
  progress,
  onPress,
}: {
  level: number;
  title: string;
  body: string;
  progress: Progress | undefined;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const ratio = progress && progress.total > 0 ? progress.saved / progress.total : 0;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="flex-1 gap-2 rounded-card bg-card p-4 shadow-md shadow-ink/10 active:opacity-80">
      <View className="flex-row items-center justify-between">
        <View className="h-10 w-10 items-center justify-center rounded-xl bg-primary-soft">
          <Text className="font-display text-[15px] text-primary">N{level}</Text>
        </View>
        <Icon name="chevron-right" size={20} color={colors.ink.muted} />
      </View>
      <Text className="font-display text-[14px] text-ink">{title}</Text>
      <Text numberOfLines={2} className="text-[12px] leading-4 text-ink-soft">
        {body}
      </Text>
      <View className="mt-auto gap-1">
        <View className="h-1.5 overflow-hidden rounded-full bg-surface-high">
          <View className="h-full rounded-full bg-primary" style={{ width: `${Math.round(ratio * 100)}%` }} />
        </View>
        <Text className="font-display-medium text-[11px] text-ink-muted">
          {progress ? t('explore.progress', { saved: progress.saved, total: progress.total }) : ' '}
        </Text>
      </View>
    </Pressable>
  );
}
