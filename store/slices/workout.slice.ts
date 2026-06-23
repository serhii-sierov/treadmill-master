import type { StateCreator } from 'zustand';

import { healthService } from '@/core/health';
import { getTreadmillAdapter } from '@/core/treadmill';
import { logFtms } from '@/core/treadmill/adapters/ftms/ftms-debug';
import {
  applySegmentToTreadmill,
  BELT_SEGMENT_GRACE_MS,
  BELT_START_GRACE_MS,
  SAFETY_KEY_PRE_RESUME_DELAY_MS,
  SAFETY_KEY_RESUME_GRACE_MS,
  deleteSession as deleteSessionFromDb,
  getWorkoutSessionStats,
  insertSession,
  startSegmentOnTreadmill,
} from '@/features/workout';
import {
  detectTreadmillInterruption,
  isExternalWorkoutResume,
  resetBeltStopTracking,
} from '@/features/workout/interruption';
import {
  accumulateSessionMetrics,
  createInitialSessionMetrics,
  reAnchorSessionMetrics,
} from '@/features/workout/session-metrics';
import {
  createEmptySegmentLog,
  finalizeCurrentSegmentLog,
  isProgramCompletedNaturally,
  transitionWorkoutSegment,
} from '@/features/workout/session-log';
import type { WorkoutProgress, WorkoutSession } from '@/features/workout/types';
import type { AppState, WorkoutSlice } from '@/store/types';
import { createId } from '@/utils/id';

let tickTimer: ReturnType<typeof setInterval> | null = null;

