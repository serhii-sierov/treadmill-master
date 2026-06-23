import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';

import { DashboardHeaderInfoButton } from '@/components/DashboardHeaderInfoButton';
import { TabBarSymbolIcon } from '@/components/TabBarSymbolIcon';
import { useColorScheme } from '@/components/useColorScheme';
import { useClientOnlyValue } from '@/components/useClientOnlyValue';
import Colors from '@/constants/Colors';

interface TabIconProps {
  color: ColorValue;
}

function DashboardTabIcon(props: Readonly<TabIconProps>) {
  const { color } = props;
  return (
    <TabBarSymbolIcon
      color={color}
      name={{ ios: 'chart.bar.fill', android: 'bar_chart', web: 'bar_chart' }}
    />
  );
}

function ProgramsTabIcon(props: Readonly<TabIconProps>) {
  const { color } = props;
  return (
    <TabBarSymbolIcon
      color={color}
      name={{ ios: 'list.bullet.rectangle', android: 'list', web: 'list' }}
    />
  );
}

function WorkoutTabIcon(props: Readonly<TabIconProps>) {
  const { color } = props;
  return (
    <TabBarSymbolIcon
      color={color}
      name={{ ios: 'figure.run', android: 'directions_run', web: 'directions_run' }}
    />
  );
}

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme].tint,
        tabBarStyle: {
          backgroundColor: Colors[colorScheme].card,
          borderTopColor: Colors[colorScheme].border,
        },
        headerStyle: {
          backgroundColor: Colors[colorScheme].background,
        },
        headerTintColor: Colors[colorScheme].text,
        headerShown: useClientOnlyValue(false, true),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: DashboardTabIcon,
          headerRight: DashboardHeaderInfoButton,
        }}
      />
      <Tabs.Screen
        name="programs"
        options={{
          title: 'Programs',
          tabBarIcon: ProgramsTabIcon,
        }}
      />
      <Tabs.Screen
        name="workout"
        options={{
          title: 'Workout',
          tabBarIcon: WorkoutTabIcon,
        }}
      />
    </Tabs>
  );
}
