import { Link } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable } from 'react-native';

import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';

export function DashboardHeaderInfoButton() {
  const colorScheme = useColorScheme();
  const textColor = Colors[colorScheme].text;

  return (
    <Link href="/modal" asChild>
      <Pressable style={{ marginRight: 15 }}>
        {({ pressed }) => (
          <SymbolView
            name={{ ios: 'info.circle', android: 'info', web: 'info' }}
            size={22}
            tintColor={textColor}
            style={{ opacity: pressed ? 0.5 : 1 }}
          />
        )}
      </Pressable>
    </Link>
  );
}
