import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { TreadmillConnectModal } from '@/components/TreadmillConnectModal';
import { TreadmillStatus } from '@/components/TreadmillStatus';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { WorkoutConnectionRow } from '@/features/workout/components/WorkoutConnectionRow';
import { WorkoutControls } from '@/features/workout/components/WorkoutControls';
import { WorkoutHeroCard } from '@/features/workout/components/WorkoutHeroCard';
import { WorkoutMockModeNote } from '@/features/workout/components/WorkoutMockModeNote';
import { WorkoutSegmentList } from '@/features/workout/components/WorkoutSegmentList';
import { buildWorkoutViewModel } from '@/features/workout/workout-view-model';
import { useAppStore } from '@/store/useAppStore';
import { fireAndForgetAlert, getErrorMessage } from '@/utils/fire-and-forget';

export function WorkoutScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const [connectModalVisible, setConnectModalVisible] = useState(false);

  const hydrate = useAppStore((state) => state.hydrate);
  const hydrated = useAppStore((state) => state.hydrated);
  const programs = useAppStore((state) => state.programs);
  const selectedProgramId = useAppStore((state) => state.selectedProgramId);
  const workout = useAppStore((state) => state.workout);
  const treadmill = useAppStore((state) => state.treadmill);
  const lastConnectedDeviceName = useAppStore((state) => state.lastConnectedDeviceName);
  const startWorkout = useAppStore((state) => state.startWorkout);
  const pauseWorkout = useAppStore((state) => state.pauseWorkout);
  const resumeWorkout = useAppStore((state) => state.resumeWorkout);
  const stopWorkout = useAppStore((state) => state.stopWorkout);
  const connectTreadmill = useAppStore((state) => state.connectTreadmill);
  const reconnectTreadmill = useAppStore((state) => state.reconnectTreadmill);
  const disconnectTreadmill = useAppStore((state) => state.disconnectTreadmill);
  const inclineUnit = useAppStore((state) => state.inclineUnit);

  useEffect(() => {
    fireAndForgetAlert(hydrate(), 'Load failed');
  }, [hydrate]);

  const viewModel = buildWorkoutViewModel(programs, selectedProgramId, workout, treadmill);

  const handleStart = async () => {
    if (!selectedProgramId) {
      Alert.alert('Select a program', 'Choose a program on the Programs tab first.');
      router.push('/programs');
      return;
    }

    if (!treadmill.connected) {
      Alert.alert('Connect treadmill', 'Connect your treadmill before starting the workout.');
      setConnectModalVisible(true);
      return;
    }

    try {
      await startWorkout(selectedProgramId);
    } catch (error) {
      Alert.alert('Could not start workout', getErrorMessage(error));
    }
  };

  const handlePauseResume = () => {
    const action = workout?.isPaused ? resumeWorkout() : pauseWorkout();
    fireAndForgetAlert(action, 'Workout control failed');
  };

  const handleStop = () => {
    Alert.alert('End workout', 'Save this session to your statistics?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'End workout',
        style: 'destructive',
        onPress: () => fireAndForgetAlert(stopWorkout(), 'End workout failed'),
      },
    ]);
  };

  if (!hydrated) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.muted }}>Loading workout...</Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={styles.content}>
        <TreadmillStatus state={treadmill} inclineUnit={inclineUnit} />

        <WorkoutConnectionRow
          connected={treadmill.connected}
          lastConnectedDeviceName={lastConnectedDeviceName}
          colors={colors}
          onDisconnect={() => fireAndForgetAlert(disconnectTreadmill(), 'Disconnect failed')}
          onScanConnect={() => setConnectModalVisible(true)}
          onReconnect={() => fireAndForgetAlert(reconnectTreadmill(), 'Reconnect failed')}
        />

        <WorkoutMockModeNote connected={treadmill.connected} colors={colors} />

        <WorkoutHeroCard
          workout={workout}
          selectedProgram={viewModel.selectedProgram}
          currentSegment={viewModel.currentSegment}
          progressPercent={viewModel.progressPercent}
          segmentRemaining={viewModel.segmentRemaining}
          sessionStats={viewModel.sessionStats}
          inclineUnit={inclineUnit}
          colors={colors}
        />

        <WorkoutSegmentList
          program={viewModel.activeProgram}
          workout={workout}
          inclineUnit={inclineUnit}
          colors={colors}
        />

        <WorkoutControls
          workout={workout}
          colors={colors}
          onStart={handleStart}
          onPauseResume={handlePauseResume}
          onStop={handleStop}
        />

        <Text style={[styles.note, { color: colors.muted }]}>
          Tip: swipe down for notifications during a movie. A Live Activity / Apple Watch companion is planned next.
        </Text>
      </ScrollView>

      <TreadmillConnectModal
        visible={connectModalVisible}
        onClose={() => setConnectModalVisible(false)}
        onConnect={connectTreadmill}
        lastDeviceName={lastConnectedDeviceName ?? undefined}
      />
    </>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 20,
    gap: 16,
    paddingBottom: 40,
  },
  note: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
});
