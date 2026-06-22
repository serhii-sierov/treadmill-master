import type { WithSyncMetadata } from '@/core/sync/types';

export type WorkoutSession = WithSyncMetadata<{
  id: string;
  programId: string;
  programName: string;
  startedAt: string;
  endedAt?: string;
  totalDurationSeconds: number;
  distanceKm: number;
  calories: number;
  completed: boolean;
}>;

export interface WorkoutProgress {
  sessionId: string;
  programId: string;
  programName: string;
  segmentIndex: number;
  segmentElapsedSeconds: number;
  totalElapsedSeconds: number;
  isPaused: boolean;
  isActive: boolean;
  /** Treadmill odometer at workout start — session stats use the delta from this. */
  baselineDistanceKm: number;
  baselineCalories: number;
}
