import type { Program, Segment } from "@/features/programs/types";
import { getTreadmillAdapter } from "@/core/treadmill";
import type { TreadmillState } from "@/core/treadmill/types";
import type { WorkoutProgress } from "@/features/workout/types";

export { getWorkoutSessionStats } from "@/features/workout/session-metrics";

export const BELT_START_GRACE_MS = 6000;
export const BELT_SEGMENT_GRACE_MS = 2500;
/** FitShow-style treadmills reboot (888888888 display test) after safety key reset. */
export const SAFETY_KEY_RESUME_GRACE_MS = 15000;
export const SAFETY_KEY_PRE_RESUME_DELAY_MS = 2500;

export function isTreadmillBeltStopped(treadmill: TreadmillState): boolean {
  return !treadmill.isRunning && treadmill.speedKmh < 0.5;
}

export async function applySegmentToTreadmill(segment: Segment): Promise<void> {
  await getTreadmillAdapter().applySegmentTargets(
    segment.speedKmh,
    segment.inclinePercent,
  );
}

/** FTMS cold start: Start → wait → set targets → Start (required after any belt stop). */
export async function startSegmentOnTreadmill(
  segment: Segment,
  options?: { forceColdStart?: boolean },
): Promise<void> {
  await getTreadmillAdapter().startSegment(
    segment.speedKmh,
    segment.inclinePercent,
    options,
  );
}

export function shouldMonitorBeltStop(workout: WorkoutProgress): boolean {
  return workout.isActive && !workout.isPaused && !workout.isInterrupted;
}

export function isWithinBeltCheckGrace(
  workout: WorkoutProgress,
  now = Date.now(),
): boolean {
  return now < (workout.beltCheckGraceUntil ?? 0);
}

export function getCurrentSegment(
  program: Program,
  progress: WorkoutProgress,
): Segment | null {
  return program.segments[progress.segmentIndex] ?? null;
}

export function getNextSegment(
  program: Program,
  progress: WorkoutProgress,
): Segment | null {
  return program.segments[progress.segmentIndex + 1] ?? null;
}

export function getRemainingSegmentSeconds(
  segment: Segment,
  progress: WorkoutProgress,
): number {
  return Math.max(0, segment.durationSeconds - progress.segmentElapsedSeconds);
}

export function getTotalProgramSeconds(program: Program): number {
  return program.segments.reduce(
    (sum, segment) => sum + segment.durationSeconds,
    0,
  );
}

export function getOverallProgressPercent(
  program: Program,
  progress: WorkoutProgress,
): number {
  const total = getTotalProgramSeconds(program);
  if (total === 0) {
    return 0;
  }
  return Math.min(100, (progress.totalElapsedSeconds / total) * 100);
}
