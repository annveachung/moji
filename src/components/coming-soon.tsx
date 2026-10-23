import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { AppHeader } from './app-header';
import { Card, Icon, Pill, type IconName } from './ui';

/** Stand-in for screens we haven't built yet, so every tab already leads somewhere. */
export function ComingSoon({ title, icon, description }: { title: string; icon: IconName; description: string }) {
  const { t } = useTranslation();
  return (
    <View className="flex-1 bg-cream">
      <AppHeader subtitle={title} />
      <View className="p-4">
        <Card className="items-center gap-3 py-8">
          <View className="h-14 w-14 items-center justify-center rounded-full bg-amber">
            <Icon name={icon} size={28} />
          </View>
          <Text className="font-display text-[20px] text-sumi">{title}</Text>
          <Text className="text-center text-[14px] leading-5 text-sumi-muted">{description}</Text>
          <Pill label={t('common.comingSoon')} tone="outline" />
        </Card>
      </View>
    </View>
  );
}
