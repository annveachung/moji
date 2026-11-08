import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/app-header';
import { CategoryPicker } from '@/components/category-picker';
import { FuriganaText } from '@/components/furigana-text';
import { StarButton } from '@/components/mascot';
import { Card, EmptyState, Icon, IconButton, LabelButton, Pill, SectionHeader, StampButton, TwoColumnGrid, type IconName } from '@/components/ui';
import { isWordSeen, setWordsSeen } from '@/db/dictionary';
import {
  addSentences,
  countUnseenSentences,
  deleteSentence,
  getAllSentences,
  deleteWord,
  getRelatedWords,
  getShownSentences,
  getWord,
  revealNextSentence,
  setSentenceFavorite,
  setWordCategory,
  setWordSaved,
  setWordStarred,
} from '@/db/queries';
import type { ChineseLinkKind, RelatedWord, Sentence, Word } from '@/db/types';
import { generateWordSentences } from '@/lib/ai';
import { aiErrorMessage } from '@/lib/ai-errors';
import { showAlert } from '@/lib/alert';
import { isWordCategory } from '@/lib/categories';
import { furiganaToReading } from '@/lib/furigana';
import { meaningFor, translationFor } from '@/lib/meaning';
import { speakJapanese } from '@/lib/speech';
import { useLayout } from '@/lib/layout';
import { posLabel } from '@/lib/verb';
import { useSettings } from '@/state/settings';
import { useSync } from '@/state/sync';
import colors from '@/theme/colors';

const ZH_LINK_STYLE: Record<ChineseLinkKind, { icon: IconName; tone: 'matcha' | 'mustard' | 'error' }> = {
  same: { icon: 'check-circle', tone: 'matcha' },
  nuance: { icon: 'info-outline', tone: 'mustard' },
  'false-friend': { icon: 'warning', tone: 'error' },
};

/** How many examples show before "Show all". */
const FOLDED_EXAMPLES = 3;

const RELATION_ORDER: RelatedWord['kind'][] = ['synonym', 'antonym', 'confusing', 'shared-kanji'];
const RELATION_ICON: Record<RelatedWord['kind'], IconName> = {
  synonym: 'compare-arrows',
  antonym: 'swap-horiz',
  confusing: 'warning',
  'shared-kanji': 'hub',
};

