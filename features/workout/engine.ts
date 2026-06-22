import type { Program, Segment } from '@/features/programs/types';
import { treadmillAdapter } from '@/core/treadmill';
import type { WorkoutProgress } from '@/features/workout/types';

export async function applySegmentToTreadmill(segment: Segment): Promise<void> {
  await treadmillAdapter.setSpeed(segment.speedKmh);
  await treadmillAdapter.setIncline(segment.inclinePercent);
}

/** Set segment targets, start the belt, then re-apply targets (FTMS often ignores pre-start values). */
export async function startSegmentOnTreadmill(segment: Segment): Promise<void> {
  await applySegmentToTreadmill(segment);
  await treadmillAdapter.start();
  if (treadmillAdapter.getMode() === 'ble') {
    await applySegmentToTreadmill(segment);
  }
}

export function getCurrentSegment(program: Program, progress: WorkoutProgress): Segment | null {
  return program.segments[progress.segmentIndex] ?? null;
}

export function getNextSegment(program: Program, progress: WorkoutProgress): Segment | null {
  return program.segments[progress.segmentIndex + 1] ?? null;
}

export function getRemainingSegmentSeconds(segment: Segment, progress: WorkoutProgress): number {
  return Math.max(0, segment.durationSeconds - progress.segmentElapsedSeconds);
}

export function getTotalProgramSeconds(program: Program): number {
  return program.segments.reduce((sum, segment) => sum + segment.durationSeconds, 0);
}

export function getOverallProgressPercent(program: Program, progress: WorkoutProgress): number {
  const total = getTotalProgramSeconds(program);
  if (total === 0) {
    return 0;
  }
  return Math.min(100, (progress.totalElapsedSeconds / total) * 100);
}

export function getWorkoutSessionStats(
  treadmill: { distanceKm: number; calories: number },
  workout: WorkoutProgress,
): { distanceKm: number; calories: number } {
  return {
    distanceKm: Math.max(0, treadmill.distanceKm - workout.baselineDistanceKm),
    calories: Math.max(0, Math.round(treadmill.calories - workout.baselineCalories)),
  };
}
