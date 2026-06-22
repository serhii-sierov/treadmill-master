import { useRef } from 'react';
import { StyleSheet, Text, TextInput, View, type View as ViewType } from 'react-native';

import Colors from '@/constants/Colors';

interface SegmentEditorFieldProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  onFocus?: (field: ViewType) => void;
  colors: (typeof Colors)['light'];
}

export function SegmentEditorField(props: Readonly<SegmentEditorFieldProps>) {
  const { label, value, onChangeText, onFocus, colors } = props;
  const fieldRef = useRef<ViewType>(null);

  return (
    <View ref={fieldRef} collapsable={false} style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.muted }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onFocus={() => {
          if (fieldRef.current) {
            onFocus?.(fieldRef.current);
          }
        }}
        keyboardType="decimal-pad"
        style={[styles.input, { color: colors.text, borderColor: colors.border }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    flex: 1,
    gap: 4,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 15,
  },
});
