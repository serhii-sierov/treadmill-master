import type { StateCreator } from "zustand";

import { healthService } from "@/core/health";
import { treadmillAdapter } from "@/core/treadmill";
import {
  applySegmentToTreadmill,
  getWorkoutSessionStats,
  insertSession,
  startSegmentOnTreadmill,
} from "@/features/workout";
import type { WorkoutProgress, WorkoutSession } from "@/features/workout/types";
import type { AppState, WorkoutSlice } from "@/store/types";
import { createId } from "@/utils/id";

let tickTimer: ReturnType<typeof setInterval> | null = null;

export const createWorkoutSlice: StateCreator<
  AppState,
  [],
  [],
  WorkoutSlice
> = (set, get) => ({
  sessions: [],
  workout: null,

  startWorkout: async (programId) => {
    const program = get().programs.find((item) => item.id === programId);
    if (!program || program.segments.length === 0) {
      throw new Error("Program not found or has no segments.");
    }

    const sessionId = createId("session");
    const firstSegment = program.segments[0];

    if (!get().treadmill.connected) {
      throw new Error("Connect your treadmill before starting a workout.");
    }

    const treadmillSnapshot = treadmillAdapter.getState();
    await startSegmentOnTreadmill(firstSegment);

    const workout: WorkoutProgress = {
      sessionId,
      programId: program.id,
      programName: program.name,
      segmentIndex: 0,
      segmentElapsedSeconds: 0,
      totalElapsedSeconds: 0,
      isPaused: false,
      isActive: true,
      baselineDistanceKm: treadmillSnapshot.distanceKm,
      baselineCalories: treadmillSnapshot.calories,
    };

    await get().touchProgramUsage(programId);

    set({
      workout,
      selectedProgramId: programId,
      treadmill: treadmillAdapter.getState(),
    });

    startWorkoutTimer(get);
  },

  pauseWorkout: async () => {
    const workout = get().workout;
    if (!workout?.isActive || workout.isPaused) {
      return;
    }

    await treadmillAdapter.pause();
    set({
      workout: { ...workout, isPaused: true },
      treadmill: treadmillAdapter.getState(),
    });
    stopWorkoutTimer();
  },

  resumeWorkout: async () => {
    const workout = get().workout;
    if (!workout?.isActive || !workout.isPaused) {
      return;
    }

    const program = get().programs.find(
      (item) => item.id === workout.programId,
    );
    const segment = program?.segments[workout.segmentIndex];
    if (!segment) {
      throw new Error("Current segment not found.");
    }

    await startSegmentOnTreadmill(segment);
    set({
      workout: { ...workout, isPaused: false },
      treadmill: treadmillAdapter.getState(),
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
    await treadmillAdapter.stop();

    const program = get().programs.find(
      (item) => item.id === workout.programId,
    );
    const totalDuration = program
      ? program.segments.reduce(
          (sum, segment) => sum + segment.durationSeconds,
          0,
        )
      : workout.totalElapsedSeconds;
    const completed = workout.totalElapsedSeconds >= totalDuration;

    const { distanceKm: sessionDistanceKm, calories: sessionCalories } =
      getWorkoutSessionStats(treadmill, workout);

    const session: WorkoutSession = {
      id: workout.sessionId,
      programId: workout.programId,
      programName: workout.programName,
      startedAt: new Date(
        Date.now() - workout.totalElapsedSeconds * 1000,
      ).toISOString(),
      endedAt: new Date().toISOString(),
      totalDurationSeconds: workout.totalElapsedSeconds,
      distanceKm: sessionDistanceKm,
      calories: sessionCalories,
      completed,
    };

    const sessions = [session, ...get().sessions];
    set({
      sessions,
      workout: null,
      treadmill: treadmillAdapter.getState(),
    });
    await insertSession(session);
    await healthService.saveWorkout(session);
  },

  tickWorkout: async () => {
    const workout = get().workout;
    if (!workout?.isActive || workout.isPaused) {
      return;
    }

    const program = get().programs.find(
      (item) => item.id === workout.programId,
    );
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

      if (!nextSegment) {
        await get().stopWorkout();
        return;
      }

      await applySegmentToTreadmill(nextSegment);
      set({
        workout: {
          ...workout,
          segmentIndex: nextIndex,
          segmentElapsedSeconds: 0,
          totalElapsedSeconds: nextTotalElapsed,
        },
        treadmill: treadmillAdapter.getState(),
      });
      return;
    }

    set({
      workout: {
        ...workout,
        segmentElapsedSeconds: nextSegmentElapsed,
        totalElapsedSeconds: nextTotalElapsed,
      },
      treadmill: treadmillAdapter.getState(),
    });
  },
});

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

export { loadSessions } from "@/features/workout";
