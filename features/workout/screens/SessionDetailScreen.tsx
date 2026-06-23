import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import Colors from '@/constants/Colors';
import type { InclineUnit } from '@/constants/TreadmillSettings';
import { formatSessionLogSegmentLine } from '@/features/workout/format-segment-targets';
import type { WorkoutSession } from '@/features/workout/types';
import { formatDistance, formatDuration } from '@/utils/format';

interface SessionDetailScreenProps {
  session: WorkoutSession;
  inclineUnit: InclineUnit;
  colors: (typeof Colors)['light'];
  onDelete: () => void;
}

export function SessionDetailScreen(props: Readonly<SessionDetailScreenProps>) {
  const { session, inclineUnit, colors, onDelete } = props;
  const startedAt = new Date(session.startedAt);

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.title, { color: colors.text }]}>{session.programName}</Text>
      <Text style={[styles.meta, { color: colors.muted }]}>
        {startedAt.toLocaleString()} · {session.completed ? 'Completed' : 'Partial'}
      </Text>

      <View style={styles.statsRow}>
        <StatBlock
          label="Duration"
          value={formatDuration(session.totalDurationSeconds)}
          colors={colors}
        />
        <StatBlock label="Distance" value={formatDistance(session.distanceKm)} colors={colors} />
        <StatBlock label="Calories" value={`${session.calories}`} colors={colors} />
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Session history</Text>
      <Text style={[styles.sectionHint, { color: colors.muted }]}>
        What you actually ran — including skips, repeats, and console adjustments (actual values in
        brackets).
      </Text>

      {session.segmentLog.length === 0 ? (
        <View
          style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <Text style={[styles.emptyText, { color: colors.muted }]}>
            No segment details were recorded for this workout.
          </Text>
        </View>
      ) : (
        session.segmentLog.map((entry, index) => (
          <View
            key={entry.id}
            style={[
              styles.segmentCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={styles.segmentHeader}>
              <Text style={[styles.segmentTitle, { color: colors.text }]}>
                #{index + 1} · {entry.label ?? `Segment ${entry.programSegmentIndex + 1}`}
              </Text>
              <Text style={[styles.segmentDuration, { color: colors.text }]}>
                {formatDuration(entry.elapsedSeconds)}
                {!entry.completed ? (
                  <Text
                    style={{ color: colors.muted }}
                  >{` / ${formatDuration(entry.plannedDurationSeconds)}`}</Text>
                ) : null}
              </Text>
            </View>
            <Text style={[styles.segmentTargets, { color: colors.muted }]}>
              {formatSessionLogSegmentLine(
                entry.plannedSpeedKmh,
                entry.plannedInclinePercent,
                entry.actualSpeedKmh,
                entry.actualInclinePercent,
                inclineUnit,
              )}
            </Text>
            {!entry.completed ? (
              <Text style={[styles.skippedHint, { color: colors.muted }]}>
                Skipped or repeated early
              </Text>
            ) : null}
          </View>
        ))
      )}

      <Pressable
        onPress={onDelete}
        style={[styles.deleteButton, { borderColor: colors.danger, backgroundColor: colors.card }]}
      >
        <Text style={[styles.deleteLabel, { color: colors.danger }]}>Delete workout</Text>
      </Pressable>
    </ScrollView>
  );
}

function StatBlock(
  props: Readonly<{
    label: string;
    value: string;
    colors: (typeof Colors)['light'];
  }>,
) {
  const { label, value, colors } = props;

  return (
    <View style={[styles.statBlock, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.statLabel, { color: colors.muted }]}>{label}</Text>
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    gap: 12,
    paddingBottom: 40,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
  },
  meta: {
    fontSize: 14,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },
  statBlock: {
    flexGrow: 1,
    minWidth: '30%',
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 8,
  },
  sectionHint: {
    fontSize: 14,
    lineHeight: 20,
  },
  emptyCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
  },
  segmentCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 6,
  },
  segmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  segmentTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
  },
  segmentDuration: {
    fontSize: 15,
    fontWeight: '700',
  },
  segmentTargets: {
    fontSize: 14,
    lineHeight: 20,
  },
  skippedHint: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  deleteButton: {
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  deleteLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
});
