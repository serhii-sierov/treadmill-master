export const FTMS_SERVICE_UUID = '00001826-0000-1000-8000-00805f9b34fb';
export const TREADMILL_DATA_UUID = '00002acd-0000-1000-8000-00805f9b34fb';
export const FITNESS_MACHINE_CONTROL_POINT_UUID = '00002ad9-0000-1000-8000-00805f9b34fb';
export const FITNESS_MACHINE_STATUS_UUID = '00002ada-0000-1000-8000-00805f9b34fb';

export const FTMS_OPCODE = {
  REQUEST_CONTROL: 0x00,
  RESET: 0x01,
  SET_TARGET_SPEED: 0x02,
  SET_TARGET_INCLINE: 0x03,
  START_RESUME: 0x07,
  STOP_PAUSE: 0x08,
} as const;

/** Parameter for Stop/Pause (0x08) — FTMS FitnessMachineStopPauseType */
export const FTMS_STOP_PAUSE_TYPE = {
  STOP: 0x01,
  PAUSE: 0x02,
} as const;

export const LAST_BLE_DEVICE_ID_KEY = 'last_ble_device_id';
export const LAST_BLE_DEVICE_NAME_KEY = 'last_ble_device_name';

export const BLE_COMMAND_INTERVAL_MS = 1000;
export const BLE_SCAN_DURATION_MS = 8000;
