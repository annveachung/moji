import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { AppHeader } from '@/components/app-header';
import { Toggle } from '@/components/ui';
import type { Language, UiLanguage } from '@/db/types';
import { useSettings } from '@/state/settings';

const UI_LANGUAGES: { value: UiLanguage; label: string }[] = [
  { value: 'ja', label: '日本語' },
  { value: 'en', label: 'English' },
  { value: 'zh-TW', label: '繁體中文' },
];

const MEANING_LANGUAGES: { value: Language; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'zh-TW', label: '繁體中文' },
];

export default function SettingsScreen() {
  const { t } = useTranslation();
  const { settings, updateSettings } = useSettings();

  return (
    <View className="flex-1 bg-surface">
      <AppHeader subtitle={t('settings.title')} />
      <ScrollView
        // Leave room for the glass tab bar, which floats over the content
        contentInsetAdjustmentBehavior="automatic"
        contentContainerClassName="w-full max-w-[720px] self-center gap-4 p-4 pb-10">
        {/* One card, equal-height rows split by thin lines, controls lined up on the right. */}
        <View className="rounded-card bg-card px-4 shadow-md shadow-ink/10">
          <Row label={t('settings.uiLanguage')}>
            <Segmented
              options={UI_LANGUAGES}
              value={settings.uiLanguage}
              onChange={(uiLanguage) => updateSettings({ uiLanguage })}
            />
          </Row>
          <Divider />
          <Row label={t('settings.meaningLanguage')}>
            <Segmented
              options={MEANING_LANGUAGES}
              value={settings.meaningLanguage}
              onChange={(meaningLanguage) => updateSettings({ meaningLanguage })}
            />
          </Row>
          <Divider />
          <Row label={t('settings.showFurigana')}>
            <Toggle
              value={settings.showFurigana}
              label={t('settings.showFurigana')}
              onChange={(showFurigana) => updateSettings({ showFurigana })}
            />
          </Row>
        </View>
      </ScrollView>
    </View>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View className="min-h-[60px] flex-row items-center justify-between gap-3 py-2">
      {/* System font: Plus Jakarta has no Japanese, and mixing fonts shifts the text off-center. */}
      <Text className="flex-1 text-[15px] font-semibold text-ink">{label}</Text>
      {children}
    </View>
  );
}

function Divider() {
  return <View className="h-px bg-surface-high" />;
}

function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View className="flex-row rounded-full bg-surface-high p-0.5">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            className={`rounded-full px-3 py-1.5 ${selected ? 'bg-primary' : ''}`}>
            <Text className={`text-[13px] ${selected ? 'font-bold text-white' : 'text-ink-muted'}`}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

