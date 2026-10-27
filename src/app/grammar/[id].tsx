import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/app-header';
import { Card, EmptyState, Icon, IconButton, Pill, SectionHeader, StampButton } from '@/components/ui';
import { deleteGrammarSentence, getGrammarRule, getGrammarSentences } from '@/db/grammar';
import type { GrammarRule, GrammarSentence } from '@/db/types';
import { meaningFor, translationFor } from '@/lib/meaning';
import { speakJapanese } from '@/lib/speech';
import { useSettings } from '@/state/settings';
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
  const { settings, updateSettings } = useSettings();
  const zh = settings.meaningLanguage === 'zh-TW';
  const [rule, setRule] = useState<GrammarRule | null | undefined>(undefined);
  const [sentences, setSentences] = useState<GrammarSentence[]>([]);

  const load = useCallback(async () => {
    setRule(await getGrammarRule(db, ruleId));
    setSentences(await getGrammarSentences(db, ruleId));
  }, [db, ruleId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (rule === undefined) return <View className="flex-1 bg-surface" />;
  if (rule === null) {
    return (
      <View className="flex-1 bg-surface">
        <AppHeader subtitle={t('grammar.title')} back />
        <View className="p-4">
          <EmptyState icon="search-off" message={t('grammar.notFound')} />
        </View>
      </View>
    );
  }

  const confirmDelete = (sentence: GrammarSentence) =>
    Alert.alert(t('grammar.deleteSentence'), sentence.ja, [
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
      <AppHeader subtitle={t('grammar.title')} back />
      <ScrollView
        contentContainerClassName="w-full max-w-[720px] self-center gap-4 p-4"
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
        {/* The pattern and its meaning */}
        <View className="gap-3 rounded-[28px] bg-card p-5 shadow-md shadow-ink/10">
          <View className="flex-row items-center justify-between">
            {rule.jlpt !== null ? <Pill label={`JLPT N${rule.jlpt}`} tone="mustard" /> : <View />}
            <Pressable
              accessibilityRole="button"
              onPress={() => updateSettings({ meaningLanguage: zh ? 'en' : 'zh-TW' })}
              className="flex-row items-center gap-1 rounded-full bg-surface-high px-3 py-1.5 active:bg-primary-soft">
              <Icon name="translate" size={14} />
              <Text className="font-display text-[12px] text-ink">{zh ? 'EN' : '中文'}</Text>
            </Pressable>
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
          {sentences.length === 0 ? <EmptyState icon="format-quote" message={t('grammar.examplesEmpty')} /> : null}
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

          {/* Generate (needs the AI server) */}
          <StampButton label={t('grammar.generate')} icon="auto-awesome" tone="quiet" disabled onPress={() => {}} />
          <View className="flex-row items-start gap-2 px-1">
            <Icon name="info-outline" size={14} color={colors.ink.muted} />
            <Text className="flex-1 text-[12px] leading-4 text-ink-muted">{t('grammar.generateSoon')}</Text>
          </View>
        </Card>
      </ScrollView>
    </View>
  );
}
