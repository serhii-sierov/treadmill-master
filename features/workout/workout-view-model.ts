import type { Program, Segment } from '@/features/programs/types';
import type { WorkoutProgress } from '@/features/workout/types';
import type { TreadmillState } from '@/core/treadmill/types';
import {
  getCurrentSegment,
  getOverallProgressPercent,
  getRemainingSegmentSeconds,
  getWorkoutSessionStats,
} from '@/features/workout';

export interface WorkoutViewModel {
  selectedProgram: Program | null;
  activeProgram: Program | null;
  currentSegment: Segment | null;
  progressPercent: number;
  segmentRemaining: number;
  sessionStats: ReturnType<typeof getWorkoutSessionStats> | null;
}

export function buildWorkoutViewModel(
  programs: Program[],
  selectedProgramId: string | null,
  workout: WorkoutProgress | null,
  treadmill: TreadmillState,
): WorkoutViewModel {
  const selectedProgram = programs.find((program) => program.id === selectedProgramId) ?? null;
  const activeProgram = workout
    ? (programs.find((program) => program.id === workout.programId) ?? null)
    : selectedProgram;
  const currentSegment =
    activeProgram && workout
      ? getCurrentSegment(activeProgram, workout)
      : (activeProgram?.segments[0] ?? null);

  return {
    selectedProgram,
    activeProgram,
    currentSegment,
    progressPercent:
      activeProgram && workout ? getOverallProgressPercent(activeProgram, workout) : 0,
    segmentRemaining:
      currentSegment && workout
        ? getRemainingSegmentSeconds(currentSegment, workout)
        : (currentSegment?.durationSeconds ?? 0),
    sessionStats: workout?.isActive ? getWorkoutSessionStats(treadmill, workout) : null,
  };
}
