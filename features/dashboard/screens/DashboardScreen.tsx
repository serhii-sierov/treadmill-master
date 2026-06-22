import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { StatCard } from '@/components/StatCard';
import { WeeklyChart } from '@/components/WeeklyChart';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { loadDashboardStats } from '@/features/dashboard';
import { useAppStore } from '@/store/useAppStore';
import type { DashboardStats } from '@/features/dashboard/types';
import { formatDistance, formatDuration } from '@/utils/format';
import { fireAndForgetAlert } from '@/utils/fire-and-forget';

export function DashboardScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const hydrate = useAppStore((state) => state.hydrate);
  const hydrated = useAppStore((state) => state.hydrated);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshStats = useCallback(async () => {
    setLoading(true);
    try {
      if (!useAppStore.getState().hydrated) {
        await hydrate();
      }
      const nextStats = await loadDashboardStats();
      setStats(nextStats);
    } finally {
      setLoading(false);
    }
  }, [hydrate]);

  useFocusEffect(
    useCallback(() => {
      fireAndForgetAlert(refreshStats(), 'Could not load statistics');
    }, [refreshStats]),
  );

  if (!hydrated || loading || !stats) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.muted }}>Loading statistics...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}>
      <Text style={[styles.heading, { color: colors.text }]}>Your progress</Text>
      <Text style={[styles.subheading, { color: colors.muted }]}>
        Track workouts while you watch movies — stats stay on your phone.
      </Text>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>All time</Text>
      <View style={styles.statsGrid}>
        <StatCard
          label="Workouts"
          value={String(stats.totalWorkouts)}
          hint={`${stats.completedWorkouts} completed`}
        />
        <StatCard label="Minutes" value={String(stats.totalMinutes)} />
        <StatCard label="Distance" value={formatDistance(stats.totalDistanceKm)} />
        <StatCard label="Programs" value={String(stats.programCount)} hint="Unlimited custom" />
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>This week</Text>
      <View style={styles.statsGrid}>
        <StatCard
          label="Workouts"
          value={String(stats.weekly.workouts)}
          hint={`${stats.weekly.completedWorkouts} completed`}
        />
        <StatCard label="Minutes" value={String(stats.weekly.minutes)} />
        <StatCard label="Distance" value={formatDistance(stats.weekly.distanceKm)} />
        <StatCard label="Calories" value={String(stats.weekly.calories)} />
      </View>

      <WeeklyChart days={stats.weekly.days} metric="minutes" />

      {stats.topPrograms.length > 0 ? (
        <>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Top programs</Text>
          {stats.topPrograms.map((program) => (
            <View
              key={program.programId}
              style={[styles.rankCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.rankMain}>
                <Text style={[styles.rankTitle, { color: colors.text }]}>{program.programName}</Text>
                <Text style={[styles.rankMeta, { color: colors.muted }]}>
                  {program.sessionCount} workouts · {program.totalMinutes} min
                </Text>
              </View>
            </View>
          ))}
        </>
      ) : null}

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent workouts</Text>
      {stats.recentSessions.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No workouts yet</Text>
          <Text style={[styles.emptyBody, { color: colors.muted }]}>
            Pick a program and start your first session from the Workout tab.
          </Text>
        </View>
      ) : (
        stats.recentSessions.map((session) => (
          <View
            key={session.id}
            style={[styles.sessionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View>
              <Text style={[styles.sessionTitle, { color: colors.text }]}>{session.programName}</Text>
              <Text style={[styles.sessionMeta, { color: colors.muted }]}>
                {new Date(session.startedAt).toLocaleDateString()}
              </Text>
            </View>
            <View style={styles.sessionStats}>
              <Text style={[styles.sessionValue, { color: colors.text }]}>
                {formatDuration(session.totalDurationSeconds)}
              </Text>
              <Text style={[styles.sessionMeta, { color: colors.muted }]}>
                {formatDistance(session.distanceKm)} · {session.completed ? 'Done' : 'Partial'}
              </Text>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 20,
    gap: 16,
    paddingBottom: 40,
  },
  heading: {
    fontSize: 28,
    fontWeight: '800',
  },
  subheading: {
    fontSize: 15,
    lineHeight: 22,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 8,
  },
  rankCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  rankMain: {
    gap: 2,
  },
  rankTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  rankMeta: {
    fontSize: 13,
  },
  emptyCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    gap: 6,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  emptyBody: {
    fontSize: 14,
    lineHeight: 20,
  },
  sessionCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  sessionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  sessionMeta: {
    fontSize: 13,
  },
  sessionStats: {
    alignItems: 'flex-end',
    gap: 2,
  },
  sessionValue: {
    fontSize: 16,
    fontWeight: '700',
  },
});
