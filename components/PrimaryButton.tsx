import { Pressable, StyleSheet, Text } from 'react-native';

import Colors from '@/constants/Colors';

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  colors: (typeof Colors)['light'];
}

export function PrimaryButton(props: Readonly<PrimaryButtonProps>) {
  const { label, onPress, colors } = props;

  return (
    <Pressable onPress={onPress} style={[styles.button, { backgroundColor: colors.tint }]}>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  label: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
});
