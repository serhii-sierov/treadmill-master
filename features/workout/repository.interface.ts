import type { WorkoutSession } from '@/features/workout/types';

/** Session persistence port — local SQLite today; Supabase sync later. */
export interface SessionRepository {
  loadAll(): Promise<WorkoutSession[]>;
  getById(sessionId: string): Promise<WorkoutSession | null>;
  insert(session: WorkoutSession): Promise<void>;
  delete(sessionId: string): Promise<void>;
}
