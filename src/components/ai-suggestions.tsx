import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import {
  findDuplicate,
  getRecentlyAdded,
  getSavedWordKeys,
  getSavedWordList,
  getSetting,
  insertWord,
  setSetting,
  setWordSaved,
} from '@/db/queries';
import { fillWord, suggestWords, toWordInput, type SuggestedWord, type SuggestionKind } from '@/lib/ai';
import { aiErrorMessage } from '@/lib/ai-errors';
import { showAlert } from '@/lib/alert';
import { useLayout } from '@/lib/layout';
import { meaningFor } from '@/lib/meaning';
import { speakJapanese } from '@/lib/speech';
import { useSettings } from '@/state/settings';
import { useSync } from '@/state/sync';
import colors from '@/theme/colors';

import { Icon, IconButton } from './ui';

/**
 * AI word suggestions for ことば (あなたへのおすすめ and 漢字でわかる上級語).
 * Generating asks moji-api for words you don't have yet and haven't just been shown;
 * the latest list is kept on this device, so it's still there next time you open the tab.
 */
export function useAiSuggestions(kind: SuggestionKind, dataVersion: number) {
  const db = useSQLiteContext();
  const { t } = useTranslation();
  const { settings } = useSettings();
  const key = `explore.ai.${kind}`;
  const [words, setWords] = useState<SuggestedWord[] | null>(null);
  const [savedKeys, setSavedKeys] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState(false);

  const reload = useCallback(async () => {
    const stored = await getSetting(db, key);
    try {
      setWords(stored ? (JSON.parse(stored) as SuggestedWord[]) : null);
    } catch {
      setWords(null);
    }
    setSavedKeys(await getSavedWordKeys(db));
  }, [db, key, dataVersion]);

  useEffect(() => {
    reload();
  }, [reload]);

  const generate = async () => {
    setGenerating(true);
    try {
      const recent = await getRecentlyAdded(db, 40);
      const library = recent.map((w) => ({ word: w.word, meaning: meaningFor(w, settings.meaningLanguage), jlpt: w.jlpt }));
      // Leave out everything you have, and what this list showed last time, so each press is new.
      const exclude = [...(await getSavedWordList(db)), ...(words ?? []).map((w) => w.word)];
      const { words: fresh } = await suggestWords(kind, library, exclude);
      await setSetting(db, key, JSON.stringify(fresh));
      setWords(fresh);
    } catch (error) {
      showAlert(t('explore.generate'), aiErrorMessage(t, error));
    } finally {
      setGenerating(false);
    }
  };

  return { words, savedKeys, generating, generate, reload };
}

/** The "AIで生成 / 新しく生成" button in a section header. */
export function GenerateButton({ hasList, generating, onPress }: { hasList: boolean; generating: boolean; onPress: () => void }) {
  const { t } = useTranslation();
  return (
    <Pressable
      accessibilityRole="button"
      disabled={generating}
      onPress={onPress}
      className={`flex-row items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1.5 active:opacity-80 ${generating ? 'opacity-60' : ''}`}>
      {generating ? (
        <ActivityIndicator size="small" color={colors.primary.DEFAULT} />
      ) : (
        <Icon name={hasList ? 'refresh' : 'auto-awesome'} size={15} color={colors.primary.DEFAULT} />
      )}
      <Text className="font-display-semibold text-[12px] text-primary">
        {generating ? t('explore.generating') : hasList ? t('explore.regenerate') : t('explore.generate')}
      </Text>
    </Pressable>
  );
}

/** AI-suggested words: a sideways row on phones, a wrapping grid on wider screens. */
export function AiWordStrip({ words, savedKeys, onSaved }: { words: SuggestedWord[]; savedKeys: Set<string>; onSaved: () => void }) {
  const { gutter, isCompact } = useLayout();
  const cards = words.map((word) => (
    <AiWordCard key={word.word} word={word} saved={savedKeys.has(`${word.word}|${word.reading}`)} onSaved={onSaved} />
  ));
  if (!isCompact) return <View className="flex-row flex-wrap gap-3 pb-2">{cards}</View>;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ marginHorizontal: -gutter }}
      contentContainerStyle={{ paddingHorizontal: gutter }}
      contentContainerClassName="gap-3 pb-2">
      {cards}
    </ScrollView>
  );
}

/** One suggestion: tap to hear it, ＋ to save it (the AI fills in an example and a topic). */
function AiWordCard({ word, saved, onSaved }: { word: SuggestedWord; saved: boolean; onSaved: () => void }) {
  const db = useSQLiteContext();
  const { t } = useTranslation();
  const { settings } = useSettings();
  const [saving, setSaving] = useState(false);
  const kanaOnly = word.reading === word.word;

  const save = async () => {
    setSaving(true);
    try {
      const existing = await findDuplicate(db, word.word, word.reading);
      if (existing) {
        // Already in moji (a starter word, or saved before): just put it in your library.
        if (!existing.savedAt) await setWordSaved(db, existing.id, true);
      } else {
        await insertWord(db, toWordInput(await fillWord(word.word)));
      }
      onSaved();
    } catch (error) {
      showAlert(t('explore.save'), aiErrorMessage(t, error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${word.word} ${word.reading}`}
      onPress={() => speakJapanese(word.reading)}
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
        {word.reason ? (
          <Text numberOfLines={2} className="mt-1 text-[10px] leading-[13px] text-ink-muted">
            {word.reason}
          </Text>
        ) : null}
      </View>
      <View className="flex-row items-center justify-between">
        <Text className="font-display text-[10px] text-ink-muted">{word.jlpt > 0 ? `N${word.jlpt}` : ''}</Text>
        {saving ? (
          <ActivityIndicator size="small" color={colors.primary.DEFAULT} />
        ) : saved ? (
          <View className="h-[30px] w-[30px] items-center justify-center rounded-full bg-matcha-soft">
            <Icon name="check" size={16} color={colors.matcha.DEFAULT} />
          </View>
        ) : (
          <IconButton icon="add" tone="soft" size={30} label={t('explore.save')} onPress={save} />
        )}
      </View>
    </Pressable>
  );
}
