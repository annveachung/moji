import { Tabs } from 'expo-router/js-tabs';

import { TabBar } from '@/components/tab-bar';
import colors from '@/theme/colors';

// Web (desktop) version: our custom tab bar. Phones use the native glass bar in _layout.tsx.
export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.surface.DEFAULT } }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="library" />
      <Tabs.Screen name="review" />
      <Tabs.Screen name="explore" />
      <Tabs.Screen name="settings" />
    </Tabs>
  );
}
