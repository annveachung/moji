import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FuriganaText } from '@/components/furigana-text';
import { Chip, Icon, Pill } from '@/components/ui';
import { getWord, insertWord, updateWord } from '@/db/queries';
import type { JlptLevel, PartOfSpeech, WordInput } from '@/db/types';
import { makeFurigana } from '@/lib/furigana';
import { toRomaji } from '@/lib/romaji';
import colors from '@/theme/colors';

const POS: PartOfSpeech[] = ['noun', 'verb', 'i-adj', 'na-adj', 'adverb', 'expression'];
const JLPT: JlptLevel[] = [5, 4, 3, 2, 1];
/** Hiragana, katakana, the long-vowel mark ー, and spaces. */
const KANA_ONLY = /^[぀-ゟ゠-ヿー・\s]+$/;

const EMPTY: WordInput = {
  word: '',
  reading: '',
  meaningEn: '',
  meaningZh: '',
  pos: 'noun',
  jlpt: null,
  notes: '',
  starred: false,
  example: { ja: '', translation: '' },
};

type FieldError = 'word' | 'reading' | 'meaning';

/** Add a word you met outside, or edit one. Opens as a sheet from the bottom. */
export default function WordFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editingId = id ? Number(id) : null;
  const db = useSQLiteContext();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [form, setForm] = useState<WordInput>(EMPTY);
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [saving, setSaving] = useState(false);

  // When editing, start from the word's current values.
  useEffect(() => {
    if (editingId === null) return;
    getWord(db, editingId).then((word) => {
      if (!word) return;
      setForm({
        word: word.word,
        reading: word.reading,
        meaningEn: word.meaningEn,
        meaningZh: word.meaningZh,
        pos: word.pos,
        jlpt: word.jlpt,
        notes: word.notes,
        starred: word.starredAt !== null,
        example: { ja: '', translation: '' },
      });
    });
  }, [db, editingId]);

  const update = (patch: Partial<WordInput>) => {
    setForm((current) => ({ ...current, ...patch }));
    setErrors([]);
  };

  const save = async () => {
    const input = {
      ...form,
      word: form.word.trim(),
      reading: form.reading.trim(),
      meaningEn: form.meaningEn.trim(),
      meaningZh: form.meaningZh.trim(),
    };
    const problems: FieldError[] = [];
    if (!input.word) problems.push('word');
    if (!KANA_ONLY.test(input.reading)) problems.push('reading');
    if (!input.meaningEn && !input.meaningZh) problems.push('meaning');
    if (problems.length > 0) {
      setErrors(problems);
      return;
    }
    setSaving(true);
    if (editingId === null) await insertWord(db, input);
    else await updateWord(db, editingId, input);
    router.back();
  };

  const preview = form.word.trim() ? makeFurigana(form.word.trim(), form.reading.trim()) : '';
  const example = form.example ?? { ja: '', translation: '' };

  return (
    <KeyboardAvoidingView behavior="padding" className="flex-1 bg-surface">
      {/* Top bar: Cancel · title · Save */}
      <View className="flex-row items-center justify-between border-b border-ink/10 px-4 py-3">
        <Pressable accessibilityRole="button" hitSlop={10} onPress={() => router.back()}>
          <Text className="text-[16px] text-ink-soft">{t('common.cancel')}</Text>
        </Pressable>
        <Text className="font-display text-[16px] text-ink">
          {editingId === null ? t('form.addTitle') : t('form.editTitle')}
        </Text>
        <Pressable
          accessibilityRole="button"
          hitSlop={10}
          disabled={saving}
          onPress={save}
          className="rounded-full bg-primary px-4 py-1.5 active:opacity-80">
          <Text className="font-display text-[15px] text-white">{t('common.save')}</Text>
        </Pressable>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerClassName="w-full max-w-[720px] self-center gap-5 p-5"
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
        {/* Live preview: shows the furigana that will be generated */}
        <View className="min-h-[110px] items-center justify-center gap-1 rounded-[28px] bg-card p-4 shadow-md shadow-ink/10">
          {preview ? (
            <>
              <FuriganaText markup={preview} size={40} className="font-bold text-ink" containerClassName="justify-center" />
              {KANA_ONLY.test(form.reading.trim()) && (
                <Text className="text-[13px] text-ink-soft">{toRomaji(form.reading.trim())}</Text>
              )}
            </>
          ) : (
            <Text className="text-[13px] text-ink-muted">{t('form.preview')}</Text>
          )}
        </View>

        <Field label={t('form.word')} error={errors.includes('word') ? t('form.errors.word') : undefined}>
          <Input
            value={form.word}
            onChangeText={(word) => update({ word })}
            placeholder={t('form.wordPlaceholder')}
            large
          />
        </Field>

        <Field label={t('form.reading')} error={errors.includes('reading') ? t('form.errors.reading') : undefined}>
          <Input
            value={form.reading}
            onChangeText={(reading) => update({ reading })}
            placeholder={t('form.readingPlaceholder')}
          />
        </Field>

        <Field
          label={t('form.meaningZh')}
          hint={t('form.meaningHint')}
          error={errors.includes('meaning') ? t('form.errors.meaning') : undefined}>
          <Input value={form.meaningZh} onChangeText={(meaningZh) => update({ meaningZh })} placeholder="學習；讀書" />
        </Field>

        <Field label={t('form.meaningEn')}>
          <Input value={form.meaningEn} onChangeText={(meaningEn) => update({ meaningEn })} placeholder="study" />
        </Field>

        <Field label={t('form.pos')}>
          <View className="flex-row flex-wrap gap-2">
            {POS.map((pos) => (
              <Chip key={pos} label={t(`pos.${pos}`)} selected={form.pos === pos} onPress={() => update({ pos })} />
            ))}
          </View>
        </Field>

        <Field label={t('form.jlpt')}>
          <View className="flex-row flex-wrap gap-2">
            <Chip label={t('form.none')} selected={form.jlpt === null} onPress={() => update({ jlpt: null })} />
            {JLPT.map((level) => (
              <Chip key={level} label={`N${level}`} selected={form.jlpt === level} onPress={() => update({ jlpt: level })} />
            ))}
          </View>
        </Field>

        <Field label={t('form.example')}>
          <Input
            value={example.ja}
            onChangeText={(ja) => update({ example: { ...example, ja } })}
            placeholder={t('form.examplePlaceholder')}
            multiline
          />
          <Input
            value={example.translation}
            onChangeText={(translation) => update({ example: { ...example, translation } })}
            placeholder={t('form.translation')}
          />
        </Field>

        <Field label={t('form.notes')}>
          <Input value={form.notes} onChangeText={(notes) => update({ notes })} multiline />
        </Field>

        <View className="min-h-[52px] flex-row items-center justify-between rounded-2xl bg-card px-4 shadow-sm shadow-ink/10">
          <Text className="text-[15px] font-semibold text-ink">{t('form.star')}</Text>
          <Switch
            value={form.starred}
            onValueChange={(starred) => update({ starred })}
            trackColor={{ true: colors.primary.DEFAULT, false: colors.surface.highest }}
            ios_backgroundColor={colors.surface.highest}
          />
        </View>

        <View className="flex-row items-center justify-center gap-1.5">
          <Icon name="auto-awesome" size={14} color={colors.ink.muted} />
          <Pill label={t('form.aiSoon')} tone="outline" />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <View className="gap-2">
      <View className="flex-row items-baseline justify-between px-1">
        <Text className="font-display text-[13px] text-ink">{label}</Text>
        {hint && <Text className="text-[11px] text-ink-muted">{hint}</Text>}
      </View>
      {children}
      {error && <Text className="px-1 text-[12px] font-semibold text-error">{error}</Text>}
    </View>
  );
}

function Input({
  large = false,
  multiline = false,
  ...props
}: {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  large?: boolean;
  multiline?: boolean;
}) {
  return (
    <TextInput
      {...props}
      multiline={multiline}
      placeholderTextColor={colors.ink.muted}
      autoCorrect={false}
      autoCapitalize="none"
      className={`rounded-2xl bg-card px-4 text-ink shadow-sm shadow-ink/10 ${
        large ? 'py-3 text-[22px] font-bold' : 'py-3 text-[16px]'
      } ${multiline ? 'min-h-[72px]' : ''}`}
      style={multiline ? { textAlignVertical: 'top' } : undefined}
    />
  );
}
