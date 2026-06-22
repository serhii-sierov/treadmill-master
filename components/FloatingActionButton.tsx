import { Pressable, StyleSheet } from 'react-native';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';

interface FloatingActionButtonProps {
  accessibilityLabel: string;
  onPress: () => void;
  size: 'small' | 'large';
  backgroundColor: string;
  borderColor: string;
  icon: SymbolViewProps['name'];
  iconColor: string;
}

export function FloatingActionButton(props: Readonly<FloatingActionButtonProps>) {
  const { accessibilityLabel, onPress, size, backgroundColor, borderColor, icon, iconColor } = props;
  const dimension = size === 'large' ? 56 : 48;
  const iconSize = size === 'large' ? 24 : 20;

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.fab,
        {
          width: dimension,
          height: dimension,
          borderRadius: dimension / 2,
          backgroundColor,
          borderColor,
          opacity: pressed ? 0.88 : 1,
        },
      ]}>
      <SymbolView name={icon} size={iconSize} tintColor={iconColor} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 6,
  },
});
