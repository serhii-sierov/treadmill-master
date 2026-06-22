export type { WorkoutProgress, WorkoutSession, SessionSegmentLogEntry } from '@/features/workout/types';

export {
  applySegmentToTreadmill,
  BELT_SEGMENT_GRACE_MS,
  BELT_START_GRACE_MS,
  SAFETY_KEY_PRE_RESUME_DELAY_MS,
  SAFETY_KEY_RESUME_GRACE_MS,
  getCurrentSegment,
  getNextSegment,
  getOverallProgressPercent,
  getRemainingSegmentSeconds,
  getTotalProgramSeconds,
  getWorkoutSessionStats,
  isTreadmillBeltStopped,
  startSegmentOnTreadmill,
} from '@/features/workout/engine';

export type { SessionRepository } from '@/features/workout/repository.interface';

export {
  deleteSession,
  insertSession,
  loadSessionById,
  loadSessions,
  sessionRepository,
} from '@/features/workout/repository.local';
