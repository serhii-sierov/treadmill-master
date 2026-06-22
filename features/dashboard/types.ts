import type { WorkoutSession } from '@/features/workout/types';

export interface WeeklyDayStat {
  date: string;
  label: string;
  workouts: number;
  minutes: number;
  distanceKm: number;
}

export interface WeeklyStats {
  workouts: number;
  completedWorkouts: number;
  minutes: number;
  distanceKm: number;
  calories: number;
  days: WeeklyDayStat[];
}

export interface TopProgramStat {
  programId: string;
  programName: string;
  sessionCount: number;
  totalMinutes: number;
}

export interface DashboardStats {
  totalWorkouts: number;
  completedWorkouts: number;
  totalMinutes: number;
  totalDistanceKm: number;
  totalCalories: number;
  programCount: number;
  weekly: WeeklyStats;
  topPrograms: TopProgramStat[];
  recentSessions: WorkoutSession[];
}
