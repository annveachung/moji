import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/app-header';
import { EmptyState, Icon, IconButton } from '@/components/ui';
import { findDuplicate, getSavedWordKeys, insertWord, setWordSaved } from '@/db/queries';
import { showAlert } from '@/lib/alert';
import { essentialKey, findEssentialGroup, type EssentialGroup, type EssentialWord } from '@/lib/essentials';
import { padRows, useLayout } from '@/lib/layout';
import { speakJapanese } from '@/lib/speech';
import { useSettings } from '@/state/settings';
import { useSync } from '@/state/sync';
import colors from '@/theme/colors';

/**
 * One 基本のことば group (接続詞, 〜人…): its fixed words in order, each with a short note
 * where it helps. Tap a word to hear it, ＋ to save it to your library.
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

  const load = useCallback(() => {
    getSavedWordKeys(db).then(setSavedKeys);
  }, [db, dataVersion]);
  useFocusEffect(load);

  if (!group) {
    return (
      <View className="flex-1 bg-surface">
        <AppHeader subtitle={t('nav.explore')} back kind="reading" />
        <View className="p-4">
          <EmptyState icon="search-off" message={t('explore.empty')} />
        </View>
      </View>
    );
  }

  const title = t(`essentials.${group.id}`);
  const saved = savedKeys ? group.words.filter((w) => savedKeys.has(essentialKey(w))).length : 0;
  const columns = layout.columns;

  return (
    <View className="flex-1 bg-surface">
      <AppHeader subtitle={title} back kind="reading" />
      <FlatList
        key={columns}
        numColumns={columns}
        columnWrapperClassName={columns > 1 ? 'gap-3' : undefined}
        data={padRows(group.words, columns)}
        keyExtractor={(word, index) => (word ? essentialKey(word) : `empty-${index}`)}
        contentContainerClassName="gap-3"
        contentContainerStyle={{ ...layout.page('list'), paddingBottom: insets.bottom + 24 }}
        ListHeaderComponent={
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
        }
        renderItem={({ item }) => (
          <View style={columns > 1 ? { flex: 1 } : undefined}>
            {item ? (
              <EssentialCard word={item} group={group} saved={savedKeys?.has(essentialKey(item)) ?? false} onSaved={load} />
            ) : null}
          </View>
        )}
      />
    </View>
  );
}

/** One word: reading, word, meaning and note. Tap to hear it; ＋ saves it (no AI needed). */
function EssentialCard({
  word,
  group,
  saved,
  onSaved,
}: {
  word: EssentialWord;
  group: EssentialGroup;
  saved: boolean;
  onSaved: () => void;
}) {
  const db = useSQLiteContext();
  const { t } = useTranslation();
  const { settings } = useSettings();
  const [saving, setSaving] = useState(false);
  const zh = settings.meaningLanguage === 'zh-TW';
  const note = zh ? word.noteZh : word.noteEn;

  const save = async () => {
    setSaving(true);
    try {
      const existing = await findDuplicate(db, word.word, word.reading);
      if (existing) {
        if (!existing.savedAt) await setWordSaved(db, existing.id, true);
      } else {
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
          example: null,
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
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${word.word} ${word.reading}`}
      onPress={() => speakJapanese(word.reading)}
      className="flex-row items-center gap-3 rounded-2xl bg-card px-4 py-3 shadow-md shadow-ink/10 active:opacity-70">
      <View className="flex-1 gap-0.5">
        {word.reading !== word.word ? (
          <Text className="text-[11px] font-semibold tracking-wider text-primary">{word.reading}</Text>
        ) : null}
        <Text className="text-[22px] font-bold text-ink">{word.word}</Text>
        <Text className="text-[14px] text-ink-soft">{zh ? word.zh : word.en}</Text>
        {note ? <Text className="text-[12px] leading-4 text-ink-muted">{note}</Text> : null}
      </View>
      {saving ? (
        <ActivityIndicator size="small" color={colors.primary.DEFAULT} />
      ) : saved ? (
        <View className="h-9 w-9 items-center justify-center rounded-full bg-matcha-soft">
          <Icon name="check" size={18} color={colors.matcha.DEFAULT} />
        </View>
      ) : (
        <IconButton icon="add" tone="primary" size={36} label={t('explore.save')} onPress={save} />
      )}
    </Pressable>
  );
}
