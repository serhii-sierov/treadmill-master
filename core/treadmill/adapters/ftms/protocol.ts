import { FTMS_OPCODE, FTMS_STOP_PAUSE_TYPE } from '@/core/treadmill/adapters/ftms/constants';
import {
  base64ToBytes,
  bytesToBase64,
  readSint16Le,
  readUint16Le,
  readUint24Le,
  writeSint16Le,
  writeUint16Le,
} from '@/core/treadmill/adapters/ftms/encoding';

export interface ParsedTreadmillData {
  speedKmh?: number;
  inclinePercent?: number;
  distanceKm?: number;
  calories?: number;
  isRunning?: boolean;
}

export function buildControlCommand(opcode: number, payload: number[] = []): string {
  return bytesToBase64([opcode, ...payload]);
}

export function buildRequestControlCommand(): string {
  return buildControlCommand(FTMS_OPCODE.REQUEST_CONTROL);
}

export function buildStartCommand(): string {
  return buildControlCommand(FTMS_OPCODE.START_RESUME);
}

export function buildStopOrPauseCommand(type: number = FTMS_STOP_PAUSE_TYPE.STOP): string {
  return buildControlCommand(FTMS_OPCODE.STOP_PAUSE, [type]);
}

export function buildStopCommand(): string {
  return buildStopOrPauseCommand(FTMS_STOP_PAUSE_TYPE.STOP);
}

export function buildPauseCommand(): string {
  return buildStopOrPauseCommand(FTMS_STOP_PAUSE_TYPE.PAUSE);
}

export function buildSetSpeedCommand(speedKmh: number): string {
  const speedRaw = Math.round(Math.max(0, speedKmh) * 100);
  const [low, high] = writeUint16Le(speedRaw);
  return buildControlCommand(FTMS_OPCODE.SET_TARGET_SPEED, [low, high]);
}

export function buildSetInclineCommand(inclinePercent: number): string {
  const inclineRaw = Math.round(inclinePercent * 10);
  const [low, high] = writeSint16Le(inclineRaw);
  return buildControlCommand(FTMS_OPCODE.SET_TARGET_INCLINE, [low, high]);
}

export function parseTreadmillData(base64Value: string | null | undefined): ParsedTreadmillData {
  if (!base64Value) {
    return {};
  }

  const bytes = base64ToBytes(base64Value);
  if (bytes.length < 2) {
    return {};
  }

  const flags = readUint16Le(bytes, 0);
  let offset = 2;
  const parsed: ParsedTreadmillData = {};

  if (flags & 0x0001) {
    if (offset + 2 > bytes.length) {
      return parsed;
    }
    parsed.speedKmh = readUint16Le(bytes, offset) / 100;
    parsed.isRunning = (parsed.speedKmh ?? 0) > 0;
    offset += 2;
  }

  if (flags & 0x0002) {
    offset += 2;
  }

  if (flags & 0x0004) {
    if (offset + 3 > bytes.length) {
      return parsed;
    }
    parsed.distanceKm = readUint24Le(bytes, offset) / 1000;
    offset += 3;
  }

  if (flags & 0x0008) {
    if (offset + 4 > bytes.length) {
      return parsed;
    }
    parsed.inclinePercent = readSint16Le(bytes, offset) / 10;
    offset += 4;
  }

  if (flags & 0x0080) {
    if (offset + 5 > bytes.length) {
      return parsed;
    }
    parsed.calories = readUint16Le(bytes, offset);
  }

  return parsed;
}
