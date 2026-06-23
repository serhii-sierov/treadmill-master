import { Pressable, StyleSheet, Text } from 'react-native';

import Colors from '@/constants/Colors';

interface TabButtonProps {
  label: string;
  active: boolean;
  onPress: () => void;
  colors: (typeof Colors)['light'];
}

export function TabButton(props: Readonly<TabButtonProps>) {
  const { label, active, onPress, colors } = props;

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.tabButton,
        active
          ? { backgroundColor: colors.tintMuted, borderColor: colors.tint }
          : { borderColor: 'transparent' },
      ]}
    >
      <Text style={[styles.tabLabel, { color: active ? colors.tint : colors.muted }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tabButton: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
});
