import { ensureDatabaseReady, getDatabase } from '@/core/database';
import { mapSessionRow, serializeSessionLog, type SessionRow } from '@/features/workout/mappers';
import type { SessionRepository } from '@/features/workout/repository.interface';
import type { WorkoutSession } from '@/features/workout/types';

class LocalSessionRepository implements SessionRepository {
  async loadAll(): Promise<WorkoutSession[]> {
    await ensureDatabaseReady();

    const db = await getDatabase();
    const rows = await db.getAllAsync<SessionRow>(
      'SELECT * FROM sessions ORDER BY started_at DESC',
    );

    return rows.map(mapSessionRow);
  }

  async getById(sessionId: string): Promise<WorkoutSession | null> {
    await ensureDatabaseReady();

    const db = await getDatabase();
    const row = await db.getFirstAsync<SessionRow>(
      'SELECT * FROM sessions WHERE id = ?',
      sessionId,
    );

    return row ? mapSessionRow(row) : null;
  }

  async insert(session: WorkoutSession): Promise<void> {
    await ensureDatabaseReady();
    await persistSession(session);
  }

  async delete(sessionId: string): Promise<void> {
    await ensureDatabaseReady();

    const db = await getDatabase();
    await db.runAsync('DELETE FROM sessions WHERE id = ?', sessionId);
  }
}

async function persistSession(session: WorkoutSession): Promise<void> {
  const db = await getDatabase();

  await db.runAsync(
    `INSERT INTO sessions (
      id, program_id, program_name, started_at, ended_at,
      total_duration_seconds, distance_km, calories, completed, session_log_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      program_id = excluded.program_id,
      program_name = excluded.program_name,
      started_at = excluded.started_at,
      ended_at = excluded.ended_at,
      total_duration_seconds = excluded.total_duration_seconds,
      distance_km = excluded.distance_km,
      calories = excluded.calories,
      completed = excluded.completed,
      session_log_json = excluded.session_log_json`,
    session.id,
    session.programId,
    session.programName,
    session.startedAt,
    session.endedAt ?? null,
    session.totalDurationSeconds,
    session.distanceKm,
    session.calories,
    session.completed ? 1 : 0,
    serializeSessionLog(session.segmentLog),
  );
}

export const localSessionRepository = new LocalSessionRepository();

export const sessionRepository: SessionRepository = localSessionRepository;

export const loadSessions = () => sessionRepository.loadAll();
export const loadSessionById = (sessionId: string) => sessionRepository.getById(sessionId);
export const insertSession = (session: WorkoutSession) => sessionRepository.insert(session);
export const deleteSession = (sessionId: string) => sessionRepository.delete(sessionId);
