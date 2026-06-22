import { Pressable, StyleSheet, Text, View } from 'react-native';

import Colors from '@/constants/Colors';

interface WorkoutSegmentNavProps {
  segmentIndex: number;
  segmentCount: number;
  disabled?: boolean;
  colors: (typeof Colors)['light'];
  onPrevious: () => void;
  onRepeat: () => void;
  onNext: () => void;
}

export function WorkoutSegmentNav(props: Readonly<WorkoutSegmentNavProps>) {
  const {
    segmentIndex,
    segmentCount,
    disabled,
    colors,
    onPrevious,
    onRepeat,
    onNext,
  } = props;

  const atFirst = segmentIndex <= 0;
  const atLast = segmentIndex >= segmentCount - 1;

  return (
    <View style={styles.row}>
      <NavButton
        label="Previous"
        disabled={disabled || atFirst}
        colors={colors}
        onPress={onPrevious}
      />
      <NavButton
        label="Repeat"
        disabled={disabled}
        colors={colors}
        onPress={onRepeat}
        compact
      />
      <NavButton
        label="Next"
        disabled={disabled || atLast}
        colors={colors}
        onPress={onNext}
      />
    </View>
  );
}

function NavButton(props: Readonly<{
  label: string;
  disabled?: boolean;
  compact?: boolean;
  colors: (typeof Colors)['light'];
  onPress: () => void;
}>) {
  const { label, disabled, compact, colors, onPress } = props;

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.button,
        compact && styles.buttonCompact,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          opacity: disabled ? 0.45 : 1,
        },
      ]}>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonCompact: {
    flex: 0.85,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
  },
});
