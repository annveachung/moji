import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { WordCardFrame } from '@/components/ai-suggestions';
import { AppHeader } from '@/components/app-header';
import { FuriganaText } from '@/components/furigana-text';
import { EmptyState, Icon, IconButton, TwoColumnGrid } from '@/components/ui';
import { findDuplicate, getSavedWordKeys, getSetting, insertWord, setSetting, setWordSaved } from '@/db/queries';
import { generateWordSentences, type AiSentence } from '@/lib/ai';
import { aiErrorMessage } from '@/lib/ai-errors';
import { showAlert } from '@/lib/alert';
import { essentialKey, findEssentialGroup, type EssentialGroup, type EssentialWord } from '@/lib/essentials';
import { furiganaToReading } from '@/lib/furigana';
import { useLayout } from '@/lib/layout';
import { translationFor } from '@/lib/meaning';
import { speakJapanese } from '@/lib/speech';
import { useSettings } from '@/state/settings';
import { useSync } from '@/state/sync';
import colors from '@/theme/colors';

/**
 * One 基本のことば group (接続詞, 〜人…): its fixed words in order, as an even grid of word
 * cards. Tap a word to hear it, 例文 for AI example sentences, ＋ to save it.
 */
export default function EssentialsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const group = findEssentialGroup(id);
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const layout = useLayout();
  const { dataVersion } = useSync();
  const [savedKeys, setSavedKeys] = useState<Set<string> | null>(null);
  const [examplesFor, setExamplesFor] = useState<EssentialWord | null>(null);

  const load = useCallback(() => {
    getSavedWordKeys(db).then(setSavedKeys);
  }, [db, dataVersion]);
  useFocusEffect(load);

  if (!group) {
    return (
      <View className="flex-1 bg-surface">
        <AppHeader subtitle={t('nav.explore')} back kind="reading" />
        <View className="p-4">
          <EmptyState message={t('explore.empty')} />
        </View>
      </View>
    );
  }

  const title = t(`essentials.${group.id}`);
  const saved = savedKeys ? group.words.filter((w) => savedKeys.has(essentialKey(w))).length : 0;

  return (
    <View className="flex-1 bg-surface">
      <AppHeader subtitle={title} back kind="reading" />
      <ScrollView
        contentContainerClassName="gap-3"
        contentContainerStyle={{ ...layout.page('list'), paddingBottom: insets.bottom + 24 }}>
        <View className="mb-1 gap-2 pt-3">
          <View className="flex-row items-center gap-3">
            <View className="h-11 w-11 items-center justify-center rounded-full bg-primary-soft">
              <Icon name={group.icon} size={22} color={colors.primary.DEFAULT} />
            </View>
            <View className="flex-1">
              <Text className="font-display text-[20px] text-ink">{title}</Text>
              <Text className="font-display-medium text-[12px] text-ink-muted">
                {t('explore.progress', { saved, total: group.words.length })}
              </Text>
            </View>
          </View>
          <Text className="text-[13px] leading-5 text-ink-soft">{t(`essentials.${group.id}Body`)}</Text>
        </View>
        <TwoColumnGrid columns={layout.size === 'wide' ? 5 : layout.size === 'medium' ? 4 : 2}>
          {group.words.map((word) => (
            <EssentialCard
              key={essentialKey(word)}
              word={word}
              group={group}
              saved={savedKeys?.has(essentialKey(word)) ?? false}
              onSaved={load}
              onExamples={() => setExamplesFor(word)}
            />
          ))}
        </TwoColumnGrid>
      </ScrollView>
      {examplesFor ? <ExamplesSheet word={examplesFor} onClose={() => setExamplesFor(null)} /> : null}
    </View>
  );
}

/**
 * One word, the same small card as the rest of ことば (cards line up in an even grid).
 * Tap it to hear the word; 例文 opens example sentences; ＋ saves it.
 */
