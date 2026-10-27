import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import colors from '@/theme/colors';

import { Card, EmptyState, Icon, SectionHeader } from './ui';

export type ImportReview = {
  title: string;
  /** Items that will be added. */
  fresh: { key: string; title: string; subtitle: string }[];
  freshTitle: string;
  /** Items already in moji; ticked ones get updated from the file. */
  duplicates: { id: number; title: string; subtitle: string; current: string; incoming: string }[];
  duplicatesTitle: string;
  duplicatesHint: string;
  /** Rows that couldn't be read, already described in words. */
  problems: { line: number; reason: string }[];
  problemsTitle: string;
  /** Small notes at the bottom (repeated rows, columns we didn't read, the expected format). */
  notes: string[];
};

/**
 * Review an import before it happens: what will be added, which items already exist
 * (tick the ones to update from the file), and rows that couldn't be read.
 * Used for both words (単語帳) and grammar (文法).
 */
export function ImportSheet({
  review,
  onCancel,
  onConfirm,
}: {
  review: ImportReview;
  onCancel: () => void;
  onConfirm: (mergeIds: Set<number>) => void;
}) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const allIds = review.duplicates.map((d) => d.id);
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.has(id));
  const canImport = review.fresh.length > 0 || selected.size > 0;

  const toggle = (id: number) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <Modal animationType="slide" presentationStyle="pageSheet" onRequestClose={onCancel}>
      <View className="flex-1 bg-surface">
        {/* Top bar: Cancel · title · Import */}
        <View className="flex-row items-center justify-between px-4 py-3">
          <Pressable accessibilityRole="button" hitSlop={10} onPress={onCancel}>
            <Text className="text-[16px] text-ink-soft">{t('common.cancel')}</Text>
          </Pressable>
          <Text className="font-display text-[16px] text-ink">{review.title}</Text>
          <Pressable
            accessibilityRole="button"
            hitSlop={10}
            disabled={!canImport}
            onPress={() => onConfirm(selected)}
            className={`rounded-full bg-primary px-4 py-1.5 ${canImport ? '' : 'opacity-40'}`}>
            <Text className="font-display text-[15px] text-white">{t('importing.confirm')}</Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerClassName="w-full max-w-[720px] self-center gap-4 p-4"
          contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
          {review.fresh.length === 0 && review.duplicates.length === 0 ? (
            <EmptyState icon="inbox" message={t('importing.nothing')} />
          ) : null}

          {review.fresh.length > 0 ? (
            <Card>
              <SectionHeader title={review.freshTitle} accent="matcha" />
              <View className="flex-row flex-wrap gap-2">
                {review.fresh.map((item) => (
                  <View key={item.key} className="rounded-xl bg-surface-low px-3 py-1.5">
                    <Text className="text-[15px] font-bold text-ink">{item.title}</Text>
                    {item.subtitle ? <Text className="text-[11px] text-ink-soft">{item.subtitle}</Text> : null}
                  </View>
                ))}
              </View>
            </Card>
          ) : null}

          {review.duplicates.length > 0 ? (
            <Card>
              <SectionHeader
                title={review.duplicatesTitle}
                accent="mustard"
                right={
                  <Pressable
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: allSelected }}
                    hitSlop={8}
                    onPress={() => setSelected(allSelected ? new Set() : new Set(allIds))}
                    className="flex-row items-center gap-1">
                    <Icon
                      name={allSelected ? 'check-box' : 'check-box-outline-blank'}
                      size={20}
                      color={allSelected ? colors.primary.DEFAULT : colors.ink.muted}
                    />
                    <Text className="font-display-semibold text-[12px] text-ink-soft">{t('importing.selectAll')}</Text>
                  </Pressable>
                }
              />
              <Text className="text-[12px] leading-4 text-ink-soft">{review.duplicatesHint}</Text>
              {review.duplicates.map((item) => {
                const checked = selected.has(item.id);
                return (
                  <Pressable
                    key={item.id}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked }}
                    onPress={() => toggle(item.id)}
                    className={`flex-row items-start gap-3 rounded-2xl p-3 ${checked ? 'bg-primary-soft/60' : 'bg-surface-low'}`}>
                    <Icon
                      name={checked ? 'check-box' : 'check-box-outline-blank'}
                      size={22}
                      color={checked ? colors.primary.DEFAULT : colors.ink.muted}
                    />
                    <View className="flex-1 gap-1">
                      <Text className="text-[16px] font-bold text-ink">
                        {item.title}{' '}
                        {item.subtitle ? <Text className="text-[12px] font-normal text-ink-soft">{item.subtitle}</Text> : null}
                      </Text>
                      <Text className="text-[12px] text-ink-soft">
                        <Text className="font-display-semibold">{t('importing.current')}: </Text>
                        {item.current}
                      </Text>
                      {item.incoming && item.incoming !== item.current ? (
                        <Text className="text-[12px] text-ink">
                          <Text className="font-display-semibold text-primary">{t('importing.file')}: </Text>
                          {item.incoming}
                        </Text>
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </Card>
          ) : null}

          {review.problems.length > 0 ? (
            <Card>
              <SectionHeader title={review.problemsTitle} accent="error" />
              {review.problems.slice(0, 20).map((p) => (
                <Text key={p.line} className="text-[13px] text-ink-soft">
                  {t('importing.line', { line: p.line })}: {p.reason}
                </Text>
              ))}
            </Card>
          ) : null}

          {review.notes.map((note) => (
            <Text key={note} className="px-1 text-[12px] leading-4 text-ink-muted">
              {note}
            </Text>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}
