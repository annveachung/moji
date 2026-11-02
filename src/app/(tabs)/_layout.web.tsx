import { Tabs } from 'expo-router/js-tabs';

import { TabBar } from '@/components/tab-bar';
import { useLayout } from '@/lib/layout';
import colors from '@/theme/colors';

// Web version: our own navigation, at the bottom on phone-sized windows and as a sidebar
// on wider ones (it switches live as the window is resized). The iPhone app uses the
// native glass tab bar in _layout.tsx.
export default function TabsLayout() {
  const { isCompact } = useLayout();
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarPosition: isCompact ? 'bottom' : 'left',
        sceneStyle: { backgroundColor: colors.surface.DEFAULT },
      }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="review" />
      <Tabs.Screen name="explore" />
      <Tabs.Screen name="grammar" />
      <Tabs.Screen name="settings" />
    </Tabs>
  );
}
