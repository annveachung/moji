import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { countDueReviews } from '@/db/queries';
import colors from '@/theme/colors';

import { Icon, type IconName } from './ui';

const TABS: Record<string, { icon: IconName; label: string }> = {
  index: { icon: 'auto-awesome', label: 'nav.dashboard' },
  library: { icon: 'style', label: 'nav.library' },
  review: { icon: 'sync', label: 'nav.review' },
  explore: { icon: 'explore', label: 'nav.explore' },
  settings: { icon: 'tune', label: 'nav.settings' },
};

/**
 * Our own bottom tab bar (from the Stitch design) instead of the default one.
 * Expo Router hands us the navigation state; we draw the buttons and tell it where to go.
 */
export function TabBar({ state, emitter, navigateToTab }: BottomTabBarProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const db = useSQLiteContext();
  const [due, setDue] = useState(0);

  // Recount due reviews whenever you switch tabs.
  useEffect(() => {
    countDueReviews(db).then(setDue);
  }, [db, state.index]);

  return (
    <View
      style={{ paddingBottom: Math.max(insets.bottom, 8) }}
      className="flex-row border-t border-sumi/15 bg-cream pt-2">
      {state.routes.map((route, index) => {
        const tab = TABS[route.name];
        if (!tab) return null;
        const focused = state.index === index;

        const onPress = () => {
          const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigateToTab(route.key);
        };

        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={t(tab.label)}
            onPress={onPress}
            className="min-h-[44px] flex-1 items-center justify-center">
            <View>
              <Icon
                name={tab.icon}
                size={24}
                color={focused ? colors.sumi.DEFAULT : colors.sumi.muted}
              />
              {route.name === 'review' && due > 0 && (
                <View className="absolute -right-3 -top-1 min-w-[18px] items-center rounded-full bg-shu px-1">
                  <Text className="text-[10px] font-bold text-cream-light">{due > 99 ? '99+' : due}</Text>
                </View>
              )}
            </View>
            <Text
              className={`mt-0.5 text-[11px] ${focused ? 'font-bold text-sumi' : 'text-sumi-muted'}`}>
              {t(tab.label)}
            </Text>
            <View className={`mt-1 h-1.5 w-1.5 rounded-full ${focused ? 'bg-sumi' : 'bg-transparent'}`} />
          </Pressable>
        );
      })}
    </View>
  );
}
