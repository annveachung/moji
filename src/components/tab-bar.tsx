import { Image } from 'expo-image';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useLayout } from '@/lib/layout';
import { useAuth } from '@/state/auth';
import colors from '@/theme/colors';

import { Icon, type IconName } from './ui';

const TABS: Record<string, { icon: IconName; label: string }> = {
  index: { icon: 'menu-book', label: 'nav.library' },
  review: { icon: 'star', label: 'nav.review' },
  explore: { icon: 'translate', label: 'nav.explore' },
  grammar: { icon: 'auto-stories', label: 'nav.grammar' },
  settings: { icon: 'tune', label: 'nav.settings' },
};

type Tab = { key: string; icon: IconName; label: string; focused: boolean; onPress: () => void };

/**
 * The web app's navigation (the iPhone app uses the native glass tab bar instead).
 * Phone-sized windows get a bar at the bottom; wider windows get a sidebar on the left,
 * a slim icon rail on tablets and a full one with labels on laptops.
 * Expo Router hands us the navigation state; we draw the buttons and tell it where to go.
 */
export function TabBar({ state, emitter, navigateToTab }: BottomTabBarProps) {
  const { t } = useTranslation();
  const { size } = useLayout();

  const tabs: Tab[] = state.routes.flatMap((route, index) => {
    const tab = TABS[route.name];
    if (!tab) return [];
    const focused = state.index === index;
    const onPress = () => {
      const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
      if (!focused && !event.defaultPrevented) navigateToTab(route.key);
    };
    return [{ key: route.key, icon: tab.icon, label: t(tab.label), focused, onPress }];
  });

  if (size === 'compact') return <BottomBar tabs={tabs} />;
  return <Sidebar tabs={tabs} expanded={size === 'wide'} />;
}

/** Phone-sized: a bar along the bottom, clear of the iPhone's home indicator. */
function BottomBar({ tabs }: { tabs: Tab[] }) {
  const insets = useSafeAreaInsets();
  return (
    <View
      accessibilityRole="tablist"
      style={{ paddingBottom: Math.max(insets.bottom, 6) }}
      className="flex-row border-t border-ink/10 bg-card px-1 pt-1.5">
      {tabs.map((tab) => (
        <Pressable
          key={tab.key}
          accessibilityRole="tab"
          accessibilityState={{ selected: tab.focused }}
          accessibilityLabel={tab.label}
          onPress={tab.onPress}
          className="min-h-[52px] flex-1 items-center justify-center gap-0.5">
          {/* The selected tab's icon sits in a soft pill. */}
          <View className={`h-8 w-14 items-center justify-center rounded-full ${tab.focused ? 'bg-primary-soft' : ''}`}>
            <Icon name={tab.icon} size={22} color={tab.focused ? colors.primary.DEFAULT : colors.ink.muted} />
          </View>
          <Text numberOfLines={1} className={`text-[11px] ${tab.focused ? 'font-bold text-primary' : 'text-ink-soft'}`}>
            {tab.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

/** Wider windows: a sidebar with the moji mark, the sections, and your account at the bottom. */
function Sidebar({ tabs, expanded }: { tabs: Tab[]; expanded: boolean }) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  return (
    <View
      accessibilityRole="tablist"
      style={{ width: expanded ? 232 : 84, paddingTop: insets.top + 20, paddingBottom: insets.bottom + 16 }}
      className={`border-r border-ink/10 bg-surface-low ${expanded ? 'px-4' : 'items-center px-2'}`}>
      {/* moji */}
      <View className={`mb-8 flex-row items-center gap-3 ${expanded ? 'px-2' : ''}`}>
        <View className="h-10 w-10 items-center justify-center rounded-[14px] bg-primary">
          <Text className="text-[20px] font-bold text-white">文</Text>
        </View>
        {expanded ? (
          <View className="flex-row items-baseline gap-1.5">
            <Text className="font-display text-[22px] text-ink">moji</Text>
            <Text className="text-[13px] font-bold text-primary">文字</Text>
          </View>
        ) : null}
      </View>

      <View className={`gap-1 ${expanded ? '' : 'items-center'}`}>
        {tabs.map((tab) =>
          expanded ? (
            <Pressable
              key={tab.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab.focused }}
              onPress={tab.onPress}
              className={`h-11 flex-row items-center gap-3 rounded-full px-4 ${
                tab.focused ? 'bg-primary-soft' : 'hover:bg-surface-high'
              }`}>
              <Icon name={tab.icon} size={22} color={tab.focused ? colors.primary.DEFAULT : colors.ink.soft} />
              <Text className={`text-[15px] ${tab.focused ? 'font-bold text-primary' : 'font-semibold text-ink-soft'}`}>
                {tab.label}
              </Text>
            </Pressable>
          ) : (
            <Pressable
              key={tab.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab.focused }}
              accessibilityLabel={tab.label}
              onPress={tab.onPress}
              className="w-[72px] items-center gap-1 py-1.5">
              <View
                className={`h-8 w-14 items-center justify-center rounded-full ${
                  tab.focused ? 'bg-primary-soft' : 'hover:bg-surface-high'
                }`}>
                <Icon name={tab.icon} size={22} color={tab.focused ? colors.primary.DEFAULT : colors.ink.soft} />
              </View>
              <Text numberOfLines={1} className={`text-[11px] ${tab.focused ? 'font-bold text-primary' : 'text-ink-soft'}`}>
                {tab.label}
              </Text>
            </Pressable>
          ),
        )}
      </View>

      <View className="flex-1" />

      {/* Who's signed in (sign out lives in 設定). */}
      {user ? (
        <View className={`flex-row items-center gap-3 ${expanded ? 'px-2' : ''}`}>
          {user.avatarUrl ? (
            <Image source={{ uri: user.avatarUrl }} style={{ width: 36, height: 36, borderRadius: 18 }} />
          ) : (
            <View className="h-9 w-9 items-center justify-center rounded-full bg-primary-soft">
              <Text className="text-[15px] font-bold text-primary">{(user.name ?? user.email).slice(0, 1)}</Text>
            </View>
          )}
          {expanded ? (
            <View className="flex-1">
              <Text numberOfLines={1} className="text-[13px] font-semibold text-ink">
                {user.name ?? user.email}
              </Text>
              <Text numberOfLines={1} className="text-[11px] text-ink-muted">
                {user.email}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
