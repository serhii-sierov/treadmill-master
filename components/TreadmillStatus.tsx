import { StyleSheet, Text, View } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { TreadmillMetric } from '@/components/TreadmillMetric';
import type { InclineUnit } from '@/constants/TreadmillSettings';
import type { TreadmillState } from '@/core/treadmill/types';
import { formatDistance, formatIncline, formatSpeed } from '@/utils/format';

interface TreadmillStatusProps {
  state: TreadmillState;
  inclineUnit?: InclineUnit;
}

export function TreadmillStatus(props: Readonly<TreadmillStatusProps>) {
  const { state, inclineUnit = 'level' } = props;
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const connectionMode = state.mode === 'ble' ? 'BLE' : 'Mock';
  const deviceLabel = state.connected
    ? `${state.deviceName ?? 'Connected'} · ${connectionMode}`
    : 'Not connected';

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Treadmill</Text>
        <View
          style={[
            styles.dot,
            { backgroundColor: state.connected ? colors.success : colors.muted },
          ]}
        />
      </View>

      <Text style={[styles.device, { color: colors.muted }]}>{deviceLabel}</Text>

      <View style={styles.metrics}>
        <TreadmillMetric label="Speed" value={formatSpeed(state.speedKmh)} colors={colors} />
        <TreadmillMetric
          label="Incline"
          value={formatIncline(state.inclinePercent, inclineUnit)}
          colors={colors}
        />
        <TreadmillMetric label="Distance" value={formatDistance(state.distanceKm)} colors={colors} />
        <TreadmillMetric
          label="Status"
          value={state.isRunning ? 'Running' : 'Stopped'}
          colors={colors}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  device: {
    fontSize: 14,
  },
  metrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
});