export const createWorkoutSlice: StateCreator<AppState, [], [], WorkoutSlice> = (set, get) => ({
  sessions: [],
  workout: null,

  startWorkout: async (programId) => {
    const program = get().programs.find((item) => item.id === programId);
    if (!program || program.segments.length === 0) {
      throw new Error('Program not found or has no segments.');
    }

    const sessionId = createId('session');
    const firstSegment = program.segments[0];

    if (!get().treadmill.connected) {
      throw new Error('Connect your treadmill before starting a workout.');
    }

    const treadmillSnapshot = getTreadmillAdapter().getState();
    await startSegmentOnTreadmill(firstSegment);

    const workout: WorkoutProgress = {
      sessionId,
      programId: program.id,
      programName: program.name,
      segmentIndex: 0,
      segmentElapsedSeconds: 0,
      totalElapsedSeconds: 0,
      isPaused: false,
      isInterrupted: false,
      isActive: true,
      segmentLog: createEmptySegmentLog(),
      ...createInitialSessionMetrics(treadmillSnapshot),
      beltCheckGraceUntil: Date.now() + BELT_START_GRACE_MS,
    };

    resetBeltStopTracking();

    await get().touchProgramUsage(programId);

    set({
      workout,
      selectedProgramId: programId,
      treadmill: getTreadmillAdapter().getState(),
    });

    startWorkoutTimer(get);
  },

  pauseWorkout: async () => {
    const workout = get().workout;
    if (!workout?.isActive || workout.isPaused) {
      return;
    }

    await getTreadmillAdapter().pause();
    resetBeltStopTracking();
    set({
      workout: { ...workout, isPaused: true },
      treadmill: getTreadmillAdapter().getState(),
    });
    stopWorkoutTimer();
  },

  resumeWorkout: async () => {
    const workout = get().workout;
    if (!workout?.isActive || (!workout.isPaused && !workout.isInterrupted)) {
      return;
    }

    const wasSafetyKey = workout.interruptionReason === 'safety_key';
    if (wasSafetyKey && !get().treadmill.connected) {
      throw new Error(
        'Treadmill disconnected after the safety key was pulled. Re-attach the clip, wait for the console to finish booting, then tap Reconnect.',
      );
    }

    const program = get().programs.find((item) => item.id === workout.programId);
    const segment = program?.segments[workout.segmentIndex];
    if (!segment) {
      throw new Error('Current segment not found.');
    }

    if (wasSafetyKey) {
      await delay(SAFETY_KEY_PRE_RESUME_DELAY_MS);
    }

    await startSegmentOnTreadmill(segment, { forceColdStart: wasSafetyKey });
    resetBeltStopTracking();
    const treadmillSnapshot = getTreadmillAdapter().getState();
    set({
      workout: reAnchorSessionMetrics(
        {
          ...workout,
          isPaused: false,
          isInterrupted: false,
          interruptionReason: undefined,
          beltCheckGraceUntil:
            Date.now() + (wasSafetyKey ? SAFETY_KEY_RESUME_GRACE_MS : BELT_START_GRACE_MS),
        },
        treadmillSnapshot,
      ),
      treadmill: treadmillSnapshot,
    });
    startWorkoutTimer(get);
  },

  stopWorkout: async () => {
    const workout = get().workout;
    const treadmill = get().treadmill;
    if (!workout) {
      return;
    }

    stopWorkoutTimer();
    resetBeltStopTracking();
    await getTreadmillAdapter().stop();

    const program = get().programs.find((item) => item.id === workout.programId);
    const completed = program ? isProgramCompletedNaturally(workout, program) : false;
    const workoutWithLog = program
      ? finalizeCurrentSegmentLog(workout, program, treadmill)
      : workout;

    const { distanceKm: sessionDistanceKm, calories: sessionCalories } = getWorkoutSessionStats(
      treadmill,
      workoutWithLog,
    );

    const session: WorkoutSession = {
      id: workout.sessionId,
      programId: workout.programId,
      programName: workout.programName,
      startedAt: new Date(Date.now() - workout.totalElapsedSeconds * 1000).toISOString(),
      endedAt: new Date().toISOString(),
      totalDurationSeconds: workout.totalElapsedSeconds,
      distanceKm: sessionDistanceKm,
      calories: sessionCalories,
      completed,
      segmentLog: workoutWithLog.segmentLog,
    };

    const sessions = [session, ...get().sessions];
    set({
      sessions,
      workout: null,
      treadmill: getTreadmillAdapter().getState(),
    });
    await insertSession(session);
    await healthService.saveWorkout(session);
  },

  goToNextSegment: async () => {
    const workout = get().workout;
    if (!workout?.isActive || workout.isInterrupted) {
      return;
    }

    const program = get().programs.find((item) => item.id === workout.programId);
    if (!program) {
      return;
    }

    const nextIndex = workout.segmentIndex + 1;
    if (nextIndex >= program.segments.length) {
      return;
    }

    await navigateToSegment(get, set, nextIndex);
  },

  goToPreviousSegment: async () => {
    const workout = get().workout;
    if (!workout?.isActive || workout.isInterrupted) {
      return;
    }

    const prevIndex = workout.segmentIndex - 1;
    if (prevIndex < 0) {
      return;
    }

    await navigateToSegment(get, set, prevIndex);
  },

  repeatSegment: async () => {
    const workout = get().workout;
    if (!workout?.isActive || workout.isInterrupted) {
      return;
    }

    await navigateToSegment(get, set, workout.segmentIndex);
  },

  deleteSession: async (sessionId) => {
    await deleteSessionFromDb(sessionId);
    set({ sessions: get().sessions.filter((session) => session.id !== sessionId) });
  },

  tickWorkout: async () => {
    const workout = get().workout;
    if (!workout?.isActive) {
      return;
    }

    const treadmill = get().treadmill;
    const nextWorkout = detectTreadmillInterruption(workout, treadmill);
    if (nextWorkout) {
      if (nextWorkout.isPaused && !nextWorkout.isInterrupted) {
        stopWorkoutTimer();
        set({ workout: nextWorkout, treadmill });
        return;
      }
      if (isExternalWorkoutResume(workout, nextWorkout)) {
        await resumeWorkoutWithSegment(get, set, nextWorkout);
        return;
      }
      if (nextWorkout.isInterrupted) {
        applyWorkoutInterruption(set, workout, nextWorkout, treadmill);
        return;
      }
    }

    if (workout.isPaused || workout.isInterrupted) {
      return;
    }

    const program = get().programs.find((item) => item.id === workout.programId);
    if (!program) {
      await get().stopWorkout();
      return;
    }

    const currentSegment = program.segments[workout.segmentIndex];
    if (!currentSegment) {
      await get().stopWorkout();
      return;
    }

    const nextSegmentElapsed = workout.segmentElapsedSeconds + 1;
    const nextTotalElapsed = workout.totalElapsedSeconds + 1;

    if (nextSegmentElapsed >= currentSegment.durationSeconds) {
      const nextIndex = workout.segmentIndex + 1;
      const nextSegment = program.segments[nextIndex];
      const workoutAtEnd = {
        ...accumulateSessionMetrics(workout, treadmill),
        segmentElapsedSeconds: nextSegmentElapsed,
        totalElapsedSeconds: nextTotalElapsed,
      };

      if (!nextSegment) {
        set({ workout: workoutAtEnd, treadmill });
        await get().stopWorkout();
        return;
      }

      const transitioned = transitionWorkoutSegment(workoutAtEnd, program, treadmill, nextIndex);
      await applySegmentToTreadmill(nextSegment);
      resetBeltStopTracking();
      set({
        workout: {
          ...transitioned,
          totalElapsedSeconds: nextTotalElapsed,
          beltCheckGraceUntil: Date.now() + BELT_SEGMENT_GRACE_MS,
        },
        treadmill: getTreadmillAdapter().getState(),
      });
      return;
    }

    set({
      workout: {
        ...accumulateSessionMetrics(workout, treadmill),
        segmentElapsedSeconds: nextSegmentElapsed,
        totalElapsedSeconds: nextTotalElapsed,
      },
      treadmill: getTreadmillAdapter().getState(),
    });
  },

  checkTreadmillInterruption: () => {
    const workout = get().workout;
    if (!workout) {
      return;
    }

    const treadmill = get().treadmill;
    const nextWorkout = detectTreadmillInterruption(workout, treadmill);
    if (!nextWorkout) {
      return;
    }

    if (nextWorkout.isPaused && !nextWorkout.isInterrupted) {
      stopWorkoutTimer();
      set({ workout: nextWorkout });
      return;
    }

    if (isExternalWorkoutResume(workout, nextWorkout)) {
      void resumeWorkoutWithSegment(get, set, nextWorkout);
      return;
    }

    if (nextWorkout.isInterrupted) {
      applyWorkoutInterruption(set, workout, nextWorkout, treadmill);
    }
  },

  syncWorkoutSessionMetrics: () => {
    const workout = get().workout;
    if (!workout?.isActive) {
      return;
    }

    const treadmill = get().treadmill;

    if (workout.isPaused || workout.isInterrupted) {
      // Keep last odometer readings while paused so counter-reset (safety key) still detects.
      set({
        workout: {
          ...workout,
          lastTreadmillDistanceKm: treadmill.distanceKm,
          lastTreadmillCalories: treadmill.calories,
        },
      });
      return;
    }

    set({ workout: accumulateSessionMetrics(workout, treadmill) });
  },
});

