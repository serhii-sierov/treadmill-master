import { StyleSheet, Text, View } from 'react-native';

import Colors from '@/constants/Colors';
import type { WorkoutInterruptionReason } from '@/features/workout/types';

interface WorkoutInterruptedBannerProps {
  reason?: WorkoutInterruptionReason;
  colors: (typeof Colors)['light'];
}

function getInterruptionCopy(reason?: WorkoutInterruptionReason): { title: string; body: string } {
  switch (reason) {
    case 'safety_key':
      return {
        title: 'Safety key pulled (E-07)',
        body: 'The emergency clip was removed and the console rebooted (display test). Re-attach the key, wait for the treadmill to finish booting, then continue from this segment or end the workout.',
      };
    case 'user_stop':
      return {
        title: 'Treadmill stopped',
        body: 'The treadmill was stopped from the console. Your timer is paused at the current segment.',
      };
    default:
      return {
        title: 'Treadmill stopped',
        body: 'The belt stopped unexpectedly. Your timer is paused at the current segment — continue when ready or end the workout.',
      };
  }
}

export function WorkoutInterruptedBanner(props: Readonly<WorkoutInterruptedBannerProps>) {
  const { reason, colors } = props;
  const copy = getInterruptionCopy(reason);

  return (
    <View
      style={[styles.banner, { backgroundColor: colors.danger + '18', borderColor: colors.danger }]}
    >
      <Text style={[styles.title, { color: colors.danger }]}>{copy.title}</Text>
      <Text style={[styles.body, { color: colors.text }]}>{copy.body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 6,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
  },
});
