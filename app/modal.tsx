import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { InclineUnitOption } from '@/components/InclineUnitOption';
import { useAppStore } from '@/store/useAppStore';
import { fireAndForget, fireAndForgetAlert } from '@/utils/fire-and-forget';

export default function AboutModal() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const hydrate = useAppStore((state) => state.hydrate);
  const inclineUnit = useAppStore((state) => state.inclineUnit);
  const setInclineUnit = useAppStore((state) => state.setInclineUnit);

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      onLayout={() => fireAndForget(hydrate())}
    >
      <Text style={[styles.title, { color: colors.text }]}>Treadmill Master</Text>
      <Text style={[styles.body, { color: colors.muted }]}>
        Unlimited custom workout programs for FitShow-compatible treadmills. Real FTMS BLE control
        works in a development build on a physical iPhone.
      </Text>

      <Text style={[styles.section, { color: colors.text }]}>Treadmill settings</Text>
      <Text style={[styles.body, { color: colors.muted }]}>
        FitLogic and similar treadmills use incline levels (0–15), not percent grade. Choose how
        incline is shown in programs and on the workout screen.
      </Text>
      <View style={styles.toggleRow}>
        <InclineUnitOption
          label="Levels (0–15)"
          selected={inclineUnit === 'level'}
          onPress={() => fireAndForgetAlert(setInclineUnit('level'), 'Could not save setting')}
          colors={colors}
        />
        <InclineUnitOption
          label="Percent (%)"
          selected={inclineUnit === 'percent'}
          onPress={() => fireAndForgetAlert(setInclineUnit('percent'), 'Could not save setting')}
          colors={colors}
        />
      </View>

      <Text style={[styles.section, { color: colors.text }]}>Distance & calories</Text>
      <Text style={[styles.body, { color: colors.muted }]}>
        On a real treadmill, distance and calories come from FTMS live data (BLE notifications).
        Saved sessions use the change since workout start, not the treadmill lifetime total. In mock
        mode, distance is estimated from speed; calories use a simple speed-based estimate.
      </Text>

      <Text style={[styles.section, { color: colors.text }]}>Roadmap</Text>
      <Text style={[styles.body, { color: colors.muted }]}>
        • FTMS Bluetooth control (dev build){'\n'}• iOS Live Activity for movie-friendly glanceable
        status{'\n'}• Apple Watch companion{'\n'}• Apple Health workout export
      </Text>

      <Text style={[styles.section, { color: colors.text }]}>JSON import format</Text>
      <Text
        style={[
          styles.code,
          { color: colors.text, backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        {`{
  "programs": [{
    "name": "My Program",
    "segments": [{
      "durationSeconds": 300,
      "speedKmh": 5.5,
      "inclinePercent": 2
    }]
  }]
}`}
      </Text>

      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 24,
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
  },
  section: {
    fontSize: 17,
    fontWeight: '700',
    marginTop: 8,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  code: {
    fontFamily: 'SpaceMono',
    fontSize: 12,
    lineHeight: 18,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
});
