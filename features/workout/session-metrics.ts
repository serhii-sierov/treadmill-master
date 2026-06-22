import type { TreadmillState } from '@/core/treadmill/types';
import type { WorkoutProgress } from '@/features/workout/types';

export interface SessionMetricsFields {
  baselineDistanceKm: number;
  baselineCalories: number;
  accumulatedDistanceKm: number;
  accumulatedCalories: number;
  lastTreadmillDistanceKm: number;
  lastTreadmillCalories: number;
}

export function createInitialSessionMetrics(treadmill: TreadmillState): SessionMetricsFields {
  return {
    baselineDistanceKm: treadmill.distanceKm,
    baselineCalories: treadmill.calories,
    accumulatedDistanceKm: 0,
    accumulatedCalories: 0,
    lastTreadmillDistanceKm: treadmill.distanceKm,
    lastTreadmillCalories: treadmill.calories,
  };
}

/**
 * Integrate treadmill odometer readings into session totals.
 * When the belt resets counters (emergency stop / new session), readings drop —
 * we keep accumulated totals and re-anchor to the new zero.
 */
export function accumulateSessionMetrics(
  workout: WorkoutProgress,
  treadmill: TreadmillState,
): WorkoutProgress {
  if (!workout.isActive || workout.isPaused || workout.isInterrupted) {
    return workout;
  }

  const prevDist = workout.lastTreadmillDistanceKm;
  const prevCal = workout.lastTreadmillCalories;
  let accumulatedDistanceKm = workout.accumulatedDistanceKm;
  let accumulatedCalories = workout.accumulatedCalories;

  if (treadmill.distanceKm >= prevDist) {
    accumulatedDistanceKm += treadmill.distanceKm - prevDist;
  }

  if (treadmill.calories >= prevCal) {
    accumulatedCalories += treadmill.calories - prevCal;
  }

  return {
    ...workout,
    accumulatedDistanceKm,
    accumulatedCalories: Math.round(accumulatedCalories),
    lastTreadmillDistanceKm: treadmill.distanceKm,
    lastTreadmillCalories: treadmill.calories,
  };
}

export function getWorkoutSessionStats(
  treadmill: TreadmillState,
  workout: WorkoutProgress,
): { distanceKm: number; calories: number } {
  const merged = accumulateSessionMetrics(workout, treadmill);
  return {
    distanceKm: Math.max(0, merged.accumulatedDistanceKm),
    calories: Math.max(0, merged.accumulatedCalories),
  };
}

/** Re-anchor odometer after treadmill counter reset (e.g. after emergency stop). */
export function reAnchorSessionMetrics(
  workout: WorkoutProgress,
  treadmill: TreadmillState,
): WorkoutProgress {
  return {
    ...workout,
    lastTreadmillDistanceKm: treadmill.distanceKm,
    lastTreadmillCalories: treadmill.calories,
  };
}
