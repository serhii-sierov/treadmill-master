export type { WorkoutProgress, WorkoutSession } from '@/features/workout/types';

export {
  applySegmentToTreadmill,
  getCurrentSegment,
  getNextSegment,
  getOverallProgressPercent,
  getRemainingSegmentSeconds,
  getTotalProgramSeconds,
  getWorkoutSessionStats,
  startSegmentOnTreadmill,
} from '@/features/workout/engine';

export type { SessionRepository } from '@/features/workout/repository.interface';

export {
  insertSession,
  loadSessions,
  sessionRepository,
} from '@/features/workout/repository.local';
