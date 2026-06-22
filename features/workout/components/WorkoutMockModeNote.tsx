import { StyleSheet, Text } from 'react-native';

import Colors from '@/constants/Colors';
import {
  getMockTreadmillReasonMessage,
  getTreadmillModeDiagnostics,
  isUsingMockTreadmill,
} from '@/core/treadmill';

interface WorkoutMockModeNoteProps {
  connected: boolean;
  colors: (typeof Colors)['light'];
}

export function WorkoutMockModeNote(props: Readonly<WorkoutMockModeNoteProps>) {
  const { connected, colors } = props;

  if (connected || !isUsingMockTreadmill()) {
    return null;
  }

  return (
    <Text style={[styles.note, { color: colors.muted }]}>
      {getMockTreadmillReasonMessage(getTreadmillModeDiagnostics().mockReason) ||
        'Running in mock mode. Install the development build on a real iPhone to control your treadmill over BLE.'}
    </Text>
  );
}

const styles = StyleSheet.create({
  note: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
});
