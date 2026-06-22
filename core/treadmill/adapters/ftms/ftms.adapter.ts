import { BleManager, type Device, type Subscription } from 'react-native-ble-plx';

import { getMeta, setMeta } from '@/core/database';
import { fireAndForget } from '@/utils/fire-and-forget';
import { BleCommandQueue } from '@/core/treadmill/adapters/ftms/command-queue';
import {
  BLE_SCAN_DURATION_MS,
  FITNESS_MACHINE_CONTROL_POINT_UUID,
  FTMS_SERVICE_UUID,
  LAST_BLE_DEVICE_ID_KEY,
  LAST_BLE_DEVICE_NAME_KEY,
  TREADMILL_DATA_UUID,
} from '@/core/treadmill/adapters/ftms/constants';
import {
  buildPauseCommand,
  buildRequestControlCommand,
  buildSetInclineCommand,
  buildSetSpeedCommand,
  buildStartCommand,
  buildStopCommand,
  parseTreadmillData,
} from '@/core/treadmill/adapters/ftms/protocol';
import type { DiscoveredTreadmill, TreadmillAdapter, TreadmillState } from '@/core/treadmill/types';

export class FtmsTreadmillAdapter implements TreadmillAdapter {
  private readonly manager = new BleManager();
  private readonly commandQueue = new BleCommandQueue();
  private readonly listeners = new Set<(state: TreadmillState) => void>();

  private device: Device | null = null;
  private dataSubscription: Subscription | null = null;
  private disconnectSubscription: Subscription | null = null;
  private hasControl = false;

  private state: TreadmillState = {
    connected: false,
    mode: 'ble',
    speedKmh: 0,
    inclinePercent: 0,
    isRunning: false,
    distanceKm: 0,
    calories: 0,
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

      this.manager.startDeviceScan([FTMS_SERVICE_UUID], { allowDuplicates: false }, (error, device) => {
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
      });
    });
  }

  async connect(deviceId: string): Promise<void> {
    await this.disconnect();

    const connectedDevice = await this.manager.connectToDevice(deviceId, { timeout: 15000 });
    await connectedDevice.discoverAllServicesAndCharacteristics();

    this.device = connectedDevice;
    this.hasControl = false;

    this.dataSubscription = connectedDevice.monitorCharacteristicForService(
      FTMS_SERVICE_UUID,
      TREADMILL_DATA_UUID,
      (error, characteristic) => {
        if (error || !characteristic?.value) {
          return;
        }

        const parsed = parseTreadmillData(characteristic.value);
        this.updateState({
          speedKmh: parsed.speedKmh ?? this.state.speedKmh,
          inclinePercent: parsed.inclinePercent ?? this.state.inclinePercent,
          distanceKm: parsed.distanceKm ?? this.state.distanceKm,
          calories: parsed.calories ?? this.state.calories,
          isRunning: parsed.isRunning ?? this.state.isRunning,
        });
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
    this.disconnectSubscription?.remove();
    this.disconnectSubscription = null;
    this.hasControl = false;
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
    });
  }

  async start(): Promise<void> {
    this.ensureConnected();
    await this.commandQueue.enqueue(() => this.writeControl(buildStartCommand()));
    this.updateState({ isRunning: true });
  }

  async stop(): Promise<void> {
    this.ensureConnected();
    await this.commandQueue.enqueue(() => this.writeControl(buildStopCommand()));
    await this.commandQueue.enqueue(() => this.writeControl(buildSetSpeedCommand(0)));
    await this.commandQueue.enqueue(() => this.writeControl(buildSetInclineCommand(0)));
    this.updateState({ isRunning: false, speedKmh: 0, inclinePercent: 0 });
  }

  async pause(): Promise<void> {
    this.ensureConnected();
    await this.commandQueue.enqueue(() => this.writeControl(buildPauseCommand()));
    await this.commandQueue.enqueue(() => this.writeControl(buildSetSpeedCommand(0)));
    this.updateState({ isRunning: false, speedKmh: 0 });
  }

  async setSpeed(speedKmh: number): Promise<void> {
    this.ensureConnected();
    await this.commandQueue.enqueue(() => this.writeControl(buildSetSpeedCommand(speedKmh)));
    this.updateState({ speedKmh });
  }

  async setIncline(inclinePercent: number): Promise<void> {
    this.ensureConnected();
    await this.commandQueue.enqueue(() => this.writeControl(buildSetInclineCommand(inclinePercent)));
    this.updateState({ inclinePercent });
  }

  getState(): TreadmillState {
    return { ...this.state };
  }

  subscribe(listener: (state: TreadmillState) => void): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  private async writeControl(base64Value: string): Promise<void> {
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
    this.disconnectSubscription?.remove();
    this.disconnectSubscription = null;
    this.device = null;
    this.hasControl = false;
    this.commandQueue.reset();
    this.updateState({
      connected: false,
      deviceId: undefined,
      deviceName: undefined,
      isRunning: false,
    });
  }

  private updateState(patch: Partial<TreadmillState>): void {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((listener) => listener(this.getState()));
  }
}
