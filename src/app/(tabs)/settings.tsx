import { Image } from 'expo-image';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { showAlert } from '@/lib/alert';
import { AppHeader } from '@/components/app-header';
import { Icon, Toggle } from '@/components/ui';
import type { Language, UiLanguage } from '@/db/types';
import { useAuth } from '@/state/auth';
import { useSettings } from '@/state/settings';
import { useSync } from '@/state/sync';
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
  const { user, signOut } = useAuth();

  const confirmSignOut = () =>
    showAlert(t('auth.signOutConfirm'), t('auth.signOutBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('auth.signOut'), style: 'destructive', onPress: () => signOut() },
    ]);

  return (
    <View className="flex-1 bg-surface">
      <AppHeader subtitle={t('settings.title')} />
      <ScrollView
        // Leave room for the glass tab bar, which floats over the content
        contentInsetAdjustmentBehavior="automatic"
        contentContainerClassName="w-full max-w-[720px] self-center gap-4 p-4 pb-10">
        {/* Your Google account, and signing out. */}
        {user ? (
          <View className="rounded-card bg-card px-4 shadow-md shadow-ink/10">
            <View className="min-h-[72px] flex-row items-center gap-3 py-3">
              {user.avatarUrl ? (
                <Image source={{ uri: user.avatarUrl }} style={{ width: 44, height: 44, borderRadius: 22 }} />
              ) : (
                <View className="h-11 w-11 items-center justify-center rounded-full bg-primary-soft">
                  <Text className="text-[18px] font-bold text-primary">{(user.name ?? user.email).slice(0, 1)}</Text>
                </View>
              )}
              <View className="flex-1">
                <Text className="text-[16px] font-semibold text-ink">{user.name ?? t('auth.account')}</Text>
                <Text className="text-[13px] text-ink-soft">{user.email}</Text>
              </View>
            </View>
            <Divider />
            <Pressable
              accessibilityRole="button"
              onPress={confirmSignOut}
              className="min-h-[52px] flex-row items-center gap-2 active:opacity-60">
              <Icon name="logout" size={18} color={colors.error.DEFAULT} />
              <Text className="text-[15px] font-semibold text-error">{t('auth.signOut')}</Text>
            </Pressable>
          </View>
        ) : null}

        <SyncCard />

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

/** Whether this device is in step with the server, and a button to sync now. */
function SyncCard() {
  const { t } = useTranslation();
  const { status, pending, lastSyncedAt, syncNow } = useSync();
  const tone = status === 'offline' || status === 'error' ? colors.mustard.DEFAULT : colors.matcha.DEFAULT;
  const message =
    status === 'syncing'
      ? t('sync.syncing')
      : status === 'offline'
        ? t('sync.offline')
        : status === 'error'
          ? t('sync.error')
          : pending > 0
            ? t('sync.pending', { count: pending })
            : t('sync.synced');
  const time = lastSyncedAt?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <View className="rounded-card bg-card px-4 shadow-md shadow-ink/10">
      <View className="min-h-[64px] flex-row items-center gap-3 py-3">
        {status === 'syncing' ? (
          <ActivityIndicator color={colors.primary.DEFAULT} />
        ) : (
          <Icon name={status === 'offline' ? 'cloud-off' : status === 'error' ? 'sync-problem' : 'cloud-done'} size={22} color={tone} />
        )}
        <View className="flex-1">
          <Text className="text-[15px] font-semibold text-ink">{message}</Text>
          {time ? <Text className="text-[12px] text-ink-muted">{t('sync.last', { time })}</Text> : null}
        </View>
        <Pressable
          accessibilityRole="button"
          disabled={status === 'syncing'}
          onPress={syncNow}
          className="rounded-full bg-surface-high px-3 py-1.5 active:bg-primary-soft">
          <Text className="font-display-semibold text-[12px] text-ink">{t('sync.syncNow')}</Text>
        </Pressable>
      </View>
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

