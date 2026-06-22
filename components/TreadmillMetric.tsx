import { StyleSheet, Text, View } from 'react-native';

import Colors from '@/constants/Colors';

interface TreadmillMetricProps {
  label: string;
  value: string;
  colors: (typeof Colors)['light'];
}

export function TreadmillMetric(props: Readonly<TreadmillMetricProps>) {
  const { label, value, colors } = props;

  return (
    <View style={styles.metric}>
      <Text style={[styles.metricLabel, { color: colors.muted }]}>{label}</Text>
      <Text style={[styles.metricValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  metric: {
    width: '47%',
    gap: 2,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '700',
  },
});
