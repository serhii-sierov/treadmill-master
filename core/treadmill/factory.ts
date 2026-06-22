import Constants, { ExecutionEnvironment } from 'expo-constants';
import { NativeModules, Platform } from 'react-native';

import { MockTreadmillAdapter } from '@/core/treadmill/adapters/mock.adapter';
import type { MockTreadmillReason, TreadmillAdapter } from '@/core/treadmill/types';

function isNativeBleModuleAvailable(): boolean {
  try {
    return NativeModules.BlePlx != null;
  } catch {
    return false;
  }
}

export function getMockTreadmillReason(): MockTreadmillReason {
  if (Platform.OS === 'web') {
    return 'web';
  }

  if (process.env.EXPO_PUBLIC_USE_MOCK_TREADMILL === 'true') {
    return 'env-flag';
  }

  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
    return 'expo-go';
  }

  if (!isNativeBleModuleAvailable()) {
    return 'no-native-ble';
  }

  return null;
}

function shouldUseMockTreadmill(): boolean {
  return getMockTreadmillReason() !== null;
}

/**
 * Picks the active treadmill adapter. Add new device types here
 * (e.g. proprietary SDK) alongside mock and FTMS.
 */
export function createTreadmillAdapter(): TreadmillAdapter {
  if (shouldUseMockTreadmill()) {
    return new MockTreadmillAdapter();
  }

  const { FtmsTreadmillAdapter } =
    require('@/core/treadmill/adapters/ftms/ftms.adapter') as typeof import('@/core/treadmill/adapters/ftms/ftms.adapter');
  return new FtmsTreadmillAdapter();
}

export function isNativeBleModuleAvailableForDiagnostics(): boolean {
  return isNativeBleModuleAvailable();
}
