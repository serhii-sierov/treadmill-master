import { BleManager, type Device, type Subscription } from 'react-native-ble-plx';

import { getMeta, setMeta } from '@/core/database';
import { fireAndForget } from '@/utils/fire-and-forget';
import { BleCommandQueue } from '@/core/treadmill/adapters/ftms/command-queue';
import { hexFromBase64, logFtms } from '@/core/treadmill/adapters/ftms/ftms-debug';
import { base64ToBytes, readSint16Le, readUint16Le } from '@/core/treadmill/adapters/ftms/encoding';
import {
  BLE_COMMAND_INTERVAL_MS,
  BLE_SCAN_DURATION_MS,
  BLE_SESSION_START_TIMEOUT_MS,
  BLE_STATUS_SUBSCRIBE_DELAY_MS,
  FITNESS_MACHINE_CONTROL_POINT_UUID,
  FITNESS_MACHINE_STATUS_UUID,
  FTMS_SERVICE_UUID,
  LAST_BLE_DEVICE_ID_KEY,
  LAST_BLE_DEVICE_NAME_KEY,
  TREADMILL_DATA_UUID,
} from '@/core/treadmill/adapters/ftms/constants';
import {
  buildRequestControlCommand,
  buildSetInclineCommand,
  buildSetSpeedCommand,
  buildStartCommand,
  buildStopCommand,
  describeFitnessMachineStatus,
  parseFitnessMachineStatus,
  parseTreadmillData,
} from '@/core/treadmill/adapters/ftms/protocol';
import { resolveConsoleStopReason } from '@/core/treadmill/adapters/ftms/stop-reason';
import type {
  DiscoveredTreadmill,
  FtmsSessionPhase,
  TreadmillAdapter,
  TreadmillState,
} from '@/core/treadmill/types';

export class FtmsTreadmillAdapter implements TreadmillAdapter {
  private readonly manager = new BleManager();
  private readonly commandQueue = new BleCommandQueue();
  private readonly listeners = new Set<(state: TreadmillState) => void>();

  private device: Device | null = null;
  private dataSubscription: Subscription | null = null;
  private statusSubscription: Subscription | null = null;
  private controlPointSubscription: Subscription | null = null;
  private disconnectSubscription: Subscription | null = null;
  private hasControl = false;
  private sessionPhase: FtmsSessionPhase = 'idle';
  private sessionStartedWaiter: (() => void) | null = null;
  private suppressStopReason = false;
  private suppressStopReasonUntil = 0;
  private lastResumeNotificationAt = 0;
  private trainingSessionActive = false;
  private appResumeInFlight = false;

  private state: TreadmillState = {
    connected: false,
    mode: 'ble',
    speedKmh: 0,
    inclinePercent: 0,
    isRunning: false,
    distanceKm: 0,
    calories: 0,
    ftmsSessionPhase: 'idle',
    ftmsStopReason: null,
    ftmsSessionEvent: null,
  };

  getMode(): 'ble' {
    return 'ble';
  }

  isBleAvailable(): boolean {
    return true;
  }

