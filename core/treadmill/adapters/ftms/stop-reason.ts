import type { FtmsStopReason } from '@/core/treadmill/types';
import { FTMS_STOP_PAUSE_TYPE } from '@/core/treadmill/adapters/ftms/constants';

/**
 * FitShow-style treadmills send status 0x02 param 0x01 (FTMS "stop") for the console
 * Pause key while keeping the target speed on screen. Treat that as pause, not interrupt.
 */
export function resolveConsoleStopReason(
  reason: FtmsStopReason,
  userStopType: number | undefined,
  targetSpeedKmh: number,
): FtmsStopReason {
  if (
    reason === 'user_stop' &&
    userStopType === FTMS_STOP_PAUSE_TYPE.STOP &&
    targetSpeedKmh > 0.5
  ) {
    return 'user_pause';
  }

  return reason;
}

export function isConsolePauseStop(
  reason: FtmsStopReason,
  userStopType: number | undefined,
  targetSpeedKmh: number,
): boolean {
  return resolveConsoleStopReason(reason, userStopType, targetSpeedKmh) === 'user_pause';
}
