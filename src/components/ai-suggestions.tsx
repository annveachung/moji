import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
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

import { Icon, IconButton, TwoColumnGrid } from './ui';

/**
 * AI word suggestions for ことば (おすすめ and 漢字).
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
  // false until the stored list has been read (words is null both before that and when there's none).
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(async () => {
    const stored = await getSetting(db, key);
    try {
      setWords(stored ? (JSON.parse(stored) as SuggestedWord[]) : null);
    } catch {
      setWords(null);
    }
    setSavedKeys(await getSavedWordKeys(db));
    setLoaded(true);
  }, [db, key, dataVersion]);

  useEffect(() => {
    reload();
  }, [reload]);

  /** quiet: no error message (the automatic first list; the button still says what went wrong). */
  const generate = async ({ quiet = false }: { quiet?: boolean } = {}) => {
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
      if (!quiet) showAlert(t('explore.generate'), aiErrorMessage(t, error));
    } finally {
      setGenerating(false);
    }
  };

  return { words, loaded, savedKeys, generating, generate, reload };
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

/**
 * A row of small word cards, all the same size: it scrolls sideways on phones, and is an
 * even grid on wider screens (sideways scrolling is awkward with a mouse).
 */
export function CardRow({ children }: { children: ReactNode[] }) {
  const { gutter, size } = useLayout();
  if (size !== 'compact') return <TwoColumnGrid columns={size === 'wide' ? 5 : 4}>{children}</TwoColumnGrid>;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      // Let cards run edge to edge while lining up with the page's padding.
      style={{ marginHorizontal: -gutter }}
      contentContainerStyle={{ paddingHorizontal: gutter }}
      contentContainerClassName="gap-3 pb-2">
      {children.map((child, i) => (
        <View key={i} className="w-[156px]">
          {child}
        </View>
      ))}
    </ScrollView>
  );
}

/** AI-suggested words. showReason: the AI's short note (漢字 shows the matching Chinese word). */
export function AiWordStrip({
  words,
  savedKeys,
  onSaved,
  showReason = false,
}: {
  words: SuggestedWord[];
  savedKeys: Set<string>;
  onSaved: () => void;
  showReason?: boolean;
}) {
  return (
    <CardRow>
      {words.map((word) => (
        <AiWordCard
          key={word.word}
          word={word}
          saved={savedKeys.has(`${word.word}|${word.reading}`)}
          onSaved={onSaved}
          showReason={showReason}
        />
      ))}
    </CardRow>
  );
}

/** One suggestion: tap to hear it, ＋ to save it (the AI fills in an example and a topic). */
function AiWordCard({
  word,
  saved,
  onSaved,
  showReason,
}: {
  word: SuggestedWord;
  saved: boolean;
  onSaved: () => void;
  showReason: boolean;
}) {
  const db = useSQLiteContext();
  const { t } = useTranslation();
  const { settings } = useSettings();
  const [saving, setSaving] = useState(false);

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
    <WordCardFrame
      reading={word.reading}
      word={word.word}
      meaning={meaningFor(word, settings.meaningLanguage)}
      note={showReason ? word.reason : undefined}
      jlpt={word.jlpt > 0 ? word.jlpt : null}
      onPress={() => speakJapanese(word.reading)}
      action={
        saving ? (
          <ActivityIndicator size="small" color={colors.primary.DEFAULT} />
        ) : saved ? (
          <View className="h-[30px] w-[30px] items-center justify-center rounded-full bg-matcha-soft">
            <Icon name="check" size={16} color={colors.matcha.DEFAULT} />
          </View>
        ) : (
          <IconButton icon="add" tone="soft" size={30} label={t('explore.save')} onPress={save} />
        )
      }
    />
  );
}

/**
 * The small word card used in ことば. Every part has a fixed place (reading line, word,
 * two lines of meaning, an optional note, then level and button at the bottom), so cards
 * side by side line up exactly.
 */
export function WordCardFrame({
  reading,
  word,
  meaning,
  note,
  jlpt,
  newLabel,
  onPress,
  action,
}: {
  reading: string;
  word: string;
  meaning: string;
  note?: string;
  jlpt: number | null;
  /** Shown in place of the level when the word is new to you (e.g. 新). */
  newLabel?: string;
  onPress: () => void;
  action: ReactNode;
}) {
  const { settings } = useSettings();
  // The card's buttons sit beside the tappable part, not inside it (a button can't hold another).
  return (
    <View className="flex-1 gap-2 rounded-2xl bg-card p-3 shadow-md shadow-ink/10">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${word} ${reading}`}
        onPress={onPress}
        className="flex-1 active:opacity-70">
        {settings.showFurigana ? (
          <Text numberOfLines={1} className="h-[14px] text-[10px] font-semibold leading-[14px] tracking-wider text-primary">
            {reading !== word ? reading : ''}
          </Text>
        ) : null}
        <Text numberOfLines={1} adjustsFontSizeToFit className="text-[22px] font-bold leading-[30px] text-ink">
          {word}
        </Text>
        <Text numberOfLines={2} className="h-8 text-[12px] leading-4 text-ink-soft">
          {meaning}
        </Text>
        {note ? (
          <Text numberOfLines={1} className="mt-1 text-[10px] leading-[13px] text-ink-muted">
            {note}
          </Text>
        ) : null}
      </Pressable>
      <View className="h-[30px] flex-row items-center justify-between">
        {newLabel ? (
          <Text className="rounded-full bg-primary-soft px-2 py-0.5 font-display text-[10px] text-primary">{newLabel}</Text>
        ) : (
          <Text className="font-display text-[10px] text-ink-muted">{jlpt !== null ? `N${jlpt}` : ''}</Text>
        )}
        {action}
      </View>
    </View>
  );
}
