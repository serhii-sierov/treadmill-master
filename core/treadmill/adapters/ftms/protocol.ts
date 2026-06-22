import {
  FTMS_OPCODE,
  FTMS_STATUS_OPCODE,
  FTMS_STOP_PAUSE_TYPE,
} from '@/core/treadmill/adapters/ftms/constants';
import {
  base64ToBytes,
  bytesToBase64,
  readSint16Le,
  readUint16Le,
  readUint24Le,
  writeSint16Le,
  writeUint16Le,
} from '@/core/treadmill/adapters/ftms/encoding';
import type { FtmsSessionPhase, FtmsStopReason } from '@/core/treadmill/types';

export interface ParsedTreadmillData {
  speedKmh?: number;
  inclinePercent?: number;
  distanceKm?: number;
  calories?: number;
  isRunning?: boolean;
}

export interface ParsedFitnessMachineStatus {
  opcode: number;
  userStopType?: number;
  targetSpeedKmh?: number;
  targetInclinePercent?: number;
  stopReason: FtmsStopReason | null;
  sessionPhase: FtmsSessionPhase | null;
  sessionEvent: 'resumed_by_user' | null;
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

/**
 * Parse Treadmill Data (0x2ACD). Instantaneous speed always follows the 2-byte flags field.
 * @see Bluetooth FTMS §4.9.1
 */
export function parseTreadmillData(base64Value: string | null | undefined): ParsedTreadmillData {
  if (!base64Value) {
    return {};
  }

  const bytes = base64ToBytes(base64Value);
  if (bytes.length < 4) {
    return {};
  }

  const flags = readUint16Le(bytes, 0);
  let offset = 2;
  const parsed: ParsedTreadmillData = {};

  parsed.speedKmh = readUint16Le(bytes, offset) / 100;
  parsed.isRunning = parsed.speedKmh > 0.5;
  offset += 2;

  if (flags & 0x0002) {
    offset += 2;
  }

  if (flags & 0x0004) {
    if (offset + 3 <= bytes.length) {
      parsed.distanceKm = readUint24Le(bytes, offset) / 1000;
    }
    offset += 3;
  }

  if (flags & 0x0008) {
    if (offset + 2 <= bytes.length) {
      parsed.inclinePercent = readSint16Le(bytes, offset) / 10;
    }
    offset += 4;
  }

  if (flags & 0x0010) {
    offset += 4;
  }
  if (flags & 0x0020) {
    offset += 1;
  }
  if (flags & 0x0040) {
    offset += 1;
  }

  if (flags & 0x0080) {
    if (offset + 2 <= bytes.length) {
      parsed.calories = readUint16Le(bytes, offset);
    }
    offset += 5;
  }

  return parsed;
}

/** Parse Fitness Machine Status (0x2ADA) — safety key, start/stop, target changes. */
export function parseFitnessMachineStatus(
  base64Value: string | null | undefined,
): ParsedFitnessMachineStatus | null {
  if (!base64Value) {
    return null;
  }

  const bytes = base64ToBytes(base64Value);
  if (bytes.length === 0) {
    return null;
  }

  const opcode = bytes[0];
  const result: ParsedFitnessMachineStatus = {
    opcode,
    stopReason: null,
    sessionPhase: null,
    sessionEvent: null,
  };

  switch (opcode) {
    case FTMS_STATUS_OPCODE.RESET:
      result.stopReason = 'safety_key';
      result.sessionPhase = 'idle';
      break;
    case FTMS_STATUS_OPCODE.STOPPED_BY_SAFETY_KEY:
      result.stopReason = 'safety_key';
      result.sessionPhase = 'idle';
      break;
    case FTMS_STATUS_OPCODE.STOPPED_OR_PAUSED_BY_USER:
      result.userStopType = bytes[1];
      if (bytes[1] === FTMS_STOP_PAUSE_TYPE.STOP) {
        result.stopReason = 'user_stop';
        result.sessionPhase = 'idle';
      } else {
        result.stopReason = 'user_pause';
        result.sessionPhase = 'paused';
      }
      break;
    case FTMS_STATUS_OPCODE.STARTED_OR_RESUMED_BY_USER:
      result.sessionPhase = 'active';
      result.sessionEvent = 'resumed_by_user';
      break;
    case FTMS_STATUS_OPCODE.TARGET_SPEED_CHANGED:
      if (bytes.length >= 3) {
        result.targetSpeedKmh = readUint16Le(bytes, 1) / 100;
      }
      break;
    case FTMS_STATUS_OPCODE.TARGET_INCLINE_CHANGED:
      if (bytes.length >= 3) {
        result.targetInclinePercent = readSint16Le(bytes, 1) / 10;
      }
      break;
    default:
      break;
  }

  return result;
}

export function describeFitnessMachineStatus(parsed: ParsedFitnessMachineStatus): string {
  const param = parsed.userStopType != null ? ` param=0x${parsed.userStopType.toString(16)}` : '';
  switch (parsed.opcode) {
    case FTMS_STATUS_OPCODE.RESET:
      return `Reset (0x01) → safety_key`;
    case FTMS_STATUS_OPCODE.STOPPED_OR_PAUSED_BY_USER:
      return `Stopped/Paused (0x02${param}) → ${parsed.stopReason ?? 'unknown'}`;
    case FTMS_STATUS_OPCODE.STOPPED_BY_SAFETY_KEY:
      return `Safety key (0x03)`;
    case FTMS_STATUS_OPCODE.STARTED_OR_RESUMED_BY_USER:
      return `Started/Resumed (0x04)`;
    case FTMS_STATUS_OPCODE.TARGET_SPEED_CHANGED:
      return `Target speed (0x05) → ${parsed.targetSpeedKmh?.toFixed(1) ?? '?'} km/h`;
    case FTMS_STATUS_OPCODE.TARGET_INCLINE_CHANGED:
      return `Target incline (0x06) → ${parsed.targetInclinePercent?.toFixed(1) ?? '?'}%`;
    default:
      return `Unknown status opcode 0x${parsed.opcode.toString(16)}`;
  }
}

export function describeTreadmillData(parsed: ParsedTreadmillData): string {
  const parts = [`spd=${parsed.speedKmh?.toFixed(1) ?? '?'}`];
  if (parsed.inclinePercent != null) {
    parts.push(`inc=${parsed.inclinePercent.toFixed(1)}`);
  }
  if (parsed.distanceKm != null) {
    parts.push(`dist=${parsed.distanceKm.toFixed(2)}`);
  }
  if (parsed.calories != null) {
    parts.push(`kcal=${parsed.calories}`);
  }
  return parts.join(' ');
}
