import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Switch, Text, View } from 'react-native';

import { AppHeader } from '@/components/app-header';
import { Card } from '@/components/ui';
import type { Language, UiLanguage } from '@/db/types';
import { useSettings } from '@/state/settings';
import colors from '@/theme/colors';

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
    <View className="flex-1 bg-cream">
      <AppHeader subtitle={t('settings.title')} />
      <ScrollView
          // Leave room for the glass tab bar, which floats over the content
          contentInsetAdjustmentBehavior="automatic"
          contentContainerClassName="gap-4 p-4">
        <Card>
          <Row label={t('settings.uiLanguage')}>
            <Segmented
              options={UI_LANGUAGES}
              value={settings.uiLanguage}
              onChange={(uiLanguage) => updateSettings({ uiLanguage })}
            />
          </Row>
          <Row label={t('settings.meaningLanguage')}>
            <Segmented
              options={MEANING_LANGUAGES}
              value={settings.meaningLanguage}
              onChange={(meaningLanguage) => updateSettings({ meaningLanguage })}
            />
          </Row>
        </Card>

        <Card>
          <Row label={t('settings.showFurigana')}>
            <ThemedSwitch
              value={settings.showFurigana}
              onChange={(showFurigana) => updateSettings({ showFurigana })}
            />
          </Row>
          <Row label={t('settings.showRomaji')}>
            <ThemedSwitch
              value={settings.showRomaji}
              onChange={(showRomaji) => updateSettings({ showRomaji })}
            />
          </Row>
        </Card>

      </ScrollView>
    </View>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View className="min-h-[44px] flex-row items-center justify-between gap-3">
      <Text className="flex-1 font-display-semibold text-[15px] text-sumi">{label}</Text>
      {children}
    </View>
  );
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
    <View className="flex-row rounded-full bg-cream p-0.5">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            className={`rounded-full px-3 py-1.5 ${selected ? 'bg-sumi' : ''}`}>
            <Text className={`text-[13px] ${selected ? 'font-bold text-amber' : 'text-sumi-muted'}`}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function ThemedSwitch({ value, onChange }: { value: boolean; onChange: (value: boolean) => void }) {
  return (
    <Switch
      value={value}
      onValueChange={onChange}
      trackColor={{ true: colors.amber.DEFAULT, false: colors.cream.dark }}
      thumbColor="#FFFFFF"
      ios_backgroundColor={colors.cream.dark}
    />
  );
}
