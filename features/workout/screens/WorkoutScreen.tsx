import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { TreadmillConnectModal } from '@/components/TreadmillConnectModal';
import { TreadmillStatus } from '@/components/TreadmillStatus';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { WorkoutConnectionRow } from '@/features/workout/components/WorkoutConnectionRow';
import { WorkoutControls } from '@/features/workout/components/WorkoutControls';
import { WorkoutHeroCard } from '@/features/workout/components/WorkoutHeroCard';
import { WorkoutInterruptedBanner } from '@/features/workout/components/WorkoutInterruptedBanner';
import { WorkoutMockModeNote } from '@/features/workout/components/WorkoutMockModeNote';
import { FtmsDebugPanel } from '@/components/FtmsDebugPanel';
import { WorkoutSegmentNav } from '@/features/workout/components/WorkoutSegmentNav';
import { WorkoutSegmentList } from '@/features/workout/components/WorkoutSegmentList';
import { buildWorkoutViewModel } from '@/features/workout/workout-view-model';
import { useAppStore } from '@/store/useAppStore';
import { fireAndForgetAlert, getErrorMessage } from '@/utils/fire-and-forget';

import type { WorkoutInterruptionReason } from '@/features/workout/types';

function getInterruptionAlert(reason?: WorkoutInterruptionReason): { title: string; message: string } {
  switch (reason) {
    case 'safety_key':
      return {
        title: 'Safety key pulled (E-07)',
        message:
          'The emergency clip was removed and the treadmill rebooted. Re-attach the safety key, wait until the display finishes its startup test, then tap Continue.',
      };
    case 'user_stop':
      return {
        title: 'Treadmill stopped',
        message: 'The treadmill was stopped from the console. Continue from this segment or end the workout.',
      };
    default:
      return {
        title: 'Treadmill stopped',
        message: 'The belt stopped unexpectedly. Continue from this segment or end the workout.',
      };
  }
}

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
  const goToNextSegment = useAppStore((state) => state.goToNextSegment);
  const goToPreviousSegment = useAppStore((state) => state.goToPreviousSegment);
  const repeatSegment = useAppStore((state) => state.repeatSegment);
  const connectTreadmill = useAppStore((state) => state.connectTreadmill);
  const reconnectTreadmill = useAppStore((state) => state.reconnectTreadmill);
  const disconnectTreadmill = useAppStore((state) => state.disconnectTreadmill);
  const inclineUnit = useAppStore((state) => state.inclineUnit);
  const interruptionAlertShown = useRef(false);

  useEffect(() => {
    fireAndForgetAlert(hydrate(), 'Load failed');
  }, [hydrate]);

  useEffect(() => {
    if (!workout?.isInterrupted) {
      interruptionAlertShown.current = false;
      return;
    }

    if (interruptionAlertShown.current) {
      return;
    }

    if (workout.interruptionReason === 'user_pause') {
      return;
    }

    interruptionAlertShown.current = true;
    const alert = getInterruptionAlert(workout.interruptionReason);
    Alert.alert(alert.title, alert.message, [
      { text: 'End workout', style: 'destructive', onPress: () => fireAndForgetAlert(stopWorkout(), 'End workout failed') },
      { text: 'Continue', onPress: () => fireAndForgetAlert(resumeWorkout(), 'Resume failed') },
    ]);
  }, [workout?.isInterrupted, workout?.interruptionReason, resumeWorkout, stopWorkout]);

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
    const shouldResume = workout?.isPaused || workout?.isInterrupted;
    const action = shouldResume ? resumeWorkout() : pauseWorkout();
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

        {workout?.isInterrupted ? (
          <WorkoutInterruptedBanner reason={workout.interruptionReason} colors={colors} />
        ) : null}

        <WorkoutHeroCard
          workout={workout}
          selectedProgram={viewModel.selectedProgram}
          currentSegment={viewModel.currentSegment}
          progressPercent={viewModel.progressPercent}
          segmentRemaining={viewModel.segmentRemaining}
          sessionStats={viewModel.sessionStats}
          treadmill={treadmill}
          inclineUnit={inclineUnit}
          colors={colors}
        />

        {workout?.isActive && viewModel.activeProgram ? (
          <WorkoutSegmentNav
            segmentIndex={workout.segmentIndex}
            segmentCount={viewModel.activeProgram.segments.length}
            disabled={workout.isInterrupted}
            colors={colors}
            onPrevious={() => fireAndForgetAlert(goToPreviousSegment(), 'Segment navigation failed')}
            onRepeat={() => fireAndForgetAlert(repeatSegment(), 'Segment navigation failed')}
            onNext={() => fireAndForgetAlert(goToNextSegment(), 'Segment navigation failed')}
          />
        ) : null}

        <WorkoutSegmentList
          program={viewModel.activeProgram}
          workout={workout}
          treadmill={treadmill}
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

        <FtmsDebugPanel visible={treadmill.connected && treadmill.mode === 'ble'} colors={colors} />

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
