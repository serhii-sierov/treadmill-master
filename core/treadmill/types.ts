export type TreadmillConnectionMode = 'ble' | 'mock';

/** FTMS training session phase tracked from Fitness Machine Status (0x2ADA). */
export type FtmsSessionPhase = 'idle' | 'active' | 'paused';

/** Reason the treadmill stopped — from FTMS status subscription, not speed inference. */
export type FtmsStopReason = 'safety_key' | 'user_stop' | 'user_pause';

/** Positive session events from Fitness Machine Status (0x2ADA). */
export type FtmsSessionEvent = 'resumed_by_user';

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
  /** Console / FTMS target speed — updated on keyboard changes (0x2ADA). */
  targetSpeedKmh?: number;
  /** Console / FTMS target incline — updated on keyboard changes (0x2ADA). */
  targetInclinePercent?: number;
  isRunning: boolean;
  distanceKm: number;
  calories: number;
  heartRate?: number;
  /** FTMS session phase when connected over BLE. */
  ftmsSessionPhase?: FtmsSessionPhase;
  /** Set from Fitness Machine Status — safety key / console stop. */
  ftmsStopReason?: FtmsStopReason | null;
  /** Console Start/Resume (FTMS 0x04) while app tracks the session. */
  ftmsSessionEvent?: FtmsSessionEvent | null;
  /** Last param byte from status 0x02 — needed to interpret 0x01 as console pause. */
  ftmsLastUserStopType?: number;
}

export interface StartSegmentOptions {
  /** After safety-key reboot — always run Start → wait → set targets → Start. */
  forceColdStart?: boolean;
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
  /** Apply targets while the training session is already active (segment transitions). */
  applySegmentTargets(speedKmh: number, inclinePercent: number): Promise<void>;
  /**
   * Start a segment — always uses FTMS cold start: Start → wait → set targets → Start.
   * Segment transitions while the belt is running use applySegmentTargets instead.
   */
  startSegment(speedKmh: number, inclinePercent: number, options?: StartSegmentOptions): Promise<void>;
  /** Clear consumed FTMS stop reason after the app handles it. */
  clearFtmsStopReason(): void;
  clearFtmsSessionEvent(): void;
  /** Safety key (E-07) reboots the console — drop FTMS session state for a cold start on resume. */
  resetTrainingSessionAfterEmergency(): void;
  /** True while the app is sending Start/targets (ignore console-led resume telemetry). */
  isAppResumeInFlight(): boolean;
  getState(): TreadmillState;
  subscribe(listener: (state: TreadmillState) => void): () => void;
}

export type MockTreadmillReason =
  | 'web'
  | 'expo-go'
  | 'no-native-ble'
  | 'env-flag'
  | null;
