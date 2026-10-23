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
      className="border-b border-sumi/10 bg-cream">
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
          <View className="h-8 w-8 items-center justify-center rounded-lg bg-sumi">
            <Text className="text-[17px] font-bold text-amber">文</Text>
          </View>
          <View className="flex-1">
            <Text className="font-display text-[19px] leading-6 text-sumi">moji</Text>
            <Text numberOfLines={1} className="text-[11px] text-sumi-light">
              {subtitle}
            </Text>
          </View>
        </View>
        {right}
      </View>
    </View>
  );
}