export default function WordDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const wordId = Number(id);
  const db = useSQLiteContext();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const layout = useLayout();
  const { settings } = useSettings();
  const zh = settings.meaningLanguage === 'zh-TW';

  const [word, setWord] = useState<Word | null | undefined>(undefined);
  const [sentences, setSentences] = useState<Sentence[]>([]);
  const [unseen, setUnseen] = useState(0);
  const [related, setRelated] = useState<RelatedWord[]>([]);
  const [generating, setGenerating] = useState(false);
  /** The examples list shows only the first few until opened. */
  const [expanded, setExpanded] = useState(false);
  const [picking, setPicking] = useState(false);
  /** Catalog words only: whether you've marked it as seen. */
  const [seen, setSeen] = useState(false);
  const { dataVersion, topicLabel } = useSync();

  const load = useCallback(async () => {
    const loaded = await getWord(db, wordId);
    setWord(loaded);
    if (!loaded) return;
    setRelated(await getRelatedWords(db, loaded));
    setSeen(await isWordSeen(db, loaded));
    let shown = await getShownSentences(db, wordId);
    // First visit: reveal the first example so the section is never empty.
    if (shown.length === 0) {
      const first = await revealNextSentence(db, wordId);
      shown = first ? [first] : [];
    }
    setSentences(shown);
    setUnseen(await countUnseenSentences(db, wordId));
  }, [db, wordId, dataVersion]);

  // Reload when you come back, e.g. after editing the word.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (word === undefined) return <View className="flex-1 bg-surface" />;
  if (word === null) {
    return (
      <View className="flex-1 bg-surface">
        <AppHeader subtitle={t('word.title')} back kind="reading" />
        <View className="p-4">
          <EmptyState message={t('word.notFound')} />
        </View>
      </View>
    );
  }

  const toggleSaved = async () => {
    await setWordSaved(db, word.id, word.savedAt === null);
    setWord(await getWord(db, word.id));
  };

  const toggleSeen = async () => {
    await setWordsSeen(db, [word], !seen);
    setSeen(!seen);
  };

  const toggleStar = async () => {
    await setWordStarred(db, word.id, word.starredAt === null);
    setWord(await getWord(db, word.id));
  };

  const confirmDelete = () =>
    showAlert(t('word.deleteConfirmTitle'), t('word.deleteConfirmBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          await deleteWord(db, word.id);
          router.back();
        },
      },
    ]);

  /** New examples from the AI (different from the ones it has), then the first is shown. */
  const regenerateExamples = async () => {
    setGenerating(true);
    try {
      const all = await getAllSentences(db, word.id);
      const fresh = await generateWordSentences({
        word: word.word,
        reading: word.reading,
        meaning: word.meaningEn,
        avoid: all.map((s) => s.ja).slice(-30),
      });
      await addSentences(db, word.id, fresh);
      await showAnotherExample();
    } catch (error) {
      showAlert(t('word.examplesTitle'), aiErrorMessage(t, error));
    } finally {
      setGenerating(false);
    }
  };

  const showAnotherExample = async () => {
    const next = await revealNextSentence(db, word.id);
    if (next) {
      setSentences((current) => [...current, next]);
      // The new one goes at the end: open the list so you see it.
      setExpanded(true);
    }
    setUnseen(await countUnseenSentences(db, word.id));
  };

  const removeExample = async (sentence: Sentence) => {
    await deleteSentence(db, sentence.id);
    setSentences((current) => current.filter((s) => s.id !== sentence.id));
  };

  const toggleFavorite = async (sentence: Sentence) => {
    await setSentenceFavorite(db, sentence.id, !sentence.favorite);
    setSentences((current) =>
      current.map((s) => (s.id === sentence.id ? { ...s, favorite: !s.favorite } : s)),
    );
  };

  const groups = RELATION_ORDER.map((kind) => ({
    kind,
    words: related.filter((r) => r.kind === kind).map((r) => r.word),
  })).filter((group) => group.words.length > 0);

  const zhNote = zh ? word.zhNoteZh : word.zhNoteEn;

  return (
    <View className="flex-1 bg-surface">
      <AppHeader subtitle={t('word.title')} back kind="reading" />
      <ScrollView
        contentContainerClassName="gap-4 py-4"
        contentContainerStyle={{ ...layout.page('reading'), paddingBottom: insets.bottom + 24 }}
        keyboardShouldPersistTaps="handled">
        {picking ? (
          <CategoryPicker
            kind="word"
            value={word.topic}
            onClose={() => setPicking(false)}
            onPick={async (category) => {
              setPicking(false);
              await setWordCategory(db, word.id, isWordCategory(category) ? category : null);
              setWord(await getWord(db, word.id));
            }}
          />
        ) : null}
        {/* 1. The word itself */}
        <View className="rounded-[28px] bg-card p-5 shadow-md shadow-ink/10">
          <View className="flex-row items-center justify-between gap-2">
            <View className="flex-1 flex-row flex-wrap gap-1.5">
              <Pill label={word.jlpt ? t('jlpt.level', { level: word.jlpt }) : t('jlpt.none')} tone="mustard" />
              <Pill label={posLabel(t, word)} tone="outline" />
              {/* The category the AI chose: tap to move the word to another one. */}
              <Pressable accessibilityRole="button" accessibilityLabel={t('categoryUi.change')} onPress={() => setPicking(true)}>
                <Pill label={topicLabel(word.topic)} icon="edit" />
              </Pressable>
            </View>
            <View className="flex-row items-center gap-1.5">
              <IconButton icon="volume-up" tone="soft" size={34} label={t('word.listen')} onPress={() => speakJapanese(word.reading)} />
              <StarButton
                starred={Boolean(word.starredAt)}
                size={34}
                label={word.starredAt ? t('word.starred') : t('word.star')}
                onPress={toggleStar}
              />
            </View>
          </View>

          <View className="items-center py-4">
            <FuriganaText
              markup={word.furigana}
              size={52}
              showFurigana={settings.showFurigana}
              className="font-bold text-ink"
              containerClassName="justify-center"
            />
          </View>
        </View>

        {/* 2. Meaning, in the language chosen in Settings */}
        <Card>
          <SectionHeader title={t('word.meaningTitle')} />
          <View className="rounded-2xl bg-primary-soft/60 p-4">
            <Text className="mb-1 font-display text-[11px] tracking-wide text-primary">
              {zh ? '繁體中文' : 'English'}
            </Text>
            <Text className="text-[20px] font-bold leading-7 text-ink">
              {meaningFor(word, settings.meaningLanguage)}
            </Text>
          </View>
        </Card>

        {/* 3. Connection to Chinese, and false-friend warnings */}
        {word.zhLinkKind && zhNote && (
          <Card className="overflow-hidden">
            <Text className="absolute -bottom-4 -right-2 rotate-12 text-[64px] font-bold text-ink/5">辨析</Text>
            <SectionHeader
              title={t('word.zhTitle')}
              accent={word.zhLinkKind === 'false-friend' ? 'error' : 'primary'}
              right={
                <Pill
                  label={t(`zhLink.${word.zhLinkKind}`)}
                  icon={ZH_LINK_STYLE[word.zhLinkKind].icon}
                  tone={ZH_LINK_STYLE[word.zhLinkKind].tone}
                />
              }
            />
            <Text className="text-[14px] leading-6 text-ink">{zhNote}</Text>
          </Card>
        )}

        {/* 4. Example sentences */}
        <Card>
          <SectionHeader
            title={t('word.examplesTitle')}
            right={
              <View className="flex-row items-center gap-2">
                <Text className="text-[11px] text-ink-muted">{t('word.examplesCount', { count: sentences.length })}</Text>
                <LabelButton
                  icon={generating ? 'hourglass-empty' : 'refresh'}
                  label={generating ? t('word.regenerating') : t('word.regenerate')}
                  accessibilityLabel={t('word.regenerateHint')}
                  onPress={generating ? () => {} : regenerateExamples}
                />
              </View>
            }
          />
          {sentences.length === 0 && <EmptyState message={t('word.examplesEmpty')} />}
          {(expanded ? sentences : sentences.slice(0, FOLDED_EXAMPLES)).map((sentence) => (
            <View key={sentence.id} className="gap-2 rounded-2xl bg-surface-low p-3">
              <View className="flex-row items-start justify-between gap-2">
                <View className="flex-1">
                  <FuriganaText
                    markup={sentence.ja}
                    size={18}
                    showFurigana={settings.showFurigana}
                    className="text-ink"
                    targetClassName="font-bold bg-primary-soft"
                  />
                </View>
                <View className="flex-row gap-1">
                  <IconButton
                    icon="volume-up"
                    tone="quiet"
                    size={32}
                    label={t('word.listen')}
                    onPress={() => speakJapanese(furiganaToReading(sentence.ja))}
                  />
                  <StarButton
                    starred={Boolean(sentence.favorite)}
                    size={32}
                    label={t('word.favorite')}
                    onPress={() => toggleFavorite(sentence)}
                  />
                  <IconButton
                    icon="close"
                    tone="quiet"
                    size={32}
                    label={t('word.removeExample')}
                    onPress={() => removeExample(sentence)}
                  />
                </View>
              </View>
              <Text className="text-[13px] leading-5 text-ink-soft">
                {translationFor(sentence, settings.meaningLanguage)}
              </Text>
            </View>
          ))}
          {sentences.length > FOLDED_EXAMPLES && (
            <Pressable
              accessibilityRole="button"
              onPress={() => setExpanded(!expanded)}
              className="flex-row items-center justify-center gap-1 py-1 active:opacity-60">
              <Icon name={expanded ? 'expand-less' : 'expand-more'} size={18} color={colors.ink.soft} />
              <Text className="font-display-semibold text-[13px] text-ink-soft">
                {expanded ? t('word.showFewer') : t('word.showAllExamples', { count: sentences.length })}
              </Text>
            </Pressable>
          )}
          {(unseen > 0 || sentences.length > 0) && (
            <StampButton
              tone="quiet"
              icon={unseen === 0 ? 'check' : 'auto-awesome'}
              label={unseen === 0 ? t('word.noMoreExamples') : t('word.anotherExample')}
              disabled={unseen === 0}
              onPress={showAnotherExample}
            />
          )}
        </Card>

        {/* 5. Related words */}
        <Card>
          <SectionHeader title={t('word.relatedTitle')} />
          {groups.length === 0 ? (
            <EmptyState message={t('word.relatedEmpty')} />
          ) : (
            <View className="gap-4">
              {groups.map((group) => (
                <View key={group.kind} className="gap-2">
                  <View className="flex-row items-center gap-1">
                    <Icon
                      name={RELATION_ICON[group.kind]}
                      size={16}
                      color={group.kind === 'confusing' ? colors.error.DEFAULT : colors.primary.DEFAULT}
                    />
                    <Text className="font-display text-[12px] text-ink">{t(`relation.${group.kind}`)}</Text>
                  </View>
                  <TwoColumnGrid gap={8} columns={3}>
                    {group.words.map((other) => (
                      <RelatedCard
                        key={other.id}
                        word={other}
                        onPress={() => router.push({ pathname: '/word/[id]', params: { id: String(other.id) } })}
                      />
                    ))}
                  </TwoColumnGrid>
                </View>
              ))}
            </View>
          )}
        </Card>

        {/* Library actions */}
        {word.savedAt === null ? (
          <View className="flex-row gap-2">
            <StampButton icon="library-add" label={t('word.addToLibrary')} tone="primary" className="flex-1" onPress={toggleSaved} />
            {/* Not ready to save it yet: mark it as seen so it stops counting as new. */}
            {!word.isCustom ? (
              <StampButton
                icon={seen ? 'check' : 'visibility'}
                label={seen ? t('seen.seen') : t('seen.markSeen')}
                tone="quiet"
                className="flex-1"
                onPress={toggleSeen}
              />
            ) : null}
          </View>
        ) : (
          <View className="flex-row gap-2">
            <StampButton
              icon="edit"
              label={t('common.edit')}
              tone="ink"
              className="flex-1"
              onPress={() => router.push({ pathname: '/word-form', params: { id: String(word.id) } })}
            />
            {word.isCustom ? (
              <StampButton icon="delete-outline" label={t('common.delete')} tone="error" className="flex-1" onPress={confirmDelete} />
            ) : (
              <StampButton
                icon="bookmark-remove"
                label={t('word.removeFromLibrary')}
                tone="quiet"
                className="flex-1"
                onPress={toggleSaved}
              />
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

/** A related word as a small card: reading (with furigana on), the word, and its meaning. */
function RelatedCard({ word, onPress }: { word: Word; onPress: () => void }) {
  const { settings } = useSettings();
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`${word.word} ${word.reading}`}
      onPress={onPress}
      className="flex-1 rounded-2xl bg-surface-low p-2.5 active:opacity-70">
      {settings.showFurigana ? (
        <Text numberOfLines={1} className="h-[13px] text-[9px] font-semibold leading-[13px] tracking-wider text-primary">
          {word.reading !== word.word ? word.reading : ''}
        </Text>
      ) : null}
      <Text numberOfLines={1} adjustsFontSizeToFit className="text-[18px] font-bold leading-[24px] text-ink">
        {word.word}
      </Text>
      <Text numberOfLines={2} className="h-[30px] text-[11px] leading-[15px] text-ink-soft">
        {meaningFor(word, settings.meaningLanguage)}
      </Text>
    </Pressable>
  );
}