  async scan(durationMs = BLE_SCAN_DURATION_MS): Promise<DiscoveredTreadmill[]> {
    await this.ensureBluetoothOn();

    const discovered = new Map<string, DiscoveredTreadmill>();

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.manager.stopDeviceScan().catch(() => undefined);
        resolve([...discovered.values()].sort((a, b) => (b.rssi ?? -999) - (a.rssi ?? -999)));
      }, durationMs);

      this.manager.startDeviceScan(
        [FTMS_SERVICE_UUID],
        { allowDuplicates: false },
        (error, device) => {
          if (error) {
            clearTimeout(timeout);
            this.manager.stopDeviceScan().catch(() => undefined);
            reject(error);
            return;
          }

          if (!device) {
            return;
          }

          discovered.set(device.id, {
            id: device.id,
            name: device.name ?? device.localName ?? 'Unknown treadmill',
            rssi: device.rssi,
          });
        },
      );
    });
  }

  async connect(deviceId: string): Promise<void> {
    await this.disconnect();

    const connectedDevice = await this.manager.connectToDevice(deviceId, { timeout: 15000 });
    await connectedDevice.discoverAllServicesAndCharacteristics();

    this.device = connectedDevice;
    this.hasControl = false;
    this.sessionPhase = 'idle';
    this.trainingSessionActive = false;

    this.dataSubscription = connectedDevice.monitorCharacteristicForService(
      FTMS_SERVICE_UUID,
      TREADMILL_DATA_UUID,
      (error, characteristic) => {
        if (error || !characteristic?.value) {
          return;
        }

        const parsed = parseTreadmillData(characteristic.value);
        const speedKmh = parsed.speedKmh ?? this.state.speedKmh;

        this.updateState({
          speedKmh,
          inclinePercent: parsed.inclinePercent ?? this.state.inclinePercent,
          distanceKm: parsed.distanceKm ?? this.state.distanceKm,
          calories: parsed.calories ?? this.state.calories,
          isRunning: speedKmh > 0.5,
        });

        if (speedKmh > 0.5) {
          this.resolveSessionStartedWaiter();
        }
      },
    );

    await delay(BLE_STATUS_SUBSCRIBE_DELAY_MS);

    this.statusSubscription = connectedDevice.monitorCharacteristicForService(
      FTMS_SERVICE_UUID,
      FITNESS_MACHINE_STATUS_UUID,
      (error, characteristic) => {
        if (error || !characteristic?.value) {
          return;
        }
        this.handleFitnessMachineStatus(characteristic.value);
      },
    );

    this.controlPointSubscription = connectedDevice.monitorCharacteristicForService(
      FTMS_SERVICE_UUID,
      FITNESS_MACHINE_CONTROL_POINT_UUID,
      () => {
        // Indications reserved for future response-code handling.
      },
    );

    this.disconnectSubscription = connectedDevice.onDisconnected(() => {
      fireAndForget(() => this.handleUnexpectedDisconnect());
    });

    await this.commandQueue.enqueue(() => this.writeControl(buildRequestControlCommand()));
    this.hasControl = true;

    const deviceName = connectedDevice.name ?? connectedDevice.localName ?? 'FTMS Treadmill';
    await Promise.all([
      setMeta(LAST_BLE_DEVICE_ID_KEY, deviceId),
      setMeta(LAST_BLE_DEVICE_NAME_KEY, deviceName),
    ]);

    this.updateState({
      connected: true,
      deviceId,
      deviceName,
      mode: 'ble',
      ftmsSessionPhase: this.sessionPhase,
      ftmsStopReason: null,
      ftmsSessionEvent: null,
    });
  }

  async reconnectLast(): Promise<void> {
    const deviceId = await getMeta(LAST_BLE_DEVICE_ID_KEY);
    if (!deviceId) {
      throw new Error('No previously connected treadmill found.');
    }

    await this.connect(deviceId);
  }

  async disconnect(): Promise<void> {
    this.dataSubscription?.remove();
    this.dataSubscription = null;
    this.statusSubscription?.remove();
    this.statusSubscription = null;
    this.controlPointSubscription?.remove();
    this.controlPointSubscription = null;
    this.disconnectSubscription?.remove();
    this.disconnectSubscription = null;
    this.hasControl = false;
    this.sessionPhase = 'idle';
    this.sessionStartedWaiter = null;
    this.trainingSessionActive = false;
    this.commandQueue.reset();

    if (this.device) {
      try {
        await this.device.cancelConnection();
      } catch {
        // Device may already be disconnected.
      }
    }

    this.device = null;
    this.updateState({
      connected: false,
      deviceId: undefined,
      deviceName: undefined,
      isRunning: false,
      speedKmh: 0,
      inclinePercent: 0,
      ftmsSessionPhase: 'idle',
      ftmsStopReason: null,
    });
  }

  async start(): Promise<void> {
    this.ensureConnected();
    await this.commandQueue.enqueue(async () => {
      await this.writeControl(buildStartCommand());
      this.updateState({ isRunning: true });
    });
  }

  async stop(): Promise<void> {
    this.ensureConnected();
    this.beginSuppressStopReason();
    try {
      await this.commandQueue.enqueue(async () => {
        await this.writeControl(buildStopCommand());
        await this.delayCommandGap();
        await this.writeControl(buildSetSpeedCommand(0));
        await this.delayCommandGap();
        await this.writeControl(buildSetInclineCommand(0));
        this.sessionPhase = 'idle';
        this.trainingSessionActive = false;
        this.updateState({
          isRunning: false,
          speedKmh: 0,
          inclinePercent: 0,
          ftmsSessionPhase: 'idle',
        });
      });
    } finally {
      this.endSuppressStopReason();
    }
  }

  async pause(): Promise<void> {
    this.ensureConnected();
    this.beginSuppressStopReason();
    try {
      // Stop belt without zeroing target speed — preserves program values for resume.
      await this.commandQueue.enqueue(async () => {
        await this.writeControl(buildStopCommand());
        this.sessionPhase = 'paused';
        this.trainingSessionActive = false;
        this.updateState({
          isRunning: false,
          speedKmh: 0,
          ftmsSessionPhase: 'paused',
        });
      });
    } finally {
      this.endSuppressStopReason();
    }
  }

  async setSpeed(speedKmh: number): Promise<void> {
    this.ensureConnected();
    await this.commandQueue.enqueue(async () => {
      await this.writeControl(buildSetSpeedCommand(speedKmh));
      this.updateState({ speedKmh, targetSpeedKmh: speedKmh });
    });
  }

  async setIncline(inclinePercent: number): Promise<void> {
    this.ensureConnected();
    await this.commandQueue.enqueue(async () => {
      await this.writeControl(buildSetInclineCommand(inclinePercent));
      this.updateState({ inclinePercent, targetInclinePercent: inclinePercent });
    });
  }

  async applySegmentTargets(speedKmh: number, inclinePercent: number): Promise<void> {
    this.ensureConnected();
    await this.commandQueue.enqueue(async () => {
      await this.writeControl(buildSetInclineCommand(inclinePercent));
      await this.delayCommandGap();
      await this.writeControl(buildSetSpeedCommand(speedKmh));
      this.updateState({
        speedKmh,
        inclinePercent,
        targetSpeedKmh: speedKmh,
        targetInclinePercent: inclinePercent,
      });
    });
  }

  async startSegment(
    speedKmh: number,
    inclinePercent: number,
    options?: { forceColdStart?: boolean },
  ): Promise<void> {
    this.ensureConnected();
    this.appResumeInFlight = true;
    try {
      await this.commandQueue.enqueue(async () => {
        if (options?.forceColdStart) {
          this.prepareColdStart();
        }

        await this.ensureControl();

        // Some FTMS firmware only applies app speed/incline after Start → wait → targets → Start.
        logFtms(
          'app',
          '',
          `Segment start → ${speedKmh.toFixed(1)} km/h @ ${inclinePercent.toFixed(1)}%`,
        );

        await this.writeControl(buildStartCommand());
        await this.waitForSessionStarted(BLE_SESSION_START_TIMEOUT_MS);
        this.trainingSessionActive = true;

        await this.applyTrainingTargets(speedKmh, inclinePercent);
        await this.delayCommandGap();
        await this.writeControl(buildStartCommand());

        this.sessionPhase = 'active';
        this.updateState({
          isRunning: true,
          speedKmh,
          inclinePercent,
          targetSpeedKmh: speedKmh,
          targetInclinePercent: inclinePercent,
          ftmsSessionPhase: 'active',
          ftmsStopReason: null,
        });
      });
    } finally {
      this.appResumeInFlight = false;
    }
  }

  isAppResumeInFlight(): boolean {
    return this.appResumeInFlight;
  }

  clearFtmsStopReason(): void {
    this.updateState({ ftmsStopReason: null });
  }

  clearFtmsSessionEvent(): void {
    this.updateState({ ftmsSessionEvent: null });
  }

  resetTrainingSessionAfterEmergency(): void {
    this.prepareColdStart();
    logFtms(
      'app',
      '',
      'Safety key (E-07) — FTMS session cleared; expect console reboot before resume',
    );
  }

  private prepareColdStart(): void {
    this.hasControl = false;
    this.sessionPhase = 'idle';
    this.trainingSessionActive = false;
    this.sessionStartedWaiter = null;
    this.updateState({
      isRunning: false,
      speedKmh: 0,
      inclinePercent: 0,
      targetSpeedKmh: undefined,
      targetInclinePercent: undefined,
      ftmsSessionPhase: 'idle',
      ftmsSessionEvent: null,
    });
  }

  getState(): TreadmillState {
    return { ...this.state };
  }

  subscribe(listener: (state: TreadmillState) => void): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  private handleFitnessMachineStatus(base64Value: string): void {
    const hex = hexFromBase64(base64Value);
    const parsed = parseFitnessMachineStatus(base64Value);
    if (!parsed) {
      return;
    }

    const suppressed = this.shouldSuppressStopReason();
    logFtms(
      'status',
      hex,
      `${describeFitnessMachineStatus(parsed)}${suppressed && parsed.stopReason ? ' [app-suppressed]' : ''}`,
    );

    if (parsed.sessionPhase) {
      this.sessionPhase = parsed.sessionPhase;
      if (parsed.sessionPhase === 'active') {
        this.resolveSessionStartedWaiter();
      }
    }

    if (parsed.targetSpeedKmh != null) {
      this.updateState({ targetSpeedKmh: parsed.targetSpeedKmh });
    }

    if (parsed.targetInclinePercent != null) {
      this.updateState({ targetInclinePercent: parsed.targetInclinePercent });
    }

    if (
      parsed.stopReason === 'user_pause' &&
      parsed.userStopType === undefined &&
      (this.state.targetSpeedKmh ?? this.state.speedKmh) <= 0.5
    ) {
      parsed.stopReason = 'safety_key';
      parsed.sessionPhase = 'idle';
    }

    let stopReason = parsed.stopReason;
    if (stopReason) {
      const resolved = resolveConsoleStopReason(
        stopReason,
        parsed.userStopType,
        this.state.targetSpeedKmh ?? this.state.speedKmh,
      );
      if (resolved !== stopReason) {
        stopReason = resolved;
        parsed.sessionPhase = 'paused';
        logFtms('app', '', 'Remapped status 0x02/0x01 → console pause (target speed kept)');
      }
    }

    if (stopReason && !suppressed) {
      if (stopReason === 'user_pause' && Date.now() - this.lastResumeNotificationAt < 1500) {
        return;
      }

      if (stopReason === 'safety_key') {
        this.resetTrainingSessionAfterEmergency();
        this.updateState({
          ftmsStopReason: 'safety_key',
          ftmsLastUserStopType: parsed.userStopType,
        });
      } else {
        this.updateState({
          ftmsStopReason: stopReason,
          ftmsLastUserStopType: parsed.userStopType,
          ftmsSessionPhase: parsed.sessionPhase ?? this.sessionPhase,
          isRunning: false,
          speedKmh: stopReason === 'user_pause' ? 0 : this.state.speedKmh,
          ftmsSessionEvent: null,
        });
      }
      return;
    }

    if (parsed.sessionEvent === 'resumed_by_user') {
      this.lastResumeNotificationAt = Date.now();
      this.updateState({
        ftmsSessionEvent: 'resumed_by_user',
        ftmsSessionPhase: 'active',
        isRunning: true,
        ftmsStopReason: null,
      });
      return;
    }

    this.updateState({ ftmsSessionPhase: this.sessionPhase });
  }

  private beginSuppressStopReason(): void {
    this.suppressStopReason = true;
    this.suppressStopReasonUntil = Date.now() + 2500;
  }

  private endSuppressStopReason(): void {
    this.suppressStopReason = false;
  }

  private shouldSuppressStopReason(): boolean {
    return this.suppressStopReason || Date.now() < this.suppressStopReasonUntil;
  }

  private async waitForSessionStarted(timeoutMs: number): Promise<void> {
    if (this.state.isRunning && this.state.speedKmh > 0.5) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.sessionStartedWaiter = null;
        reject(new Error('Timed out waiting for the treadmill to start the training session.'));
      }, timeoutMs);

      this.sessionStartedWaiter = () => {
        clearTimeout(timer);
        this.sessionStartedWaiter = null;
        resolve();
      };
    });
  }

  private resolveSessionStartedWaiter(): void {
    if (this.sessionPhase !== 'active') {
      this.sessionPhase = 'active';
    }
    this.sessionStartedWaiter?.();
    this.sessionStartedWaiter = null;
  }

  private async applyTrainingTargets(speedKmh: number, inclinePercent: number): Promise<void> {
    await this.writeControl(buildSetInclineCommand(inclinePercent));
    await this.delayCommandGap();
    await this.writeControl(buildSetSpeedCommand(speedKmh));
  }

  private async writeControl(base64Value: string): Promise<void> {
    logFtms('cmd', hexFromBase64(base64Value), describeControlCommand(base64Value));
    if (!this.device) {
      throw new Error('Treadmill is not connected.');
    }

    if (!this.hasControl) {
      await this.device.writeCharacteristicWithResponseForService(
        FTMS_SERVICE_UUID,
        FITNESS_MACHINE_CONTROL_POINT_UUID,
        buildRequestControlCommand(),
      );
      this.hasControl = true;
    }

    await this.device.writeCharacteristicWithResponseForService(
      FTMS_SERVICE_UUID,
      FITNESS_MACHINE_CONTROL_POINT_UUID,
      base64Value,
    );
  }

  private async ensureControl(): Promise<void> {
    if (this.hasControl) {
      return;
    }
    await this.writeControl(buildRequestControlCommand());
    this.hasControl = true;
  }

  private async delayCommandGap(): Promise<void> {
    await delay(BLE_COMMAND_INTERVAL_MS);
  }

  private async ensureBluetoothOn(): Promise<void> {
    const state = await this.manager.state();
    if (state === 'PoweredOn') {
      return;
    }

    if (state === 'PoweredOff') {
      throw new Error('Bluetooth is turned off. Enable Bluetooth and try again.');
    }

    if (state === 'Unauthorized') {
      throw new Error('Bluetooth permission denied. Allow Bluetooth access in Settings.');
    }

    throw new Error(`Bluetooth is not ready (${state}).`);
  }

  private ensureConnected(): void {
    if (!this.device || !this.state.connected) {
      throw new Error('Treadmill is not connected. Scan and connect from the Workout tab.');
    }
  }

  private async handleUnexpectedDisconnect(): Promise<void> {
    this.dataSubscription?.remove();
    this.dataSubscription = null;
    this.statusSubscription?.remove();
    this.statusSubscription = null;
    this.controlPointSubscription?.remove();
    this.controlPointSubscription = null;
    this.disconnectSubscription?.remove();
    this.disconnectSubscription = null;
    this.device = null;
    this.hasControl = false;
    this.sessionPhase = 'idle';
    this.sessionStartedWaiter = null;
    this.trainingSessionActive = false;
    this.commandQueue.reset();
    this.updateState({
      connected: false,
      deviceId: undefined,
      deviceName: undefined,
      isRunning: false,
      ftmsSessionPhase: 'idle',
      ftmsStopReason: 'user_stop',
    });
  }

  private updateState(patch: Partial<TreadmillState>): void {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((listener) => listener(this.getState()));
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function describeControlCommand(base64Value: string): string {
  const bytes = base64ToBytes(base64Value);
  if (bytes.length === 0) {
    return 'Control point (empty)';
  }

  switch (bytes[0]) {
    case 0x00:
      return 'Request control';
    case 0x07:
      return 'Start / Resume';
    case 0x08:
      return bytes[1] === 0x02 ? 'Pause' : 'Stop';
    case 0x02:
      return `Set speed → ${(readUint16Le(bytes, 1) / 100).toFixed(1)} km/h`;
    case 0x03:
      return `Set incline → ${(readSint16Le(bytes, 1) / 10).toFixed(1)}%`;
    default:
      return `Control opcode 0x${bytes[0].toString(16)}`;
  }
}
