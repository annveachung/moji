import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Switch, Text, View } from 'react-native';

import { AppHeader } from '@/components/app-header';
import { Card, IconButton } from '@/components/ui';
import type { Language } from '@/db/types';
import { useSettings } from '@/state/settings';
import colors from '@/theme/colors';

const LANGUAGES: { value: Language; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'zh-TW', label: '繁體中文' },
];

export default function SettingsScreen() {
  const { t } = useTranslation();
  const { settings, updateSettings } = useSettings();

  return (
    <View className="flex-1 bg-cream">
      <AppHeader subtitle={t('settings.title')} />
      <ScrollView contentContainerClassName="gap-4 p-4">
        <Card>
          <Row label={t('settings.uiLanguage')}>
            <Segmented
              value={settings.uiLanguage}
              onChange={(uiLanguage) => updateSettings({ uiLanguage })}
            />
          </Row>
          <Row label={t('settings.meaningLanguage')}>
            <Segmented
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

        <Card>
          <Row label={t('settings.dailyGoal')}>
            <View className="flex-row items-center gap-3">
              <IconButton
                icon="remove"
                tone="cream"
                size={34}
                label="−"
                disabled={settings.dailyGoal <= 1}
                onPress={() => updateSettings({ dailyGoal: settings.dailyGoal - 1 })}
              />
              <Text className="min-w-[24px] text-center font-display text-[20px] text-sumi">
                {settings.dailyGoal}
              </Text>
              <IconButton
                icon="add"
                tone="amber"
                size={34}
                label="+"
                disabled={settings.dailyGoal >= 20}
                onPress={() => updateSettings({ dailyGoal: settings.dailyGoal + 1 })}
              />
            </View>
          </Row>
          <Text className="text-[12px] text-sumi-muted">
            {t('settings.dailyGoalValue', { count: settings.dailyGoal })}
          </Text>
        </Card>
      </ScrollView>
    </View>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View className="min-h-[44px] flex-row items-center justify-between gap-3">
      <Text className="flex-1 text-[15px] font-semibold text-sumi">{label}</Text>
      {children}
    </View>
  );
}

function Segmented({ value, onChange }: { value: Language; onChange: (value: Language) => void }) {
  return (
    <View className="flex-row rounded-full border border-sumi/15 bg-cream p-0.5">
      {LANGUAGES.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            className={`rounded-full px-3 py-1.5 ${selected ? 'bg-amber' : ''}`}>
            <Text className={`text-[13px] ${selected ? 'font-bold text-sumi' : 'text-sumi-muted'}`}>
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