function EssentialCard({
  word,
  group,
  saved,
  onSaved,
  onExamples,
}: {
  word: EssentialWord;
  group: EssentialGroup;
  saved: boolean;
  onSaved: () => void;
  onExamples: () => void;
}) {
  const db = useSQLiteContext();
  const { t } = useTranslation();
  const { settings } = useSettings();
  const [saving, setSaving] = useState(false);
  const zh = settings.meaningLanguage === 'zh-TW';

  const save = async () => {
    setSaving(true);
    try {
      const existing = await findDuplicate(db, word.word, word.reading);
      if (existing) {
        if (!existing.savedAt) await setWordSaved(db, existing.id, true);
      } else {
        // Example sentences you've already seen for it go along (the first one).
        const stored = await getSetting(db, sentencesKey(word));
        const example = stored ? (JSON.parse(stored) as AiSentence[])[0] : undefined;
        await insertWord(db, {
          word: word.word,
          reading: word.reading,
          meaningEn: word.en,
          meaningZh: word.zh,
          pos: word.pos,
          jlpt: word.jlpt,
          topic: group.topic,
          notes: '',
          starred: false,
          example: example ? { ja: example.ja, translation: example.en, en: example.en, zh: example.zh } : null,
        });
      }
      onSaved();
    } catch {
      showAlert(t('explore.save'), t('essentials.saveError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <WordCardFrame
      reading={word.reading}
      word={word.word}
      meaning={zh ? word.zh : word.en}
      jlpt={word.jlpt}
      onPress={() => speakJapanese(word.reading)}
      action={
        <View className="flex-row items-center gap-1.5">
          <IconButton icon="format-quote" tone="quiet" size={30} label={t('essentials.examples')} onPress={onExamples} />
          {saving ? (
            <View className="h-[30px] w-[30px] items-center justify-center">
              <ActivityIndicator size="small" color={colors.primary.DEFAULT} />
            </View>
          ) : saved ? (
            <View className="h-[30px] w-[30px] items-center justify-center rounded-full bg-matcha-soft">
              <Icon name="check" size={16} color={colors.matcha.DEFAULT} />
            </View>
          ) : (
            <IconButton icon="add" tone="soft" size={30} label={t('explore.save')} onPress={save} />
          )}
        </View>
      }
    />
  );
}

const sentencesKey = (word: EssentialWord) => `essentials.sentences.${essentialKey(word)}`;

/**
 * 例文: the word, its meaning and note, and three AI example sentences showing how it's used.
 * They're kept on this device; 別の例文 makes new ones.
 */
function ExamplesSheet({ word, onClose }: { word: EssentialWord; onClose: () => void }) {
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { settings } = useSettings();
  const [sentences, setSentences] = useState<AiSentence[] | null>(null);
  const [generating, setGenerating] = useState(false);
  const zh = settings.meaningLanguage === 'zh-TW';
  const note = zh ? word.noteZh : word.noteEn;

  const generate = useCallback(
    async (avoid: AiSentence[]) => {
      setGenerating(true);
      try {
        const fresh = await generateWordSentences({
          word: word.word,
          reading: word.reading,
          meaning: word.en,
          avoid: avoid.map((s) => s.ja),
        });
        await setSetting(db, sentencesKey(word), JSON.stringify(fresh));
        setSentences(fresh);
      } catch (error) {
        showAlert(t('essentials.examples'), aiErrorMessage(t, error));
      } finally {
        setGenerating(false);
      }
    },
    [db, t, word],
  );

  // The ones kept from last time, or new ones the first time.
  useEffect(() => {
    getSetting(db, sentencesKey(word)).then((stored) => {
      if (stored) setSentences(JSON.parse(stored) as AiSentence[]);
      else generate([]);
    });
  }, [db, word, generate]);

  return (
    <Modal animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View className="flex-1 bg-surface">
        <View className="flex-row items-center justify-between px-4 py-3">
          <View className="w-14" />
          <Text className="font-display text-[16px] text-ink">{t('essentials.examples')}</Text>
          <Pressable accessibilityRole="button" hitSlop={10} onPress={onClose} className="w-14 items-end">
            <Text className="text-[16px] font-semibold text-primary">{t('common.done')}</Text>
          </Pressable>
        </View>
        <ScrollView
          contentContainerClassName="w-full max-w-[720px] self-center gap-3 p-4"
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
          <Pressable
            accessibilityRole="button"
            onPress={() => speakJapanese(word.reading)}
            className="gap-1 rounded-2xl bg-card p-4 shadow-sm shadow-ink/10 active:opacity-80">
            {word.reading !== word.word ? (
              <Text className="text-[12px] font-semibold tracking-wider text-primary">{word.reading}</Text>
            ) : null}
            <View className="flex-row items-center gap-2">
              <Text className="text-[28px] font-bold text-ink">{word.word}</Text>
              <Icon name="volume-up" size={20} color={colors.ink.muted} />
            </View>
            <Text className="text-[15px] text-ink">{zh ? word.zh : word.en}</Text>
            {note ? <Text className="text-[13px] leading-5 text-ink-soft">{note}</Text> : null}
          </Pressable>

          {sentences === null || generating ? (
            <View className="flex-row items-center gap-2 px-1 py-2">
              <ActivityIndicator size="small" color={colors.primary.DEFAULT} />
              <Text className="text-[13px] text-ink-muted">{t('essentials.generating')}</Text>
            </View>
          ) : (
            sentences.map((sentence) => (
              <View key={sentence.ja} className="flex-row items-start gap-2 rounded-2xl bg-card p-3.5 shadow-sm shadow-ink/10">
                <View className="flex-1 gap-1">
                  <FuriganaText
                    markup={sentence.ja}
                    size={17}
                    showFurigana={settings.showFurigana}
                    className="text-ink"
                    targetClassName="font-bold text-primary"
                  />
                  <Text className="text-[13px] leading-[18px] text-ink-soft">{translationFor(sentence, settings.meaningLanguage)}</Text>
                </View>
                <IconButton
                  icon="volume-up"
                  tone="quiet"
                  size={32}
                  label={t('word.listen')}
                  onPress={() => speakJapanese(furiganaToReading(sentence.ja))}
                />
              </View>
            ))
          )}
          {sentences !== null && !generating ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => generate(sentences)}
              hitSlop={6}
              className="flex-row items-center gap-1 self-start px-1">
              <Icon name="refresh" size={15} color={colors.primary.DEFAULT} />
              <Text className="font-display-semibold text-[13px] text-primary">{t('essentials.newExamples')}</Text>
            </Pressable>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  );
}
