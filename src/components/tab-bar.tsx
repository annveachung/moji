import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import colors from '@/theme/colors';

import { Icon, type IconName } from './ui';

const TABS: Record<string, { icon: IconName; label: string }> = {
  index: { icon: 'menu-book', label: 'nav.library' },
  review: { icon: 'star', label: 'nav.review' },
  explore: { icon: 'translate', label: 'nav.explore' },
  grammar: { icon: 'auto-stories', label: 'nav.grammar' },
  settings: { icon: 'tune', label: 'nav.settings' },
};

/**
 * Our own bottom tab bar (from the Stitch design) instead of the default one.
 * Expo Router hands us the navigation state; we draw the buttons and tell it where to go.
 */
export function TabBar({ state, emitter, navigateToTab }: BottomTabBarProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{ paddingBottom: Math.max(insets.bottom, 8) }}
      className="flex-row border-t border-ink/15 bg-surface-high pt-2">
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
            <Icon name={tab.icon} size={24} color={focused ? colors.primary.DEFAULT : colors.ink.muted} />
            <Text
              className={`mt-0.5 text-[11px] ${focused ? 'font-bold text-primary' : 'text-ink-muted'}`}>
              {t(tab.label)}
            </Text>
            <View className={`mt-1 h-1.5 w-1.5 rounded-full ${focused ? 'bg-primary' : 'bg-transparent'}`} />
          </Pressable>
        );
      })}
    </View>
  );
}
