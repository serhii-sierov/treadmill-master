import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '@/components/PrimaryButton';
import Colors from '@/constants/Colors';
import type { WorkoutProgress } from '@/features/workout/types';

interface WorkoutControlsProps {
  workout: WorkoutProgress | null;
  colors: (typeof Colors)['light'];
  onStart: () => void;
  onPauseResume: () => void;
  onStop: () => void;
}

export function WorkoutControls(props: Readonly<WorkoutControlsProps>) {
  const { workout, colors, onStart, onPauseResume, onStop } = props;

  return (
    <View style={styles.controls}>
      {workout?.isActive ? (
        <>
          {workout.isInterrupted ? (
            <PrimaryButton label="Continue workout" onPress={onPauseResume} colors={colors} />
          ) : (
            <PrimaryButton
              label={workout.isPaused ? 'Resume' : 'Pause'}
              onPress={onPauseResume}
              colors={colors}
            />
          )}
          <Pressable
            onPress={onStop}
            style={[styles.dangerButton, { borderColor: colors.danger, backgroundColor: colors.card }]}>
            <Text style={[styles.dangerLabel, { color: colors.danger }]}>End workout</Text>
          </Pressable>
        </>
      ) : (
        <PrimaryButton label="Start workout" onPress={onStart} colors={colors} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  controls: {
    gap: 10,
    marginTop: 4,
  },
  dangerButton: {
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  dangerLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
});
