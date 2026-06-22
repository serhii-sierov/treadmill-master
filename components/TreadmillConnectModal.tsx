import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useEffect, useState } from 'react';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import {
  getMockTreadmillReasonMessage,
  getTreadmillModeDiagnostics,
  treadmillAdapter,
} from '@/core/treadmill';
import type { DiscoveredTreadmill } from '@/core/treadmill/types';
import { fireAndForget } from '@/utils/fire-and-forget';

interface TreadmillConnectModalProps {
  visible: boolean;
  onClose: () => void;
  onConnect: (deviceId: string) => Promise<void>;
  lastDeviceName?: string;
}

export function TreadmillConnectModal(props: Readonly<TreadmillConnectModalProps>) {
  const { visible, onClose, onConnect, lastDeviceName } = props;
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const [devices, setDevices] = useState<DiscoveredTreadmill[]>([]);
  const [scanning, setScanning] = useState(false);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const diagnostics = getTreadmillModeDiagnostics();
  const isMock = diagnostics.mode === 'mock';
  const mockReasonMessage = diagnostics.mockReason
    ? getMockTreadmillReasonMessage(diagnostics.mockReason)
    : null;

  useEffect(() => {
    if (!visible) {
      return;
    }

    fireAndForget(startScan());
  }, [visible]);

  const startScan = async () => {
    setScanning(true);
    setError(null);
    setDevices([]);

    try {
      const found = await treadmillAdapter.scan();
      setDevices(found);
      if (found.length === 0) {
        setError(
          isMock
            ? 'Simulator uses mock mode. Build a dev client on a real iPhone for BLE.'
            : 'No FTMS treadmills found. Wake the treadmill and keep Bluetooth enabled.',
        );
      }
    } catch (scanError) {
      setError(scanError instanceof Error ? scanError.message : 'Scan failed.');
    } finally {
      setScanning(false);
    }
  };

  const handleConnect = async (deviceId: string) => {
    setConnectingId(deviceId);
    setError(null);

    try {
      await onConnect(deviceId);
      onClose();
    } catch (connectError) {
      setError(connectError instanceof Error ? connectError.message : 'Connection failed.');
    } finally {
      setConnectingId(null);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]}>Connect treadmill</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            {isMock
              ? mockReasonMessage ??
                'Mock mode. Use a development build on a real iPhone for BLE.'
              : 'Scanning for FTMS-compatible treadmills nearby.'}
          </Text>

          {lastDeviceName ? (
            <Text style={[styles.lastDevice, { color: colors.muted }]}>Last connected: {lastDeviceName}</Text>
          ) : null}

          {scanning ? (
            <Text style={[styles.status, { color: colors.muted }]}>Scanning...</Text>
          ) : (
            <View style={styles.deviceList}>
              {devices.map((device) => (
                <Pressable
                  key={device.id}
                  disabled={connectingId !== null}
                  onPress={() => fireAndForget(() => handleConnect(device.id))}
                  style={[
                    styles.deviceRow,
                    { borderColor: colors.border, backgroundColor: colors.background },
                  ]}>
                  <View style={styles.deviceInfo}>
                    <Text style={[styles.deviceName, { color: colors.text }]}>{device.name}</Text>
                    <Text style={[styles.deviceMeta, { color: colors.muted }]}>
                      {device.rssi === null ? 'Signal unknown' : `${device.rssi} dBm`}
                    </Text>
                  </View>
                  <Text style={[styles.connectLabel, { color: colors.tint }]}>
                    {connectingId === device.id ? 'Connecting...' : 'Connect'}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}

          {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}

          <View style={styles.actions}>
            <Pressable
              onPress={() => fireAndForget(startScan())}
              style={[styles.secondaryButton, { borderColor: colors.border }]}>
              <Text style={[styles.secondaryLabel, { color: colors.text }]}>Scan again</Text>
            </Pressable>
            <Pressable onPress={onClose} style={[styles.secondaryButton, { borderColor: colors.border }]}>
              <Text style={[styles.secondaryLabel, { color: colors.text }]}>Close</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    padding: 20,
    gap: 12,
    maxHeight: '80%',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  lastDevice: {
    fontSize: 13,
  },
  status: {
    fontSize: 15,
    paddingVertical: 12,
  },
  deviceList: {
    gap: 8,
  },
  deviceRow: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  deviceInfo: {
    flex: 1,
    gap: 2,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '700',
  },
  deviceMeta: {
    fontSize: 12,
  },
  connectLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  error: {
    fontSize: 13,
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  secondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
});
