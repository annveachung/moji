import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/app-header';
import { FuriganaText } from '@/components/furigana-text';
import { Card, EmptyState, Icon, IconButton, Pill, SectionHeader, type IconName } from '@/components/ui';
import {
  countUnseenSentences,
  getCard,
  getRelatedWords,
  getShownSentences,
  getWord,
  revealNextSentence,
  setSentenceFavorite,
  setWordSaved,
  updateWordNotes,
} from '@/db/queries';
import type { ChineseLinkKind, RelatedWord, Sentence, Word } from '@/db/types';
import { furiganaToReading } from '@/lib/furigana';
import { toRomaji } from '@/lib/romaji';
import { speakJapanese } from '@/lib/speech';
import { learnWord } from '@/lib/srs';
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
  const [inDeck, setInDeck] = useState(false);
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
    setInDeck((await getCard(db, wordId)) !== null);
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

  useEffect(() => {
    load();
  }, [load]);

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

  const addToDeck = async () => {
    await learnWord(db, word.id);
    setInDeck(true);
    setWord(await getWord(db, word.id));
  };

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
        <View className="overflow-hidden rounded-card border border-amber/60 bg-cream-light p-5 shadow-sm shadow-sumi/10">
          <View className="absolute inset-x-0 top-0 h-1.5 flex-row">
            <View className="flex-1 bg-amber" />
            <View className="flex-1 bg-sumi" />
            <View className="flex-1 bg-amber" />
          </View>

          <View className="mt-1 flex-row items-center justify-between gap-2">
            <View className="flex-1 flex-row flex-wrap gap-1.5">
              <View className="-rotate-2">
                <Pill
                  label={word.jlpt ? `印 ${t('jlpt.level', { level: word.jlpt })}` : t('jlpt.none')}
                  tone="amber"
                />
              </View>
              {word.topic && <Pill label={t(`topic.${word.topic}`)} />}
            </View>
            <View className="flex-row items-center gap-1.5">
              <TogglePill
                label="ふりがな"
                on={settings.showFurigana}
                onPress={() => updateSettings({ showFurigana: !settings.showFurigana })}
              />
              <TogglePill
                label="Romaji"
                on={settings.showRomaji}
                onPress={() => updateSettings({ showRomaji: !settings.showRomaji })}
              />
              <IconButton
                icon={word.savedAt ? 'bookmark' : 'bookmark-border'}
                tone={word.savedAt ? 'amber' : 'cream'}
                size={34}
                label={word.savedAt ? t('word.saved') : t('word.save')}
                onPress={toggleSaved}
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
              <View className="rounded-full border border-amber/60 bg-cream px-3.5 py-0.5">
                <Text className="text-[14px] font-semibold text-sumi">[ {toRomaji(word.reading)} ]</Text>
              </View>
            )}
            <Pill label={t(`pos.${word.pos}`)} tone="outline" />
          </View>

          <View className="flex-row items-center justify-between rounded-xl border border-amber/50 bg-cream p-2.5">
            <View className="flex-row items-center gap-2.5">
              <IconButton
                icon="volume-up"
                label={t('word.listen')}
                onPress={() => speakJapanese(word.reading, speed)}
              />
              <Text className="text-[14px] font-bold text-sumi">{t('word.listen')}</Text>
            </View>
            <View
              accessibilityLabel={t('word.speed')}
              className="flex-row gap-1 rounded-full border border-amber/50 bg-cream-light p-0.5">
              {[1, 0.7].map((value) => (
                <Pressable
                  key={value}
                  accessibilityRole="button"
                  accessibilityState={{ selected: speed === value }}
                  onPress={() => setSpeed(value)}
                  className={`rounded-full px-2.5 py-1 ${speed === value ? 'bg-amber' : ''}`}>
                  <Text className={`text-[12px] ${speed === value ? 'font-bold text-sumi' : 'text-sumi-muted'}`}>
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
            icon="menu-book"
            title={t('word.meaningTitle')}
            right={
              <Pressable
                accessibilityRole="button"
                onPress={() => updateSettings({ meaningLanguage: zh ? 'en' : 'zh-TW' })}
                className="flex-row items-center gap-1 rounded-full border border-sumi/20 bg-cream px-3 py-1 active:bg-amber">
                <Icon name="translate" size={14} />
                <Text className="text-[12px] font-bold text-sumi">{zh ? 'EN' : '中文'}</Text>
              </Pressable>
            }
          />
          <View className="rounded-xl border-2 border-amber bg-amber/35 p-3.5">
            <Text className="mb-1 text-[11px] font-bold tracking-wide text-sumi">
              {zh ? '繁體中文' : 'English'}
            </Text>
            <Text className="text-[20px] font-bold leading-7 text-sumi">
              {zh ? word.meaningZh : word.meaningEn}
            </Text>
          </View>
        </Card>

        {/* 3. Connection to Chinese, and false-friend warnings */}
        {word.zhLinkKind && zhNote && (
          <View className="gap-3 overflow-hidden rounded-card border-2 border-amber bg-cream-light p-4">
            <Text className="absolute -bottom-4 -right-2 rotate-12 text-[64px] font-bold text-sumi/5">辨析</Text>
            <View className="flex-row items-center justify-between gap-2">
              <View className="flex-row items-center gap-2">
                <View className="h-6 w-6 items-center justify-center rounded-full bg-sumi">
                  <Text className="text-[12px] font-bold text-amber">辨</Text>
                </View>
                <Text className="text-[17px] font-bold text-sumi">{t('word.zhTitle')}</Text>
              </View>
              <Pill
                label={t(`zhLink.${word.zhLinkKind}`)}
                icon={ZH_LINK_STYLE[word.zhLinkKind].icon}
                tone={ZH_LINK_STYLE[word.zhLinkKind].tone}
              />
            </View>
            <Text className="text-[14px] leading-6 text-sumi">{zhNote}</Text>
          </View>
        )}

        {/* 4. Example sentences */}
        <Card>
          <SectionHeader
            icon="auto-stories"
            title={t('word.examplesTitle')}
            right={
              <Text className="text-[11px] text-sumi-muted">
                {t('word.examplesCount', { count: sentences.length })}
              </Text>
            }
          />
          {sentences.map((sentence) => (
            <View key={sentence.id} className="gap-2 rounded-xl border border-amber/50 bg-cream p-3">
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
              <Text className="border-t border-amber/30 pt-1.5 text-[13px] text-sumi-light">
                {zh ? sentence.zh : sentence.en}
              </Text>
            </View>
          ))}
          <Pressable
            accessibilityRole="button"
            disabled={unseen === 0}
            onPress={showAnotherExample}
            className={`flex-row items-center justify-center gap-2 rounded-xl border-2 border-amber bg-cream px-4 py-2.5 active:bg-amber/30 ${
              unseen === 0 ? 'opacity-50' : ''
            }`}>
            <Icon name={unseen === 0 ? 'check' : 'auto-awesome'} size={18} />
            <Text className="text-[14px] font-bold text-sumi">
              {unseen === 0 ? t('word.noMoreExamples') : t('word.anotherExample')}
            </Text>
          </Pressable>
        </Card>

        {/* 5. Related words */}
        <Card>
          <SectionHeader icon="hub" title={t('word.relatedTitle')} />
          {groups.length === 0 ? (
            <EmptyState icon="hub" message={t('word.relatedEmpty')} />
          ) : (
            <View className="flex-row flex-wrap gap-2.5">
              {groups.map((group) => (
                <View
                  key={group.kind}
                  className="min-w-[46%] flex-1 gap-2 rounded-xl border border-amber/50 bg-cream p-3">
                  <View className="flex-row items-center gap-1">
                    <Icon
                      name={RELATION_ICON[group.kind]}
                      size={16}
                      color={group.kind === 'confusing' ? colors.shu.DEFAULT : colors.amber.dark}
                    />
                    <Text className="text-[12px] font-bold text-sumi">{t(`relation.${group.kind}`)}</Text>
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
                      <Text className="text-[12px] text-sumi-light">{zh ? other.meaningZh : other.meaningEn}</Text>
                    </Pressable>
                  ))}
                </View>
              ))}
            </View>
          )}
        </Card>

        {/* 6. Tags and personal notes */}
        <Card>
          <SectionHeader icon="edit-note" title={t('word.notesTitle')} />
          {word.tags.length > 0 && (
            <View className="flex-row flex-wrap gap-1.5">
              {word.tags.map((tag) => (
                <Pill key={tag} label={`#${tag}`} tone="outline" />
              ))}
            </View>
          )}
          <View className="flex-row items-start gap-2 rounded-xl border border-amber/60 bg-cream p-3">
            <Icon name="sticky-note-2" size={18} color={colors.amber.dark} />
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

        {/* Main action */}
        <Pressable
          accessibilityRole="button"
          disabled={inDeck}
          onPress={addToDeck}
          className={`flex-row items-center justify-center gap-2 rounded-xl px-4 py-3.5 shadow-md shadow-sumi/20 ${
            inDeck ? 'bg-sumi' : 'border border-sumi/30 bg-amber active:bg-amber-hover'
          }`}>
          <Icon
            name={inDeck ? 'check-circle' : 'style'}
            size={20}
            color={inDeck ? colors.amber.DEFAULT : colors.sumi.DEFAULT}
          />
          <Text className={`text-[15px] font-bold ${inDeck ? 'text-amber' : 'text-sumi'}`}>
            {inDeck ? t('word.inDeck') : t('word.addToDeck')}
          </Text>
        </Pressable>
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
      className={`rounded-full border px-2.5 py-1 ${on ? 'border-sumi/20 bg-amber' : 'border-sumi/20 bg-cream'}`}>
      <Text className={`text-[11px] font-bold ${on ? 'text-sumi' : 'text-sumi-muted'}`}>{label}</Text>
    </Pressable>
  );
}
