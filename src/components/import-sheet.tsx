import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { ImportPlan } from '@/db/queries';
import type { CsvProblem } from '@/lib/word-csv';
import { useSettings } from '@/state/settings';
import colors from '@/theme/colors';

import { Card, EmptyState, Icon, SectionHeader } from './ui';

/**
 * Review an import before it happens: how many new words, which words are already
 * in your library (tick the ones to update from the file), and rows that couldn't be read.
 */
export function ImportSheet({
  plan,
  problems,
  onCancel,
  onConfirm,
}: {
  plan: ImportPlan;
  problems: CsvProblem[];
  onCancel: () => void;
  onConfirm: (mergeIds: Set<number>) => void;
}) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { settings } = useSettings();
  const zh = settings.meaningLanguage === 'zh-TW';
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const allIds = plan.duplicates.map((d) => d.existing.id);
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.has(id));
  const canImport = plan.fresh.length > 0 || selected.size > 0;

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
          <Text className="font-display text-[16px] text-ink">{t('importing.title')}</Text>
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
          {!canImport && plan.duplicates.length === 0 ? (
            <EmptyState icon="inbox" message={t('importing.nothing')} />
          ) : null}

          {/* New words */}
          {plan.fresh.length > 0 ? (
            <Card>
              <SectionHeader title={t('importing.newWords', { count: plan.fresh.length })} accent="matcha" />
              <View className="flex-row flex-wrap gap-2">
                {plan.fresh.map(({ csv }) => (
                  <View key={csv.line} className="rounded-xl bg-surface-low px-3 py-1.5">
                    <Text className="text-[15px] font-bold text-ink">{csv.word}</Text>
                    <Text className="text-[11px] text-ink-soft">{csv.reading}</Text>
                  </View>
                ))}
              </View>
            </Card>
          ) : null}

          {/* Duplicates, with a checkbox each */}
          {plan.duplicates.length > 0 ? (
            <Card>
              <SectionHeader
                title={t('importing.duplicates', { count: plan.duplicates.length })}
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
              <Text className="text-[12px] leading-4 text-ink-soft">{t('importing.duplicatesHint')}</Text>
              {plan.duplicates.map(({ csv, existing }) => {
                const checked = selected.has(existing.id);
                const now = zh ? existing.meaningZh || existing.meaningEn : existing.meaningEn || existing.meaningZh;
                const file = zh ? csv.meaningZh || csv.meaningEn : csv.meaningEn || csv.meaningZh;
                return (
                  <Pressable
                    key={existing.id}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked }}
                    onPress={() => toggle(existing.id)}
                    className={`flex-row items-start gap-3 rounded-2xl p-3 ${checked ? 'bg-primary-soft/60' : 'bg-surface-low'}`}>
                    <Icon
                      name={checked ? 'check-box' : 'check-box-outline-blank'}
                      size={22}
                      color={checked ? colors.primary.DEFAULT : colors.ink.muted}
                    />
                    <View className="flex-1 gap-1">
                      <Text className="text-[16px] font-bold text-ink">
                        {existing.word} <Text className="text-[12px] font-normal text-ink-soft">{existing.reading}</Text>
                      </Text>
                      <Text className="text-[12px] text-ink-soft">
                        <Text className="font-display-semibold">{t('importing.current')}: </Text>
                        {now}
                      </Text>
                      {file && file !== now ? (
                        <Text className="text-[12px] text-ink">
                          <Text className="font-display-semibold text-primary">{t('importing.file')}: </Text>
                          {file}
                        </Text>
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </Card>
          ) : null}

          {/* Rows that couldn't be read */}
          {problems.length > 0 ? (
            <Card>
              <SectionHeader title={t('importing.problems', { count: problems.length })} accent="error" />
              {problems.slice(0, 20).map((p) => (
                <Text key={p.line} className="text-[13px] text-ink-soft">
                  {t('importing.line', { line: p.line })}: {t(`importing.reason.${p.reason}`)}
                </Text>
              ))}
              <Text className="text-[11px] leading-4 text-ink-muted">{t('importing.formatHint')}</Text>
            </Card>
          ) : null}

          {plan.repeated > 0 ? (
            <Text className="px-1 text-[12px] text-ink-muted">{t('importing.repeated', { count: plan.repeated })}</Text>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  );
}
