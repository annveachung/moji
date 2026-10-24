import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/app-header';
import { FuriganaText } from '@/components/furigana-text';
import { Card, EmptyState, Icon, IconButton, Pill, SectionHeader, StampButton, type IconName } from '@/components/ui';
import {
  countUnseenSentences,
  deleteWord,
  getRelatedWords,
  getShownSentences,
  getWord,
  revealNextSentence,
  setSentenceFavorite,
  setWordSaved,
  setWordStarred,
  updateWordNotes,
} from '@/db/queries';
import type { ChineseLinkKind, RelatedWord, Sentence, Word } from '@/db/types';
import { furiganaToReading } from '@/lib/furigana';
import { meaningFor, translationFor } from '@/lib/meaning';
import { toRomaji } from '@/lib/romaji';
import { speakJapanese } from '@/lib/speech';
import { useSettings } from '@/state/settings';
import colors from '@/theme/colors';

const ZH_LINK_STYLE: Record<ChineseLinkKind, { icon: IconName; tone: 'amber' | 'cream' | 'shu' }> = {
  same: { icon: 'check-circle', tone: 'amber' },
  nuance: { icon: 'info-outline', tone: 'cream' },
  'false-friend': { icon: 'warning', tone: 'shu' },
};

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
  const { settings, updateSettings } = useSettings();
  const zh = settings.meaningLanguage === 'zh-TW';

  const [word, setWord] = useState<Word | null | undefined>(undefined);
  const [sentences, setSentences] = useState<Sentence[]>([]);
  const [unseen, setUnseen] = useState(0);
  const [related, setRelated] = useState<RelatedWord[]>([]);
  const [notes, setNotes] = useState('');
  const [speed, setSpeed] = useState(1);

  const load = useCallback(async () => {
    const loaded = await getWord(db, wordId);
    setWord(loaded);
    if (!loaded) return;
    setNotes(loaded.notes);
    setRelated(await getRelatedWords(db, loaded));
    let shown = await getShownSentences(db, wordId);
    // First visit: reveal the first example so the section is never empty.
    if (shown.length === 0) {
      const first = await revealNextSentence(db, wordId);
      shown = first ? [first] : [];
    }
    setSentences(shown);
    setUnseen(await countUnseenSentences(db, wordId));
  }, [db, wordId]);

  // Reload when you come back, e.g. after editing the word.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (word === undefined) return <View className="flex-1 bg-cream" />;
  if (word === null) {
    return (
      <View className="flex-1 bg-cream">
        <AppHeader subtitle={t('word.title')} back />
        <View className="p-4">
          <EmptyState icon="search-off" message={t('word.notFound')} />
        </View>
      </View>
    );
  }

  const toggleSaved = async () => {
    await setWordSaved(db, word.id, word.savedAt === null);
    setWord(await getWord(db, word.id));
  };

  const toggleStar = async () => {
    await setWordStarred(db, word.id, word.starredAt === null);
    setWord(await getWord(db, word.id));
  };

  const confirmDelete = () =>
    Alert.alert(t('word.deleteConfirmTitle'), t('word.deleteConfirmBody'), [
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

  const showAnotherExample = async () => {
    const next = await revealNextSentence(db, word.id);
    if (next) setSentences((current) => [...current, next]);
    setUnseen(await countUnseenSentences(db, word.id));
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
    <View className="flex-1 bg-cream">
      <AppHeader subtitle={t('word.title')} back />
      <ScrollView
        contentContainerClassName="w-full max-w-[720px] self-center gap-4 p-4"
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        keyboardShouldPersistTaps="handled">
        {/* 1. The word itself */}
        <View className="rounded-[28px] bg-paper p-5 shadow-md shadow-sumi/10">
          <View className="flex-row items-center justify-between gap-2">
            <View className="flex-1 flex-row flex-wrap gap-1.5">
              <Pill label={word.jlpt ? t('jlpt.level', { level: word.jlpt }) : t('jlpt.none')} tone="amber" />
              {word.topic && <Pill label={t(`topic.${word.topic}`)} />}
            </View>
            <View className="flex-row items-center gap-1.5">
              <TogglePill
                label={t('word.furigana')}
                on={settings.showFurigana}
                onPress={() => updateSettings({ showFurigana: !settings.showFurigana })}
              />
              <TogglePill
                label={t('word.romaji')}
                on={settings.showRomaji}
                onPress={() => updateSettings({ showRomaji: !settings.showRomaji })}
              />
              <IconButton
                icon={word.starredAt ? 'star' : 'star-border'}
                tone={word.starredAt ? 'amber' : 'cream'}
                size={34}
                label={word.starredAt ? t('word.starred') : t('word.star')}
                onPress={toggleStar}
              />
            </View>
          </View>

          <View className="items-center gap-2 py-4">
            <FuriganaText
              markup={word.furigana}
              size={52}
              showFurigana={settings.showFurigana}
              className="font-bold text-sumi"
              containerClassName="justify-center"
            />
            {settings.showRomaji && (
              <Text className="font-display-medium text-[15px] tracking-widest text-sumi-light">
                {toRomaji(word.reading)}
              </Text>
            )}
            <Pill label={t(`pos.${word.pos}`)} tone="outline" />
          </View>

          <View className="flex-row items-center justify-between rounded-2xl bg-cream/70 p-2.5">
            <View className="flex-row items-center gap-2.5">
              <IconButton
                icon="volume-up"
                tone="sumi"
                label={t('word.listen')}
                onPress={() => speakJapanese(word.reading, speed)}
              />
              <Text className="font-display-semibold text-[14px] text-sumi">{t('word.listen')}</Text>
            </View>
            <View
              accessibilityLabel={t('word.speed')}
              className="flex-row gap-1 rounded-full bg-paper p-0.5">
              {[1, 0.7].map((value) => (
                <Pressable
                  key={value}
                  accessibilityRole="button"
                  accessibilityState={{ selected: speed === value }}
                  onPress={() => setSpeed(value)}
                  className={`rounded-full px-2.5 py-1 ${speed === value ? 'bg-amber' : ''}`}>
                  <Text className={`font-display-semibold text-[12px] ${speed === value ? 'text-sumi' : 'text-sumi-muted'}`}>
                    {value.toFixed(1)}x
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        {/* 2. Meaning, in one language at a time */}
        <Card>
          <SectionHeader
            title={t('word.meaningTitle')}
            right={
              <Pressable
                accessibilityRole="button"
                onPress={() => updateSettings({ meaningLanguage: zh ? 'en' : 'zh-TW' })}
                className="flex-row items-center gap-1 rounded-full bg-cream px-3 py-1.5 active:bg-amber">
                <Icon name="translate" size={14} />
                <Text className="font-display text-[12px] text-sumi">{zh ? 'EN' : '中文'}</Text>
              </Pressable>
            }
          />
          <View className="rounded-2xl bg-amber/35 p-4">
            <Text className="mb-1 font-display text-[11px] tracking-wide text-amber-deep">
              {zh ? '繁體中文' : 'English'}
            </Text>
            <Text className="text-[20px] font-bold leading-7 text-sumi">
              {meaningFor(word, settings.meaningLanguage)}
            </Text>
          </View>
        </Card>

        {/* 3. Connection to Chinese, and false-friend warnings */}
        {word.zhLinkKind && zhNote && (
          <Card className="overflow-hidden">
            <Text className="absolute -bottom-4 -right-2 rotate-12 text-[64px] font-bold text-sumi/5">辨析</Text>
            <SectionHeader
              title={t('word.zhTitle')}
              accent={word.zhLinkKind === 'false-friend' ? 'shu' : 'amber'}
              right={
                <Pill
                  label={t(`zhLink.${word.zhLinkKind}`)}
                  icon={ZH_LINK_STYLE[word.zhLinkKind].icon}
                  tone={ZH_LINK_STYLE[word.zhLinkKind].tone}
                />
              }
            />
            <Text className="text-[14px] leading-6 text-sumi">{zhNote}</Text>
          </Card>
        )}

        {/* 4. Example sentences */}
        <Card>
          <SectionHeader
            title={t('word.examplesTitle')}
            right={
              <Text className="text-[11px] text-sumi-muted">
                {t('word.examplesCount', { count: sentences.length })}
              </Text>
            }
          />
          {sentences.length === 0 && <EmptyState icon="auto-stories" message={t('word.examplesEmpty')} />}
          {sentences.map((sentence) => (
            <View key={sentence.id} className="gap-2 rounded-2xl bg-cream/60 p-3">
              <View className="flex-row items-start justify-between gap-2">
                <View className="flex-1">
                  <FuriganaText
                    markup={sentence.ja}
                    size={18}
                    showFurigana={settings.showFurigana}
                    className="text-sumi"
                    targetClassName="font-bold bg-amber/50"
                  />
                </View>
                <View className="flex-row gap-1">
                  <IconButton
                    icon="volume-up"
                    tone="cream"
                    size={32}
                    label={t('word.listen')}
                    onPress={() => speakJapanese(furiganaToReading(sentence.ja), speed)}
                  />
                  <IconButton
                    icon={sentence.favorite ? 'star' : 'star-border'}
                    tone="cream"
                    size={32}
                    label={t('word.favorite')}
                    onPress={() => toggleFavorite(sentence)}
                  />
                </View>
              </View>
              <Text className="text-[13px] leading-5 text-sumi-light">
                {translationFor(sentence, settings.meaningLanguage)}
              </Text>
            </View>
          ))}
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
            <EmptyState icon="hub" message={t('word.relatedEmpty')} />
          ) : (
            <View className="flex-row flex-wrap gap-2.5">
              {groups.map((group) => (
                <View
                  key={group.kind}
                  className="min-w-[46%] flex-1 gap-2 rounded-2xl bg-cream/60 p-3">
                  <View className="flex-row items-center gap-1">
                    <Icon
                      name={RELATION_ICON[group.kind]}
                      size={16}
                      color={group.kind === 'confusing' ? colors.shu.DEFAULT : colors.amber.dark}
                    />
                    <Text className="font-display text-[12px] text-sumi">{t(`relation.${group.kind}`)}</Text>
                  </View>
                  {group.words.map((other) => (
                    <Pressable
                      key={other.id}
                      accessibilityRole="link"
                      onPress={() => router.push({ pathname: '/word/[id]', params: { id: String(other.id) } })}
                      className="active:opacity-60">
                      <FuriganaText
                        markup={other.furigana}
                        size={17}
                        showFurigana={settings.showFurigana}
                        className="font-bold text-sumi"
                      />
                      <Text className="text-[12px] text-sumi-light">{meaningFor(other, settings.meaningLanguage)}</Text>
                    </Pressable>
                  ))}
                </View>
              ))}
            </View>
          )}
        </Card>

        {/* 6. Tags and personal notes */}
        <Card>
          <SectionHeader title={t('word.notesTitle')} />
          {word.tags.length > 0 && (
            <View className="flex-row flex-wrap gap-1.5">
              {word.tags.map((tag) => (
                <Pill key={tag} label={`#${tag}`} tone="outline" />
              ))}
            </View>
          )}
          {/* A sticky note, with a strip of washi tape on top. */}
          <View className="mt-2 flex-row items-start gap-2 rounded-xl bg-amber/30 p-3 pt-4">
            <View className="absolute -top-1.5 left-8 h-3 w-16 -rotate-2 rounded-sm bg-cream-dark/90" />
            <Icon name="sticky-note-2" size={18} color={colors.amber.deep} />
            <TextInput
              value={notes}
              onChangeText={setNotes}
              onEndEditing={() => updateWordNotes(db, word.id, notes)}
              placeholder={t('word.notesPlaceholder')}
              placeholderTextColor={colors.sumi.muted}
              multiline
              className="min-h-[60px] flex-1 text-[14px] leading-5 text-sumi"
            />
          </View>
        </Card>

        {/* Library actions */}
        {word.savedAt === null ? (
          <StampButton icon="library-add" label={t('word.addToLibrary')} tone="amber" onPress={toggleSaved} />
        ) : (
          <View className="flex-row gap-2">
            <StampButton
              icon="edit"
              label={t('common.edit')}
              tone="sumi"
              className="flex-1"
              onPress={() => router.push({ pathname: '/word-form', params: { id: String(word.id) } })}
            />
            {word.isCustom ? (
              <StampButton icon="delete-outline" label={t('common.delete')} tone="shu" className="flex-1" onPress={confirmDelete} />
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

function TogglePill({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: on }}
      onPress={onPress}
      hitSlop={6}
      className={`rounded-full px-2.5 py-1.5 ${on ? 'bg-sumi' : 'bg-cream'}`}>
      <Text className={`font-display text-[11px] ${on ? 'text-amber' : 'text-sumi-muted'}`}>{label}</Text>
    </Pressable>
  );
}

