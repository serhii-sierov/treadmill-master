import * as Device from 'expo-device';
import Constants, { ExecutionEnvironment } from 'expo-constants';

import {
  createTreadmillAdapter,
  getMockTreadmillReason,
  isNativeBleModuleAvailableForDiagnostics,
} from '@/core/treadmill/factory';
import type { MockTreadmillReason, TreadmillAdapter } from '@/core/treadmill/types';

export type {
  DiscoveredTreadmill,
  FtmsSessionPhase,
  FtmsStopReason,
  MockTreadmillReason,
  TreadmillAdapter,
  TreadmillConnectionMode,
  TreadmillState,
} from '@/core/treadmill/types';

export { LAST_BLE_DEVICE_NAME_KEY } from '@/core/treadmill/adapters/ftms/constants';
export { createTreadmillAdapter, getMockTreadmillReason } from '@/core/treadmill/factory';

/** App-wide treadmill device instance (mock or FTMS adapter). */
export const treadmillAdapter: TreadmillAdapter = createTreadmillAdapter();

export function isUsingMockTreadmill(): boolean {
  return treadmillAdapter.getMode() === 'mock';
}

export function getTreadmillModeDiagnostics(): {
  mode: 'ble' | 'mock';
  mockReason: MockTreadmillReason;
  isPhysicalDevice: boolean;
  executionEnvironment: ExecutionEnvironment;
  hasBleNativeModule: boolean;
} {
  return {
    mode: treadmillAdapter.getMode(),
    mockReason: getMockTreadmillReason(),
    isPhysicalDevice: Device.isDevice,
    executionEnvironment: Constants.executionEnvironment,
    hasBleNativeModule: isNativeBleModuleAvailableForDiagnostics(),
  };
}

export function getMockTreadmillReasonMessage(reason: MockTreadmillReason): string {
  switch (reason) {
    case 'web':
      return 'Web builds use mock mode.';
    case 'expo-go':
      return 'Expo Go has no BLE native module. Open the Treadmill Master dev app installed from Xcode, not Expo Go.';
    case 'no-native-ble':
      return 'BLE native module missing. Run a development build: npm run ios:device';
    case 'env-flag':
      return 'Mock mode forced by EXPO_PUBLIC_USE_MOCK_TREADMILL=true.';
    default:
      return '';
  }
}
