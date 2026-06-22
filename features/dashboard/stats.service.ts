import { ensureDatabaseReady, getDatabase } from '@/core/database';
import type {
  DashboardStats,
  TopProgramStat,
  WeeklyDayStat,
} from '@/features/dashboard/types';
import { mapSessionRow, type SessionRow } from '@/features/workout/mappers';

type TotalsRow = {
  total_workouts: number;
  completed_workouts: number;
  total_seconds: number | null;
  total_distance_km: number | null;
  total_calories: number | null;
};

type WeeklyTotalsRow = {
  workouts: number;
  completed_workouts: number;
  total_seconds: number | null;
  total_distance_km: number | null;
  total_calories: number | null;
};

type DailyRow = {
  day: string;
  workouts: number;
  total_seconds: number | null;
  distance_km: number | null;
};

type TopProgramRow = {
  program_id: string;
  program_name: string;
  session_count: number;
  total_seconds: number | null;
};

export async function loadDashboardStats(): Promise<DashboardStats> {
  await ensureDatabaseReady();
  const db = await getDatabase();

  const [totals, weeklyTotals, dailyRows, topPrograms, recentSessions, programCount] = await Promise.all([
    db.getFirstAsync<TotalsRow>(`
      SELECT
        COUNT(*) AS total_workouts,
        SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) AS completed_workouts,
        SUM(total_duration_seconds) AS total_seconds,
        SUM(distance_km) AS total_distance_km,
        SUM(calories) AS total_calories
      FROM sessions
    `),
    db.getFirstAsync<WeeklyTotalsRow>(`
      SELECT
        COUNT(*) AS workouts,
        SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) AS completed_workouts,
        SUM(total_duration_seconds) AS total_seconds,
        SUM(distance_km) AS total_distance_km,
        SUM(calories) AS total_calories
      FROM sessions
      WHERE started_at >= datetime('now', '-6 days', 'start of day')
    `),
    db.getAllAsync<DailyRow>(`
      SELECT
        date(started_at) AS day,
        COUNT(*) AS workouts,
        SUM(total_duration_seconds) AS total_seconds,
        SUM(distance_km) AS distance_km
      FROM sessions
      WHERE started_at >= datetime('now', '-6 days', 'start of day')
      GROUP BY date(started_at)
      ORDER BY day ASC
    `),
    db.getAllAsync<TopProgramRow>(`
      SELECT
        program_id,
        program_name,
        COUNT(*) AS session_count,
        SUM(total_duration_seconds) AS total_seconds
      FROM sessions
      GROUP BY program_id, program_name
      ORDER BY session_count DESC, total_seconds DESC
      LIMIT 5
    `),
    db.getAllAsync<SessionRow>(`
      SELECT * FROM sessions
      ORDER BY started_at DESC
      LIMIT 5
    `),
    db.getFirstAsync<{ total: number }>('SELECT COUNT(*) AS total FROM programs'),
  ]);

  const weeklyDays = buildWeeklyDays(dailyRows);

  return {
    totalWorkouts: totals?.total_workouts ?? 0,
    completedWorkouts: totals?.completed_workouts ?? 0,
    totalMinutes: Math.round((totals?.total_seconds ?? 0) / 60),
    totalDistanceKm: totals?.total_distance_km ?? 0,
    totalCalories: totals?.total_calories ?? 0,
    programCount: programCount?.total ?? 0,
    weekly: {
      workouts: weeklyTotals?.workouts ?? 0,
      completedWorkouts: weeklyTotals?.completed_workouts ?? 0,
      minutes: Math.round((weeklyTotals?.total_seconds ?? 0) / 60),
      distanceKm: weeklyTotals?.total_distance_km ?? 0,
      calories: weeklyTotals?.total_calories ?? 0,
      days: weeklyDays,
    },
    topPrograms: topPrograms.map(mapTopProgram),
    recentSessions: recentSessions.map(mapSessionRow),
  };
}

function buildWeeklyDays(dailyRows: DailyRow[]): WeeklyDayStat[] {
  const byDay = new Map(
    dailyRows.map((row) => [
      row.day,
      {
        workouts: row.workouts,
        minutes: Math.round((row.total_seconds ?? 0) / 60),
        distanceKm: row.distance_km ?? 0,
      },
    ]),
  );

  return getLast7DayKeys().map(({ date, label }) => {
    const day = byDay.get(date);
    return {
      date,
      label,
      workouts: day?.workouts ?? 0,
      minutes: day?.minutes ?? 0,
      distanceKm: day?.distanceKm ?? 0,
    };
  });
}

function getLast7DayKeys(): { date: string; label: string }[] {
  const formatter = new Intl.DateTimeFormat(undefined, { weekday: 'short' });
  const days: { date: string; label: string }[] = [];

  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() - offset);
    days.push({
      date: toDateKey(date),
      label: formatter.format(date),
    });
  }

  return days;
}

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function mapTopProgram(row: TopProgramRow): TopProgramStat {
  return {
    programId: row.program_id,
    programName: row.program_name,
    sessionCount: row.session_count,
    totalMinutes: Math.round((row.total_seconds ?? 0) / 60),
  };
}
