import type { WorkoutSession } from '@/features/workout/types';

/** Session persistence port — local SQLite today; Supabase sync later. */
export interface SessionRepository {
  loadAll(): Promise<WorkoutSession[]>;
  insert(session: WorkoutSession): Promise<void>;
}
