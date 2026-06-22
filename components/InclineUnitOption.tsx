import { Pressable, StyleSheet, Text } from 'react-native';

import Colors from '@/constants/Colors';

interface InclineUnitOptionProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  colors: (typeof Colors)['light'];
}

export function InclineUnitOption(props: Readonly<InclineUnitOptionProps>) {
  const { label, selected, onPress, colors } = props;

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.toggleOption,
        {
          borderColor: selected ? colors.tint : colors.border,
          backgroundColor: selected ? colors.tintMuted : colors.card,
        },
      ]}>
      <Text style={[styles.toggleLabel, { color: selected ? colors.tint : colors.text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  toggleOption: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
});
