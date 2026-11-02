import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';

import { findDuplicate, getWord, insertWord, setWordSaved, setWordTopic } from '@/db/queries';
import type { Word } from '@/db/types';
import { showAlert } from '@/lib/alert';
import { categoryOf, fillWord, toWordInput } from '@/lib/ai';
import { aiErrorMessage } from '@/lib/ai-errors';
import { meaningFor } from '@/lib/meaning';
import { posLabel } from '@/lib/verb';
import { useSettings } from '@/state/settings';
import { useSync } from '@/state/sync';
import colors from '@/theme/colors';

import { FuriganaText } from './furigana-text';
import { Icon, Pill } from './ui';

/**
 * The quick-add bar at the top of 単語帳: type (or dictate with the keyboard's 🎤) just
 * the word, and the AI fills in its reading, meanings, part of speech, level, an example
 * and a topic. The word is saved right away, with a card to check or edit it.
 */
export function QuickAdd({ onAdded }: { onAdded: () => void }) {
  const db = useSQLiteContext();
  const router = useRouter();
  const { t } = useTranslation();
  const { settings } = useSettings();
  const { topicLabel } = useSync();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState<Word | null>(null);

  const finish = async (id: number) => {
    setText('');
    setAdded(await getWord(db, id));
    onAdded();
  };

  const submit = async () => {
    const typed = text.trim();
    if (!typed || busy) return;
    setBusy(true);
    try {
      const filled = await fillWord(typed);
      const duplicate = await findDuplicate(db, filled.word, filled.reading);
      const topic = categoryOf(filled);
      const add = async () => finish(await insertWord(db, toWordInput(filled)));

      if (duplicate?.savedAt) {
        // Already saved: say so, and only add a second copy if you really want one.
        showAlert(t('ai.duplicateTitle'), t('ai.duplicateBody', { word: duplicate.word, reading: duplicate.reading }), [
          { text: t('form.skip'), style: 'cancel', onPress: () => setText('') },
          { text: t('form.addAnyway'), onPress: add },
        ]);
      } else if (duplicate) {
        // One of the starter words: save that one, in the AI's topic if it had none.
        await setWordSaved(db, duplicate.id, true);
        const uid = await db.getFirstAsync<{ uid: string }>('SELECT uid FROM words WHERE id = ?', duplicate.id);
        if (!duplicate.topic && topic && uid) await setWordTopic(db, uid.uid, topic);
        await finish(duplicate.id);
      } else {
        await add();
      }
    } catch (error) {
      // No AI right now (offline, not set up…): offer the form, with the word already typed.
      showAlert(t('library.quickAdd'), aiErrorMessage(t, error), [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('ai.manual'), onPress: () => router.push({ pathname: '/word-form', params: { word: typed } }) },
      ]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View className="gap-2">
      <View className="flex-row items-center gap-2 rounded-card bg-card p-2 pl-4 shadow-md shadow-ink/10">
        <Icon name="auto-awesome" size={20} color={colors.primary.DEFAULT} />
        <TextInput
          value={text}
          onChangeText={setText}
          onSubmitEditing={submit}
          editable={!busy}
          placeholder={t('ai.quickAddPlaceholder')}
          placeholderTextColor={colors.ink.muted}
          returnKeyType="done"
          autoCorrect={false}
          autoCapitalize="none"
          className="h-12 flex-1 text-[17px] text-ink"
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('library.quickAdd')}
          disabled={busy}
          onPress={text.trim() ? submit : () => router.push('/word-form')}
          className="h-11 w-11 items-center justify-center rounded-full bg-primary active:opacity-80">
          {busy ? <ActivityIndicator color="#FFFFFF" /> : <Icon name={text.trim() ? 'arrow-upward' : 'add'} size={24} color="#FFFFFF" />}
        </Pressable>
      </View>
      <Text className="px-2 text-[12px] leading-4 text-ink-soft">{busy ? t('ai.adding') : t('ai.quickAddHint')}</Text>

      {added ? (
        <View className="gap-2 rounded-card bg-primary-soft/50 p-4">
          <View className="flex-row items-center justify-between">
            <Pill icon="check-circle" label={t('ai.added')} tone="matcha" />
            <Pressable accessibilityRole="button" accessibilityLabel={t('ai.dismiss')} hitSlop={10} onPress={() => setAdded(null)}>
              <Icon name="close" size={18} color={colors.ink.muted} />
            </Pressable>
          </View>
          <FuriganaText markup={added.furigana} size={26} className="font-bold text-ink" />
          <Text className="text-[15px] font-semibold text-ink">{meaningFor(added, settings.meaningLanguage)}</Text>
          <View className="flex-row flex-wrap items-center gap-2">
            {added.jlpt !== null ? <Pill label={`N${added.jlpt}`} tone="mustard" /> : null}
            <Pill label={posLabel(t, added)} tone="outline" />
            <Pill label={topicLabel(added.topic)} tone="outline" />
            <View className="flex-1" />
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push({ pathname: '/word-form', params: { id: String(added.id) } })}>
              <Text className="font-display-semibold text-[13px] text-ink-soft">{t('ai.edit')}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push({ pathname: '/word/[id]', params: { id: String(added.id) } })}>
              <Text className="font-display-semibold text-[13px] text-primary">{t('ai.open')}</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}
