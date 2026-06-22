import type { SessionSegmentLogEntry, WorkoutSession } from '@/features/workout/types';

export type SessionRow = {
  id: string;
  program_id: string;
  program_name: string;
  started_at: string;
  ended_at: string | null;
  total_duration_seconds: number;
  distance_km: number;
  calories: number;
  completed: number;
  session_log_json: string | null;
};

export function parseSessionLogJson(raw: string | null | undefined): SessionSegmentLogEntry[] {
  if (!raw) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SessionSegmentLogEntry[]) : [];
  } catch {
    return [];
  }
}

export function serializeSessionLog(segmentLog: SessionSegmentLogEntry[]): string {
  return JSON.stringify(segmentLog);
}

export function mapSessionRow(row: SessionRow): WorkoutSession {
  return {
    id: row.id,
    programId: row.program_id,
    programName: row.program_name,
    startedAt: row.started_at,
    endedAt: row.ended_at ?? undefined,
    totalDurationSeconds: row.total_duration_seconds,
    distanceKm: row.distance_km,
    calories: row.calories,
    completed: row.completed === 1,
    segmentLog: parseSessionLogJson(row.session_log_json),
  };
}
