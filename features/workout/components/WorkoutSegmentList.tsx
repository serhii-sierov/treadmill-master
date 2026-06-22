import { StyleSheet, Text, View } from 'react-native';

import { SegmentRow } from '@/components/SegmentRow';
import Colors from '@/constants/Colors';
import type { InclineUnit } from '@/constants/TreadmillSettings';
import type { Program } from '@/features/programs/types';
import type { WorkoutProgress } from '@/features/workout/types';

interface WorkoutSegmentListProps {
  program: Program | null;
  workout: WorkoutProgress | null;
  inclineUnit: InclineUnit;
  colors: (typeof Colors)['light'];
}

export function WorkoutSegmentList(props: Readonly<WorkoutSegmentListProps>) {
  const { program, workout, inclineUnit, colors } = props;

  if (!program) {
    return null;
  }

  return (
    <View style={styles.segmentList}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Segments</Text>
      {program.segments.map((segment, index) => (
        <SegmentRow
          key={segment.id}
          segment={segment}
          index={index}
          active={workout?.segmentIndex === index}
          inclineUnit={inclineUnit}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  segmentList: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
});
