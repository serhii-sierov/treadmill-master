export type TreadmillConnectionMode = 'ble' | 'mock';

export interface DiscoveredTreadmill {
  id: string;
  name: string;
  rssi: number | null;
}

export interface TreadmillState {
  connected: boolean;
  mode: TreadmillConnectionMode;
  deviceId?: string;
  deviceName?: string;
  speedKmh: number;
  inclinePercent: number;
  isRunning: boolean;
  distanceKm: number;
  calories: number;
  heartRate?: number;
}

/**
 * Port for treadmill device drivers (mock, FTMS/BLE, future protocols).
 * Each implementation lives under `core/treadmill/adapters/`.
 */
export interface TreadmillAdapter {
  getMode(): TreadmillConnectionMode;
  isBleAvailable(): boolean;
  scan(durationMs?: number): Promise<DiscoveredTreadmill[]>;
  connect(deviceId: string): Promise<void>;
  reconnectLast(): Promise<void>;
  disconnect(): Promise<void>;
  start(): Promise<void>;
  stop(): Promise<void>;
  pause(): Promise<void>;
  setSpeed(speedKmh: number): Promise<void>;
  setIncline(inclinePercent: number): Promise<void>;
  getState(): TreadmillState;
  subscribe(listener: (state: TreadmillState) => void): () => void;
}

export type MockTreadmillReason =
  | 'web'
  | 'expo-go'
  | 'no-native-ble'
  | 'env-flag'
  | null;
