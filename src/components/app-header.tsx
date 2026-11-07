import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import type { ReactNode } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useLayout, type PageKind } from '@/lib/layout';

import { Mascot } from './mascot';
import { Icon } from './ui';

/**
 * The bar at the top of each screen: the moji name with the current page under it,
 * an optional back arrow, and room on the right for buttons. It lines up with the page's
 * content (kind = the same width as the page). In a wide web window the sidebar already
 * shows "moji", so the header shows the page title large instead.
 */
export function AppHeader({
  subtitle,
  back = false,
  right,
  kind = 'list',
}: {
  subtitle: string;
  back?: boolean;
  right?: ReactNode;
  kind?: PageKind;
}) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useTranslation();
  const layout = useLayout();
  const titleOnly = Platform.OS === 'web' && !layout.isCompact;

  return (
    <View
      style={{ paddingTop: insets.top }}
      className="bg-surface">
      <View
        style={{ ...layout.page(kind), height: titleOnly ? 80 : 56, paddingTop: titleOnly ? 24 : 0 }}
        className="flex-row items-center justify-between gap-2">
        <View className="flex-1 flex-row items-center gap-2">
          {back && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('common.back')}
              // Opened straight from a link or after a page refresh there's nothing to go back to:
              // go to the first tab instead.
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
              hitSlop={12}
              className="-ml-1 h-11 w-9 items-center justify-center">
              <Icon name="arrow-back-ios-new" size={22} />
            </Pressable>
          )}
          {titleOnly ? (
            <Text numberOfLines={1} className="flex-1 text-[26px] font-bold text-ink">
              {subtitle}
            </Text>
          ) : (
            <View className="flex-1">
              <View className="flex-row items-center gap-1.5">
                <Mascot size={20} />
                <Text className="font-display text-[20px] leading-6 text-ink">moji</Text>
                <Text className="text-[12px] font-bold text-primary">文字</Text>
              </View>
              <Text numberOfLines={1} className="font-display-medium text-[12px] text-ink-soft">
                {subtitle}
              </Text>
            </View>
          )}
        </View>
        {right}
      </View>
    </View>
  );
}
