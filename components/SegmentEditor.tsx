import { Pressable, StyleSheet, Text, TextInput, View, type View as ViewType } from 'react-native';
import { useRef } from 'react';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { SegmentEditorField } from '@/components/SegmentEditorField';
import type { InclineUnit } from '@/constants/TreadmillSettings';
import type { Segment } from '@/features/programs/types';
import { inclineFieldLabel } from '@/utils/format';

interface SegmentEditorProps {
  segment: Segment;
  index: number;
  onChange: (segment: Segment) => void;
  onRemove: () => void;
  canRemove: boolean;
  inclineUnit?: InclineUnit;
  onFieldFocus?: (field: ViewType) => void;
}

export function SegmentEditor(props: Readonly<SegmentEditorProps>) {
  const {
    segment,
    index,
    onChange,
    onRemove,
    canRemove,
    inclineUnit = 'level',
    onFieldFocus,
  } = props;
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const labelFieldRef = useRef<ViewType>(null);

  const updateNumber = (field: 'durationSeconds' | 'speedKmh' | 'inclinePercent', value: string) => {
    const parsed = Number(value.replace(',', '.'));
    if (Number.isNaN(parsed)) {
      return;
    }
    onChange({ ...segment, [field]: parsed });
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Segment {index + 1}</Text>
        {canRemove ? (
          <Pressable onPress={onRemove}>
            <Text style={[styles.remove, { color: colors.danger }]}>Remove</Text>
          </Pressable>
        ) : null}
      </View>

      <View ref={labelFieldRef} collapsable={false}>
        <TextInput
          value={segment.label ?? ''}
          onChangeText={(label) => onChange({ ...segment, label })}
          onFocus={() => {
            if (labelFieldRef.current) {
              onFieldFocus?.(labelFieldRef.current);
            }
          }}
          placeholder="Label (optional)"
          placeholderTextColor={colors.muted}
          style={[styles.input, { color: colors.text, borderColor: colors.border }]}
        />
      </View>

      <View style={styles.row}>
        <SegmentEditorField
          label="Duration (sec)"
          value={String(segment.durationSeconds)}
          onChangeText={(value) => updateNumber('durationSeconds', value)}
          onFocus={onFieldFocus}
          colors={colors}
        />
        <SegmentEditorField
          label="Speed (km/h)"
          value={String(segment.speedKmh)}
          onChangeText={(value) => updateNumber('speedKmh', value)}
          onFocus={onFieldFocus}
          colors={colors}
        />
        <SegmentEditorField
          label={inclineFieldLabel(inclineUnit)}
          value={String(segment.inclinePercent)}
          onChangeText={(value) => updateNumber('inclinePercent', value)}
          onFocus={onFieldFocus}
          colors={colors}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  remove: {
    fontSize: 14,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 15,
  },
});
