import type { Program, Segment } from '@/features/programs/types';
import type { TreadmillState } from '@/core/treadmill/types';
import { getTreadmillTargetValues } from '@/features/workout/format-segment-targets';
import type { SessionSegmentLogEntry, WorkoutProgress } from '@/features/workout/types';
import { createId } from '@/utils/id';

export function createEmptySegmentLog(): SessionSegmentLogEntry[] {
  return [];
}

export function buildSegmentLogEntry(
  segment: Segment,
  programSegmentIndex: number,
  elapsedSeconds: number,
  treadmill: TreadmillState,
): SessionSegmentLogEntry {
  const actual = getTreadmillTargetValues(treadmill);
  return {
    id: createId('seglog'),
    programSegmentId: segment.id,
    programSegmentIndex,
    label: segment.label,
    plannedDurationSeconds: segment.durationSeconds,
    plannedSpeedKmh: segment.speedKmh,
    plannedInclinePercent: segment.inclinePercent,
    elapsedSeconds,
    actualSpeedKmh: actual.speedKmh,
    actualInclinePercent: actual.inclinePercent,
    completed: elapsedSeconds >= segment.durationSeconds,
  };
}

export function appendSegmentLogEntry(
  workout: WorkoutProgress,
  entry: SessionSegmentLogEntry,
): WorkoutProgress {
  return { ...workout, segmentLog: [...workout.segmentLog, entry] };
}

/** Record current segment time and move to another index (or repeat same). */
export function transitionWorkoutSegment(
  workout: WorkoutProgress,
  program: Program,
  treadmill: TreadmillState,
  targetIndex: number,
): WorkoutProgress {
  const currentSegment = program.segments[workout.segmentIndex];
  let next = workout;

  if (currentSegment && workout.segmentElapsedSeconds > 0) {
    next = appendSegmentLogEntry(
      next,
      buildSegmentLogEntry(
        currentSegment,
        workout.segmentIndex,
        workout.segmentElapsedSeconds,
        treadmill,
      ),
    );
  }

  return {
    ...next,
    segmentIndex: targetIndex,
    segmentElapsedSeconds: 0,
  };
}

export function finalizeCurrentSegmentLog(
  workout: WorkoutProgress,
  program: Program,
  treadmill: TreadmillState,
): WorkoutProgress {
  const currentSegment = program.segments[workout.segmentIndex];
  if (!currentSegment || workout.segmentElapsedSeconds <= 0) {
    return workout;
  }

  return appendSegmentLogEntry(
    workout,
    buildSegmentLogEntry(
      currentSegment,
      workout.segmentIndex,
      workout.segmentElapsedSeconds,
      treadmill,
    ),
  );
}

export function isProgramCompletedNaturally(
  workout: WorkoutProgress,
  program: Program,
): boolean {
  const lastIndex = program.segments.length - 1;
  const lastSegment = program.segments[lastIndex];
  if (!lastSegment) {
    return false;
  }

  return (
    workout.segmentIndex === lastIndex &&
    workout.segmentElapsedSeconds >= lastSegment.durationSeconds
  );
}
