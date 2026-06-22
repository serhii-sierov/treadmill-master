import type { WithSyncMetadata } from '@/core/sync/types';

/** One executed slice of a workout — may differ from the original program segment. */
export type SessionSegmentLogEntry = {
  id: string;
  programSegmentId: string;
  programSegmentIndex: number;
  label?: string;
  plannedDurationSeconds: number;
  plannedSpeedKmh: number;
  plannedInclinePercent: number;
  elapsedSeconds: number;
  actualSpeedKmh?: number;
  actualInclinePercent?: number;
  /** Ran the full planned duration before leaving this segment. */
  completed: boolean;
};

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
  /** Actual segment execution order — includes skips, repeats, and console overrides. */
  segmentLog: SessionSegmentLogEntry[];
}>;

export interface WorkoutProgress {
  sessionId: string;
  programId: string;
  programName: string;
  segmentIndex: number;
  segmentElapsedSeconds: number;
  totalElapsedSeconds: number;
  isPaused: boolean;
  /** Belt stopped unexpectedly (e.g. emergency stop) — timer frozen until user continues or ends. */
  isInterrupted: boolean;
  isActive: boolean;
  /** Segments executed so far in this session. */
  segmentLog: SessionSegmentLogEntry[];
  /** Treadmill odometer at workout start (informational; totals use accumulated*). */
  baselineDistanceKm: number;
  baselineCalories: number;
  /** Session totals integrated from treadmill — survives counter resets. */
  accumulatedDistanceKm: number;
  accumulatedCalories: number;
  lastTreadmillDistanceKm: number;
  lastTreadmillCalories: number;
  /** Ignore belt-stop detection until after FTMS commands settle. */
  beltCheckGraceUntil?: number;
  /** Why the workout was interrupted — from FTMS Fitness Machine Status. */
  interruptionReason?: WorkoutInterruptionReason;
}

export type WorkoutInterruptionReason = 'safety_key' | 'user_stop' | 'user_pause' | 'belt_stopped';
