import { StyleSheet, Text, View } from 'react-native';

import Colors from '@/constants/Colors';
import type { InclineUnit } from '@/constants/TreadmillSettings';
import type { Program, Segment } from '@/features/programs/types';
import type { WorkoutProgress } from '@/features/workout/types';
import { formatDistance, formatDuration, formatIncline, formatSpeed } from '@/utils/format';

interface WorkoutHeroCardProps {
  workout: WorkoutProgress | null;
  selectedProgram: Program | null;
  currentSegment: Segment | null;
  progressPercent: number;
  segmentRemaining: number;
  sessionStats: { distanceKm: number; calories: number } | null;
  inclineUnit: InclineUnit;
  colors: (typeof Colors)['light'];
}

export function WorkoutHeroCard(props: Readonly<WorkoutHeroCardProps>) {
  const {
    workout,
    selectedProgram,
    currentSegment,
    progressPercent,
    segmentRemaining,
    sessionStats,
    inclineUnit,
    colors,
  } = props;

  if (workout?.isActive) {
    return (
      <View style={[styles.heroCard, { backgroundColor: colors.tintMuted, borderColor: colors.tint }]}>
        <Text style={[styles.heroLabel, { color: colors.tint }]}>Now playing</Text>
        <Text style={[styles.heroTitle, { color: colors.text }]}>{workout.programName}</Text>
        <Text style={[styles.heroSegment, { color: colors.text }]}>
          {currentSegment?.label ?? `Segment ${workout.segmentIndex + 1}`}
        </Text>
        <Text style={[styles.heroTimer, { color: colors.text }]}>{formatDuration(segmentRemaining)}</Text>
        <Text style={[styles.heroMeta, { color: colors.muted }]}>
          {currentSegment
            ? `${formatSpeed(currentSegment.speedKmh)} · incline ${formatIncline(currentSegment.inclinePercent, inclineUnit)}`
            : ''}
        </Text>
        {sessionStats ? (
          <Text style={[styles.heroMeta, { color: colors.muted }]}>
            Session: {formatDistance(sessionStats.distanceKm)} · {sessionStats.calories} kcal
          </Text>
        ) : null}

        <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
          <View style={[styles.progressFill, { width: `${progressPercent}%`, backgroundColor: colors.tint }]} />
        </View>
        <Text style={[styles.progressLabel, { color: colors.muted }]}>
          {Math.round(progressPercent)}% complete · {formatDuration(workout.totalElapsedSeconds)} elapsed
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.heroLabel, { color: colors.muted }]}>Ready to start</Text>
      <Text style={[styles.heroTitle, { color: colors.text }]}>
        {selectedProgram?.name ?? 'No program selected'}
      </Text>
      <Text style={[styles.heroMeta, { color: colors.muted }]}>
        {selectedProgram
          ? `${selectedProgram.segments.length} segments`
          : 'Go to Programs and tap a workout'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    gap: 6,
  },
  heroLabel: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
  },
  heroSegment: {
    fontSize: 18,
    fontWeight: '600',
  },
  heroTimer: {
    fontSize: 48,
    fontWeight: '800',
    marginTop: 4,
  },
  heroMeta: {
    fontSize: 15,
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: 12,
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  progressLabel: {
    fontSize: 13,
    marginTop: 4,
  },
});
