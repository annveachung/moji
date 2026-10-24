import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import type { Word } from '@/db/types';
import { meaningFor } from '@/lib/meaning';
import { useSettings } from '@/state/settings';

import { FuriganaText } from './furigana-text';

/** One word in a list (library, explore). Tap to open its detail page. */
export function WordRow({ word, right }: { word: Word; right?: ReactNode }) {
  const router = useRouter();
  const { settings } = useSettings();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${word.word} ${word.reading}`}
      onPress={() => router.push({ pathname: '/word/[id]', params: { id: String(word.id) } })}
      className="flex-row items-center gap-3 rounded-2xl bg-card px-4 py-3 shadow-md shadow-ink/10 active:opacity-70">
      <View className="flex-1 gap-0.5">
        <FuriganaText
          markup={word.furigana}
          size={22}
          showFurigana={settings.showFurigana}
          className="font-bold text-ink"
        />
        {!settings.showFurigana && word.reading !== word.word && (
          <Text className="text-[12px] text-ink-soft">{word.reading}</Text>
        )}
        <Text numberOfLines={1} className="text-[14px] text-ink-soft">
          {meaningFor(word, settings.meaningLanguage)}
        </Text>
      </View>
      {right}
    </Pressable>
  );
}
