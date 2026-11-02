import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Linking, Pressable, Text, View } from 'react-native';

import { findDuplicate, insertWord, setWordSaved } from '@/db/queries';
import { fillWord, getDailyReading, toWordInput, type ReadingItem } from '@/lib/ai';
import { aiErrorMessage } from '@/lib/ai-errors';
import { stripFurigana } from '@/lib/furigana';
import { speakJapanese } from '@/lib/speech';
import { useSettings } from '@/state/settings';
import { useSync } from '@/state/sync';
import colors from '@/theme/colors';

import { FuriganaText } from './furigana-text';
import { Card, Icon, IconButton, Pill, SectionHeader, type IconName } from './ui';

const KIND: Record<ReadingItem['kind'], { icon: IconName; label: 'reading.nhk' | 'reading.daily' }> = {
  nhk: { icon: 'newspaper', label: 'reading.nhk' },
  daily: { icon: 'local-library', label: 'reading.daily' },
};

/**
 * 今日の読みもの at the top of 文法: an NHK story rewritten in easy Japanese and a short
 * daily reading, both new every day (made by moji-api). Tap one to read it.
 */
export function DailyReading() {
  const { t } = useTranslation();
  const [items, setItems] = useState<ReadingItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<number | null>(null);

  const load = useCallback(() => {
    setError(null);
    getDailyReading()
      .then((reading) => setItems(reading.items))
      .catch((e) => setError(aiErrorMessage(t, e)));
  }, [t]);

  useEffect(load, [load]);

  return (
    <Card>
      <SectionHeader title={t('grammar.newsTitle')} right={<Icon name="auto-awesome" size={16} color={colors.primary.DEFAULT} />} />
      {items === null && error === null ? (
        <View className="flex-row items-center gap-2 py-2">
          <ActivityIndicator color={colors.primary.DEFAULT} />
          <Text className="text-[13px] text-ink-soft">{t('reading.loading')}</Text>
        </View>
      ) : null}
      {error !== null ? (
        <View className="flex-row items-center gap-3">
          <Text className="flex-1 text-[13px] leading-5 text-ink-soft">{t('reading.error')} {error}</Text>
          <Pressable accessibilityRole="button" onPress={load} className="rounded-full bg-surface-high px-3 py-1.5">
            <Text className="font-display-semibold text-[12px] text-ink">{t('reading.retry')}</Text>
          </Pressable>
        </View>
      ) : null}
      {items?.map((item, i) =>
        open === i ? (
          <ReadingPiece key={item.kind} item={item} onClose={() => setOpen(null)} />
        ) : (
          <Pressable
            key={item.kind}
            accessibilityRole="button"
            onPress={() => setOpen(i)}
            className="flex-row items-center gap-3 rounded-2xl bg-surface-low p-3 active:opacity-80">
            <Icon name={KIND[item.kind].icon} size={22} color={colors.primary.DEFAULT} />
            <View className="flex-1 gap-0.5">
              <Text className="font-display-semibold text-[11px] text-ink-muted">{t(KIND[item.kind].label)}</Text>
              <Text className="text-[15px] font-bold leading-5 text-ink" numberOfLines={2}>
                {stripFurigana(item.title)}
              </Text>
            </View>
            <Icon name="chevron-right" size={20} color={colors.ink.muted} />
          </Pressable>
        ),
      )}
    </Card>
  );
}

/** One reading, opened: furigana text, translation on demand, and its key words. */
function ReadingPiece({ item, onClose }: { item: ReadingItem; onClose: () => void }) {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const [showTranslation, setShowTranslation] = useState(false);
  const zh = settings.meaningLanguage === 'zh-TW';

  return (
    <View className="gap-3 rounded-2xl bg-surface-low p-4">
      <View className="flex-row items-center justify-between">
        <Pill icon={KIND[item.kind].icon} label={t(KIND[item.kind].label)} tone="primary" />
        <View className="flex-row gap-1">
          <IconButton icon="volume-up" size={32} label={t('word.listen')} onPress={() => speakJapanese(stripFurigana(item.body))} />
          <IconButton icon="expand-less" size={32} label={t('ai.dismiss')} onPress={onClose} />
        </View>
      </View>
      <FuriganaText markup={item.title} size={19} className="font-bold text-ink" showFurigana={settings.showFurigana} />
      <FuriganaText markup={item.body} size={17} className="text-ink" showFurigana={settings.showFurigana} />

      <Pressable accessibilityRole="button" onPress={() => setShowTranslation(!showTranslation)} className="self-start">
        <Text className="font-display-semibold text-[13px] text-primary">
          {showTranslation ? t('reading.hideTranslation') : t('reading.translation')}
        </Text>
      </Pressable>
      {showTranslation ? <Text className="text-[14px] leading-6 text-ink-soft">{zh ? item.zh : item.en}</Text> : null}

      {item.vocab.length > 0 ? (
        <View className="gap-2">
          <Text className="font-display text-[12px] text-ink">{t('reading.vocab')}</Text>
          {item.vocab.map((v) => (
            <VocabRow key={v.word} vocab={v} meaning={zh ? v.meaningZh : v.meaningEn} />
          ))}
        </View>
      ) : null}

      {item.sourceUrl ? (
        <Pressable accessibilityRole="link" onPress={() => Linking.openURL(item.sourceUrl!)}>
          <Text className="text-[11px] leading-4 text-ink-muted underline">{t('reading.source', { title: item.sourceTitle })}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** A key word from the reading, with a button to save it to 単語帳 (the AI fills in the rest). */
function VocabRow({ vocab, meaning }: { vocab: ReadingItem['vocab'][number]; meaning: string }) {
  const db = useSQLiteContext();
  const { t } = useTranslation();
  const [state, setState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setState('saving');
    setError(null);
    try {
      const existing = await findDuplicate(db, vocab.word, vocab.reading);
      if (existing?.savedAt) {
        setState('saved');
        return;
      }
      if (existing) {
        await setWordSaved(db, existing.id, true);
      } else {
        await insertWord(db, toWordInput(await fillWord(vocab.word)));
      }
      setState('saved');
    } catch (e) {
      setError(aiErrorMessage(t, e));
      setState('idle');
    }
  };

  return (
    <View className="flex-row items-center gap-3 rounded-xl bg-card px-3 py-2">
      <View className="flex-1">
        <Text className="text-[15px] font-bold text-ink">
          {vocab.word} <Text className="text-[12px] font-normal text-ink-soft">{vocab.reading}</Text>
        </Text>
        <Text className="text-[12px] text-ink-soft">{error ?? meaning}</Text>
      </View>
      {state === 'saving' ? (
        <ActivityIndicator color={colors.primary.DEFAULT} />
      ) : (
        <Pressable
          accessibilityRole="button"
          disabled={state === 'saved'}
          onPress={save}
          className={`flex-row items-center gap-1 rounded-full px-3 py-1.5 ${state === 'saved' ? 'bg-matcha-soft' : 'bg-primary-soft'}`}>
          <Icon name={state === 'saved' ? 'check' : 'add'} size={14} color={state === 'saved' ? colors.matcha.DEFAULT : colors.primary.DEFAULT} />
          <Text className={`font-display-semibold text-[12px] ${state === 'saved' ? 'text-matcha' : 'text-primary'}`}>
            {state === 'saved' ? t('reading.saved') : t('reading.save')}
          </Text>
        </Pressable>
      )}
    </View>
  );
}