async function resumeWorkoutWithSegment(
  getState: () => AppState,
  setState: (partial: Partial<AppState>) => void,
  workout: WorkoutProgress,
): Promise<void> {
  const program = getState().programs.find((item) => item.id === workout.programId);
  const segment = program?.segments[workout.segmentIndex];
  const treadmill = getState().treadmill;
  const beltAlreadyRunning = treadmill.isRunning && treadmill.speedKmh > 0.5;

  if (segment && !beltAlreadyRunning) {
    try {
      await startSegmentOnTreadmill(segment);
    } catch (error) {
      console.warn('[Workout] Failed to re-apply segment on console resume:', error);
    }
  } else if (beltAlreadyRunning) {
    logFtms('app', '', 'Console resume — syncing timer (belt already running)');
  }

  resetBeltStopTracking();
  const treadmillSnapshot = getTreadmillAdapter().getState();
  setState({
    workout: reAnchorSessionMetrics(
      {
        ...workout,
        isPaused: false,
        isInterrupted: false,
        interruptionReason: undefined,
        beltCheckGraceUntil: Date.now() + BELT_START_GRACE_MS,
      },
      treadmillSnapshot,
    ),
    treadmill: treadmillSnapshot,
  });
  startWorkoutTimer(getState);
}

async function navigateToSegment(
  getState: () => AppState,
  setState: (partial: Partial<AppState>) => void,
  targetIndex: number,
): Promise<void> {
  const workout = getState().workout;
  if (!workout?.isActive || workout.isInterrupted) {
    return;
  }

  const program = getState().programs.find((item) => item.id === workout.programId);
  const segment = program?.segments[targetIndex];
  if (!program || !segment) {
    return;
  }

  const treadmill = getState().treadmill;
  const transitioned = transitionWorkoutSegment(workout, program, treadmill, targetIndex);

  await applySegmentToTreadmill(segment);
  resetBeltStopTracking();

  setState({
    workout: {
      ...transitioned,
      totalElapsedSeconds: workout.totalElapsedSeconds,
      isPaused: workout.isPaused,
      beltCheckGraceUntil: Date.now() + BELT_SEGMENT_GRACE_MS,
    },
    treadmill: getTreadmillAdapter().getState(),
  });
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function applyWorkoutInterruption(
  setState: (partial: Partial<AppState>) => void,
  workout: WorkoutProgress,
  nextWorkout: WorkoutProgress,
  treadmill: AppState['treadmill'],
): void {
  const frozen = accumulateSessionMetrics(workout, treadmill);
  stopWorkoutTimer();
  setState({
    workout: { ...nextWorkout, ...pickSessionMetrics(frozen) },
    treadmill,
  });
  if (nextWorkout.interruptionReason === 'safety_key') {
    getTreadmillAdapter().resetTrainingSessionAfterEmergency();
  }
}

function startWorkoutTimer(getState: () => AppState): void {
  stopWorkoutTimer();
  tickTimer = setInterval(() => {
    getState().tickWorkout();
  }, 1000);
}

function stopWorkoutTimer(): void {
  if (tickTimer) {
    clearInterval(tickTimer);
    tickTimer = null;
  }
}

function pickSessionMetrics(
  workout: WorkoutProgress,
): Pick<
  WorkoutProgress,
  | 'accumulatedDistanceKm'
  | 'accumulatedCalories'
  | 'lastTreadmillDistanceKm'
  | 'lastTreadmillCalories'
> {
  return {
    accumulatedDistanceKm: workout.accumulatedDistanceKm,
    accumulatedCalories: workout.accumulatedCalories,
    lastTreadmillDistanceKm: workout.lastTreadmillDistanceKm,
    lastTreadmillCalories: workout.lastTreadmillCalories,
  };
}

export { loadSessions } from '@/features/workout';
