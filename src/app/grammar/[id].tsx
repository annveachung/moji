import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/app-header';
import { CategoryPicker } from '@/components/category-picker';
import { StarButton } from '@/components/mascot';
import { Card, EmptyState, Icon, IconButton, Pill, SectionHeader, StampButton } from '@/components/ui';
import {
  deleteGrammarSentence,
  getGrammarRule,
  getGrammarSentences,
  saveGrammarSentence,
  setGrammarCategory,
  setGrammarStarred,
} from '@/db/grammar';
import type { GrammarRule, GrammarSentence } from '@/db/types';
import { showAlert } from '@/lib/alert';
import { generateGrammarSentence, type AiSentence } from '@/lib/ai';
import { isGrammarFunction } from '@/lib/categories';
import { aiErrorMessage } from '@/lib/ai-errors';
import { meaningFor, translationFor } from '@/lib/meaning';
import { speakJapanese } from '@/lib/speech';
import { useLayout } from '@/lib/layout';
import { useSettings } from '@/state/settings';
import { useSync } from '@/state/sync';
import colors from '@/theme/colors';

/**
 * Split a sentence so the grammar pattern can be highlighted: 〜ても → "ても".
 * Patterns like "〜ば／〜たら" use their first form.
 */
function highlight(sentence: string, pattern: string): { text: string; match: boolean }[] {
  const core = pattern.replace(/[〜～~]/g, '').split(/[／/、,]/)[0].trim();
  const at = core ? sentence.indexOf(core) : -1;
  if (at < 0) return [{ text: sentence, match: false }];
  return [
    { text: sentence.slice(0, at), match: false },
    { text: core, match: true },
    { text: sentence.slice(at + core.length), match: false },
  ];
}

