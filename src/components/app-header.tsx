import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from './ui';

/**
 * The bar at the top of each screen: the moji name with the current page under it,
 * an optional back arrow, and room on the right for things like the streak badge.
 */
export function AppHeader({
  subtitle,
  back = false,
  right,
}: {
  subtitle: string;
  back?: boolean;
  right?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <View
      style={{ paddingTop: insets.top }}
      className="bg-surface">
      <View className="h-14 flex-row items-center justify-between gap-2 px-4">
        <View className="flex-1 flex-row items-center gap-2">
          {back && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('common.back')}
              onPress={() => router.back()}
              hitSlop={12}
              className="-ml-1 h-11 w-9 items-center justify-center">
              <Icon name="arrow-back-ios-new" size={22} />
            </Pressable>
          )}
          <View className="flex-1">
            <View className="flex-row items-baseline gap-1.5">
              <Text className="font-display text-[20px] leading-6 text-ink">moji</Text>
              <Text className="text-[12px] font-bold text-primary">文字</Text>
            </View>
            <Text numberOfLines={1} className="font-display-medium text-[12px] text-ink-soft">
              {subtitle}
            </Text>
          </View>
        </View>
        {right}
      </View>
    </View>
  );
}
