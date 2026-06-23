import Constants, { ExecutionEnvironment } from "expo-constants";
import * as Device from "expo-device";

import {
  createTreadmillAdapter,
  getMockTreadmillReason,
  isNativeBleModuleAvailableForDiagnostics,
} from "@/core/treadmill/factory";
import type {
  MockTreadmillReason,
  TreadmillAdapter,
} from "@/core/treadmill/types";

export type {
  DiscoveredTreadmill,
  FtmsSessionPhase,
  FtmsStopReason,
  MockTreadmillReason,
  StartSegmentOptions,
  TreadmillAdapter,
  TreadmillConnectionMode,
  TreadmillState,
} from "@/core/treadmill/types";

export { LAST_BLE_DEVICE_NAME_KEY } from "@/core/treadmill/adapters/ftms/constants";
export {
  createTreadmillAdapter,
  getMockTreadmillReason,
} from "@/core/treadmill/factory";

let adapter: TreadmillAdapter | null = null;
let initPromise: Promise<TreadmillAdapter> | null = null;

/** Load mock or FTMS adapter (lazy — BLE native module is not imported on web / Expo Go). */
export async function initTreadmillAdapter(): Promise<TreadmillAdapter> {
  if (adapter) {
    return adapter;
  }

  if (!initPromise) {
    initPromise = createTreadmillAdapter().then((created) => {
      adapter = created;
      return created;
    });
  }

  return initPromise;
}

/** Use after {@link initTreadmillAdapter} has resolved (during app hydrate). */
export function getTreadmillAdapter(): TreadmillAdapter {
  if (!adapter) {
    throw new Error(
      "Treadmill adapter not initialized. Call initTreadmillAdapter() during app hydrate.",
    );
  }

  return adapter;
}

export function isUsingMockTreadmill(): boolean {
  return getMockTreadmillReason() !== null;
}

export function getTreadmillModeDiagnostics(): {
  mode: "ble" | "mock";
  mockReason: MockTreadmillReason;
  isPhysicalDevice: boolean;
  executionEnvironment: ExecutionEnvironment;
  hasBleNativeModule: boolean;
} {
  const mockReason = getMockTreadmillReason();
  return {
    mode: adapter?.getMode() ?? (mockReason ? "mock" : "ble"),
    mockReason,
    isPhysicalDevice: Device.isDevice,
    executionEnvironment: Constants.executionEnvironment,
    hasBleNativeModule: isNativeBleModuleAvailableForDiagnostics(),
  };
}

export function getMockTreadmillReasonMessage(
  reason: MockTreadmillReason,
): string {
  switch (reason) {
    case "web":
      return "Web builds use mock mode.";
    case "expo-go":
      return "Expo Go has no BLE native module. Open the Treadmill Master dev app installed from Xcode, not Expo Go.";
    case "no-native-ble":
      return "BLE native module missing. Run a development build: npm run ios:device";
    case "env-flag":
      return "Mock mode forced by EXPO_PUBLIC_USE_MOCK_TREADMILL=true.";
    default:
      return "";
  }
}
