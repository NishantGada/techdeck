import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';
import { TabBarButton } from '../../src/components/TabBarButton';
import { TabIcon, type TabIconName } from '../../src/components/TabIcon';
import { useTheme } from '../../src/theme/ThemeContext';

function icon(name: TabIconName) {
  return ({ color, focused }: { color: ColorValue; focused: boolean }) => (
    <TabIcon name={name} color={color} focused={focused} />
  );
}

export default function TabsLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarButton: (props) => <TabBarButton {...props} />,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', letterSpacing: 0.3 },
        tabBarIconStyle: { marginBottom: -2 },
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopWidth: 0,
          elevation: 0,
        },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Feed', tabBarIcon: icon('feed') }} />
      <Tabs.Screen name="topics" options={{ title: 'Topics', tabBarIcon: icon('topics') }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: icon('settings') }} />
    </Tabs>
  );
}
