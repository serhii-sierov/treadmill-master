import { StyleSheet, Text, View } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import type { InclineUnit } from '@/constants/TreadmillSettings';
import type { TreadmillState } from '@/core/treadmill/types';
import type { Segment } from '@/features/programs/types';
import { formatSegmentTargetsWithActual } from '@/features/workout/format-segment-targets';
import { formatDuration, formatIncline, formatSpeed } from '@/utils/format';

interface SegmentRowProps {
  segment: Segment;
  index: number;
  active?: boolean;
  treadmill?: TreadmillState;
  inclineUnit?: InclineUnit;
}

export function SegmentRow(props: Readonly<SegmentRowProps>) {
  const { segment, index, active, treadmill, inclineUnit = 'level' } = props;
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];

  return (
    <View
      style={[
        styles.row,
        {
          backgroundColor: active ? colors.tintMuted : colors.card,
          borderColor: active ? colors.tint : colors.border,
        },
      ]}
    >
      <View style={styles.left}>
        <Text style={[styles.index, { color: colors.muted }]}>#{index + 1}</Text>
        <Text style={[styles.label, { color: colors.text }]}>
          {segment.label ?? `Segment ${index + 1}`}
        </Text>
      </View>
      <View style={styles.metrics}>
        <Text style={[styles.metric, { color: colors.text }]}>
          {formatDuration(segment.durationSeconds)}
        </Text>
        <Text style={[styles.metric, { color: colors.muted }]}>
          {treadmill
            ? formatSegmentTargetsWithActual(
                segment.speedKmh,
                segment.inclinePercent,
                treadmill,
                inclineUnit,
              )
            : `${formatSpeed(segment.speedKmh)} · incline ${formatIncline(segment.inclinePercent, inclineUnit)}`}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  left: {
    flex: 1,
    gap: 2,
  },
  index: {
    fontSize: 12,
    fontWeight: '600',
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
  },
  metrics: {
    alignItems: 'flex-end',
    gap: 2,
  },
  metric: {
    fontSize: 13,
    fontWeight: '500',
  },
});
