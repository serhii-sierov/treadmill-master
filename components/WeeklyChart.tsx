import { StyleSheet, Text, View } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import type { WeeklyDayStat } from '@/features/dashboard/types';

interface WeeklyChartProps {
  days: WeeklyDayStat[];
  metric?: 'minutes' | 'workouts';
}

export function WeeklyChart(props: Readonly<WeeklyChartProps>) {
  const { days, metric = 'minutes' } = props;
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];

  const values = days.map((day) => (metric === 'minutes' ? day.minutes : day.workouts));
  const maxValue = Math.max(...values, 1);

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.title, { color: colors.text }]}>Last 7 days</Text>
      <Text style={[styles.subtitle, { color: colors.muted }]}>
        {metric === 'minutes' ? 'Minutes per day' : 'Workouts per day'}
      </Text>

      <View style={styles.chart}>
        {days.map((day) => {
          const value = metric === 'minutes' ? day.minutes : day.workouts;
          const heightPercent = (value / maxValue) * 100;

          return (
            <View key={day.date} style={styles.barColumn}>
              <Text style={[styles.barValue, { color: colors.muted }]}>{value > 0 ? value : ''}</Text>
              <View style={[styles.barTrack, { backgroundColor: colors.border }]}>
                <View
                  style={[
                    styles.barFill,
                    {
                      height: `${heightPercent}%`,
                      backgroundColor: value > 0 ? colors.tint : 'transparent',
                    },
                  ]}
                />
              </View>
              <Text style={[styles.barLabel, { color: colors.muted }]}>{day.label}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 13,
    marginBottom: 8,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 6,
    minHeight: 140,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  barValue: {
    fontSize: 11,
    fontWeight: '600',
    minHeight: 14,
  },
  barTrack: {
    width: '100%',
    height: 96,
    borderRadius: 8,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: 8,
    minHeight: 4,
  },
  barLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
});
