import type { Program } from '@/features/programs/types';

/**
 * Program persistence port — local SQLite today.
 * Future: SyncProgramRepository wraps local + Supabase (offline queue, conflict resolution).
 */
export interface ProgramRepository {
  loadAll(): Promise<Program[]>;
  upsert(program: Program): Promise<void>;
  upsertMany(programs: Program[]): Promise<void>;
  delete(id: string): Promise<void>;
  touchLastUsed(id: string): Promise<void>;
}
