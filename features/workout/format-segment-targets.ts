import type { InclineUnit } from '@/constants/TreadmillSettings';
import type { TreadmillState } from '@/core/treadmill/types';
import { formatIncline, formatSpeed } from '@/utils/format';

const SPEED_TOLERANCE_KMH = 0.15;
const INCLINE_TOLERANCE = 0.5;

export interface TreadmillTargetValues {
  speedKmh: number;
  inclinePercent: number;
}

/** Console-set targets from FTMS status; falls back to live telemetry. */
export function getTreadmillTargetValues(treadmill: TreadmillState): TreadmillTargetValues {
  return {
    speedKmh: treadmill.targetSpeedKmh ?? treadmill.speedKmh,
    inclinePercent: treadmill.targetInclinePercent ?? treadmill.inclinePercent,
  };
}

export function treadmillTargetsDifferFromPlan(
  planSpeedKmh: number,
  planInclinePercent: number,
  treadmill: TreadmillState,
): boolean {
  const actual = getTreadmillTargetValues(treadmill);
  return (
    Math.abs(planSpeedKmh - actual.speedKmh) > SPEED_TOLERANCE_KMH ||
    Math.abs(planInclinePercent - actual.inclinePercent) > INCLINE_TOLERANCE
  );
}

function formatTargetPair(
  speedKmh: number,
  inclinePercent: number,
  inclineUnit: InclineUnit,
): string {
  return `${formatSpeed(speedKmh)} · incline ${formatIncline(inclinePercent, inclineUnit)}`;
}

function targetsDiffer(
  planSpeedKmh: number,
  planInclinePercent: number,
  actualSpeedKmh: number,
  actualInclinePercent: number,
): boolean {
  return (
    Math.abs(planSpeedKmh - actualSpeedKmh) > SPEED_TOLERANCE_KMH ||
    Math.abs(planInclinePercent - actualInclinePercent) > INCLINE_TOLERANCE
  );
}

/** Stored session log row — planned values with optional actual overrides in brackets. */
export function formatSessionLogSegmentLine(
  plannedSpeedKmh: number,
  plannedInclinePercent: number,
  actualSpeedKmh: number | undefined,
  actualInclinePercent: number | undefined,
  inclineUnit: InclineUnit,
): string {
  const plan = formatTargetPair(plannedSpeedKmh, plannedInclinePercent, inclineUnit);

  if (actualSpeedKmh == null || actualInclinePercent == null) {
    return plan;
  }

  if (
    !targetsDiffer(plannedSpeedKmh, plannedInclinePercent, actualSpeedKmh, actualInclinePercent)
  ) {
    return plan;
  }

  return `${plan} (${formatTargetPair(actualSpeedKmh, actualInclinePercent, inclineUnit)})`;
}

/** Program targets, with console overrides in brackets when they differ. */
export function formatSegmentTargetsWithActual(
  planSpeedKmh: number,
  planInclinePercent: number,
  treadmill: TreadmillState,
  inclineUnit: InclineUnit,
): string {
  const plan = formatTargetPair(planSpeedKmh, planInclinePercent, inclineUnit);

  if (
    !treadmill.connected ||
    !treadmillTargetsDifferFromPlan(planSpeedKmh, planInclinePercent, treadmill)
  ) {
    return plan;
  }

  const actual = getTreadmillTargetValues(treadmill);
  return `${plan} (${formatTargetPair(actual.speedKmh, actual.inclinePercent, inclineUnit)})`;
}