/** One grammar rule: meaning, how it attaches, explanation, and your example sentences. */
export default function GrammarDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const ruleId = Number(id);
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const layout = useLayout();
  const { settings, updateSettings } = useSettings();
  const zh = settings.meaningLanguage === 'zh-TW';
  const [rule, setRule] = useState<GrammarRule | null | undefined>(undefined);
  const [sentences, setSentences] = useState<GrammarSentence[]>([]);

  const { dataVersion } = useSync();
  const [draft, setDraft] = useState<AiSentence | null>(null);
  const [picking, setPicking] = useState(false);
  const [generating, setGenerating] = useState(false);

  const load = useCallback(async () => {
    setRule(await getGrammarRule(db, ruleId));
    setSentences(await getGrammarSentences(db, ruleId));
  }, [db, ruleId, dataVersion]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (rule === undefined) return <View className="flex-1 bg-surface" />;
  if (rule === null) {
    return (
      <View className="flex-1 bg-surface">
        <AppHeader subtitle={t('grammar.title')} back kind="reading" />
        <View className="p-4">
          <EmptyState message={t('grammar.notFound')} />
        </View>
      </View>
    );
  }

  /** A new AI example, different from the ones already saved. You decide whether to keep it. */
  const generate = async () => {
    setGenerating(true);
    try {
      setDraft(
        await generateGrammarSentence({
          pattern: rule.pattern,
          meaning: rule.meaningEn || rule.meaningZh,
          formation: rule.formation,
          jlpt: rule.jlpt,
          avoid: [...sentences.map((s) => s.ja), ...(draft ? [draft.ja] : [])],
        }),
      );
    } catch (error) {
      showAlert(t('grammar.generate'), aiErrorMessage(t, error));
    } finally {
      setGenerating(false);
    }
  };

  const saveDraft = async () => {
    if (!draft) return;
    await saveGrammarSentence(db, rule.id, draft, 'ai');
    setDraft(null);
    load();
  };

  const confirmDelete = (sentence: GrammarSentence) =>
    showAlert(t('grammar.deleteSentence'), sentence.ja, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          await deleteGrammarSentence(db, sentence.id);
          load();
        },
      },
    ]);

  return (
    <View className="flex-1 bg-surface">
      <AppHeader subtitle={t('grammar.title')} back kind="reading" />
      <ScrollView
        contentContainerClassName="gap-4 py-4"
        contentContainerStyle={{ ...layout.page('reading'), paddingBottom: insets.bottom + 32 }}>
        {picking ? (
          <CategoryPicker
            kind="grammar"
            value={rule.category}
            onClose={() => setPicking(false)}
            onPick={async (category) => {
              setPicking(false);
              await setGrammarCategory(db, rule.id, isGrammarFunction(category) ? category : null);
              load();
            }}
          />
        ) : null}
        {/* The pattern and its meaning */}
        <View className="gap-3 rounded-[28px] bg-card p-5 shadow-md shadow-ink/10">
          <View className="flex-row items-center justify-between">
            <View className="flex-1 flex-row flex-wrap gap-1.5">
              {rule.jlpt !== null ? <Pill label={`JLPT N${rule.jlpt}`} tone="mustard" /> : null}
              {/* What the pattern does, chosen by the AI: tap to change it. */}
              <Pressable accessibilityRole="button" accessibilityLabel={t('categoryUi.change')} onPress={() => setPicking(true)}>
                <Pill label={t(`grammarFn.${rule.category ?? 'other'}`)} icon="edit" />
              </Pressable>
            </View>
            <View className="flex-row items-center gap-2">
              <StarButton
                starred={Boolean(rule.starredAt)}
                size={36}
                label={rule.starredAt ? t('grammar.unstar') : t('grammar.star')}
                onPress={async () => {
                  await setGrammarStarred(db, rule.id, rule.starredAt === null);
                  load();
                }}
              />
              <Pressable
                accessibilityRole="button"
                onPress={() => updateSettings({ meaningLanguage: zh ? 'en' : 'zh-TW' })}
                className="flex-row items-center gap-1 rounded-full bg-surface-high px-3 py-1.5 active:bg-primary-soft">
                <Icon name="translate" size={14} />
                <Text className="font-display text-[12px] text-ink">{zh ? 'EN' : '中文'}</Text>
              </Pressable>
            </View>
          </View>
          <Text className="text-center text-[36px] font-bold leading-[44px] text-ink">{rule.pattern}</Text>
          <View className="rounded-2xl bg-primary-soft/60 p-4">
            <Text className="mb-1 font-display text-[11px] tracking-wide text-primary">{t('grammar.meaning')}</Text>
            <Text className="text-[18px] font-bold leading-6 text-ink">{meaningFor(rule, settings.meaningLanguage)}</Text>
          </View>
        </View>

        {rule.formation ? (
          <Card>
            <SectionHeader title={t('grammar.formation')} accent="mustard" />
            <Text className="text-[15px] leading-6 text-ink">{rule.formation}</Text>
          </Card>
        ) : null}

        {rule.explanation ? (
          <Card>
            <SectionHeader title={t('grammar.explanation')} accent="matcha" />
            <Text className="text-[14px] leading-6 text-ink">{rule.explanation}</Text>
          </Card>
        ) : null}

        {/* Example sentences: from your spreadsheet, or AI ones you saved */}
        <Card>
          <SectionHeader
            title={t('grammar.examples')}
            right={<Text className="text-[11px] text-ink-muted">{t('grammar.sentences', { count: sentences.length })}</Text>}
          />
          {sentences.length === 0 ? <EmptyState message={t('grammar.examplesEmpty')} /> : null}
          {sentences.map((sentence) => (
            <View key={sentence.id} className="gap-1.5 rounded-2xl bg-surface-low p-3">
              <View className="flex-row items-start justify-between gap-2">
                <Text className="flex-1 text-[17px] leading-7 text-ink">
                  {highlight(sentence.ja, rule.pattern).map((part, i) => (
                    <Text key={i} className={part.match ? 'bg-primary-soft font-bold text-primary' : undefined}>
                      {part.text}
                    </Text>
                  ))}
                </Text>
                <View className="flex-row gap-1">
                  <IconButton icon="volume-up" size={32} label={t('word.listen')} onPress={() => speakJapanese(sentence.ja)} />
                  <IconButton icon="delete-outline" size={32} label={t('grammar.deleteSentence')} onPress={() => confirmDelete(sentence)} />
                </View>
              </View>
              {translationFor(sentence, settings.meaningLanguage) ? (
                <Text className="text-[13px] leading-5 text-ink-soft">{translationFor(sentence, settings.meaningLanguage)}</Text>
              ) : null}
              {sentence.source === 'ai' ? <Pill label={t('grammar.fromAi')} icon="auto-awesome" tone="primary" /> : null}
            </View>
          ))}

          {/* A sentence the AI just wrote: keep it or ask for another */}
          {draft ? (
            <View className="gap-2 rounded-2xl border border-primary/30 bg-primary-soft/40 p-3">
              <Pill label={t('grammarAi.new')} icon="auto-awesome" tone="primary" />
              <Text className="text-[17px] leading-7 text-ink">
                {highlight(draft.ja, rule.pattern).map((part, i) => (
                  <Text key={i} className={part.match ? 'font-bold text-primary' : undefined}>
                    {part.text}
                  </Text>
                ))}
              </Text>
              <Text className="text-[13px] leading-5 text-ink-soft">{zh ? draft.zh : draft.en}</Text>
              <View className="flex-row items-center gap-2">
                <IconButton icon="volume-up" size={32} label={t('word.listen')} onPress={() => speakJapanese(draft.ja)} />
                <View className="flex-1" />
                <Pressable accessibilityRole="button" disabled={generating} onPress={generate} className="rounded-full bg-card px-4 py-2 active:opacity-80">
                  <Text className="font-display-semibold text-[13px] text-ink">{t('grammarAi.another')}</Text>
                </Pressable>
                <Pressable accessibilityRole="button" onPress={saveDraft} className="flex-row items-center gap-1 rounded-full bg-primary px-4 py-2 active:opacity-80">
                  <Icon name="bookmark-add" size={16} color="#FFFFFF" />
                  <Text className="font-display-semibold text-[13px] text-white">{t('grammarAi.save')}</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          {generating ? (
            <View className="flex-row items-center justify-center gap-2 py-3">
              <ActivityIndicator color={colors.primary.DEFAULT} />
              <Text className="text-[13px] text-ink-soft">{t('grammarAi.generating')}</Text>
            </View>
          ) : draft ? null : (
            <StampButton label={t('grammar.generate')} icon="auto-awesome" tone="quiet" onPress={generate} />
          )}
        </Card>
      </ScrollView>
    </View>
  );
}
