import { Tabs } from 'expo-router/js-tabs';

import { TabBar } from '@/components/tab-bar';
import colors from '@/theme/colors';

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.cream.DEFAULT } }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="library" />
      <Tabs.Screen name="review" />
      <Tabs.Screen name="explore" />
      <Tabs.Screen name="settings" />
    </Tabs>
  );
}
