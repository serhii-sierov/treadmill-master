import { Pressable, StyleSheet, Text, View } from 'react-native';

import Colors from '@/constants/Colors';

interface WorkoutConnectionRowProps {
  connected: boolean;
  lastConnectedDeviceName: string | null;
  colors: (typeof Colors)['light'];
  onDisconnect: () => void;
  onScanConnect: () => void;
  onReconnect: () => void;
}

export function WorkoutConnectionRow(props: Readonly<WorkoutConnectionRowProps>) {
  const { connected, lastConnectedDeviceName, colors, onDisconnect, onScanConnect, onReconnect } =
    props;

  if (connected) {
    return (
      <View style={styles.connectionRow}>
        <Pressable
          onPress={onDisconnect}
          style={[
            styles.secondaryButton,
            { borderColor: colors.border, backgroundColor: colors.card },
          ]}
        >
          <Text style={[styles.secondaryLabel, { color: colors.text }]}>Disconnect</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.connectionRow}>
      <Pressable
        onPress={onScanConnect}
        style={[
          styles.secondaryButton,
          { borderColor: colors.tint, backgroundColor: colors.tintMuted },
        ]}
      >
        <Text style={[styles.secondaryLabel, { color: colors.tint }]}>Scan & connect</Text>
      </Pressable>
      {lastConnectedDeviceName ? (
        <Pressable
          onPress={onReconnect}
          style={[
            styles.secondaryButton,
            { borderColor: colors.border, backgroundColor: colors.card },
          ]}
        >
          <Text style={[styles.secondaryLabel, { color: colors.text }]}>Reconnect</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  connectionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryButton: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
});
