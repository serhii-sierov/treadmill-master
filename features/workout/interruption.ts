import { getTreadmillAdapter } from "@/core/treadmill";
import { logFtms } from "@/core/treadmill/adapters/ftms/ftms-debug";
import { resolveConsoleStopReason } from "@/core/treadmill/adapters/ftms/stop-reason";
import type { FtmsStopReason, TreadmillState } from "@/core/treadmill/types";
import {
  isTreadmillBeltStopped,
  isWithinBeltCheckGrace,
  shouldMonitorBeltStop,
} from "@/features/workout/engine";
import type {
  WorkoutInterruptionReason,
  WorkoutProgress,
} from "@/features/workout/types";

const BELT_STOPPED_TICKS_TO_ACT = 1;

let beltStoppedTicks = 0;

export function resetBeltStopTracking(): void {
  beltStoppedTicks = 0;
}

function mapFtmsStopReason(reason: FtmsStopReason): WorkoutInterruptionReason {
  if (reason === "safety_key") {
    return "safety_key";
  }
  if (reason === "user_stop") {
    return "user_stop";
  }
  return "user_pause";
}

function getConsoleTargetSpeed(treadmill: TreadmillState): number {
  return treadmill.targetSpeedKmh ?? treadmill.speedKmh;
}

function resolveStopReason(
  treadmill: TreadmillState,
  reason: FtmsStopReason,
): FtmsStopReason {
  const userStopType =
    reason === "user_stop" || reason === "user_pause"
      ? treadmill.ftmsLastUserStopType
      : undefined;

  return resolveConsoleStopReason(
    reason,
    userStopType,
    getConsoleTargetSpeed(treadmill),
  );
}

/** Safety key / reset — treadmill zeros session counters without status 0x03. */
export function detectSessionCounterReset(
  workout: WorkoutProgress,
  treadmill: TreadmillState,
): WorkoutProgress | null {
  if (!workout.isActive || workout.isInterrupted) {
    return null;
  }

  if (!isTreadmillBeltStopped(treadmill)) {
    return null;
  }

  const caloriesReset =
    workout.lastTreadmillCalories > 0 &&
    treadmill.calories < workout.lastTreadmillCalories;
  const distanceReset =
    workout.lastTreadmillDistanceKm > 0.005 &&
    treadmill.distanceKm + 0.001 < workout.lastTreadmillDistanceKm;

  if (!caloriesReset && !distanceReset) {
    return null;
  }

  beltStoppedTicks = 0;
  logFtms(
    "app",
    "",
    `Telemetry: counters reset (cal ${workout.lastTreadmillCalories}→${treadmill.calories}, dist ${workout.lastTreadmillDistanceKm.toFixed(2)}→${treadmill.distanceKm.toFixed(2)}) → safety_key (E-07 / console reboot)`,
  );

  return {
    ...workout,
    isPaused: false,
    isInterrupted: true,
    interruptionReason: "safety_key",
  };
}

export function isExternalWorkoutResume(
  before: WorkoutProgress,
  after: WorkoutProgress,
): boolean {
  return (
    before.isActive &&
    before.isPaused &&
    !before.isInterrupted &&
    after.isActive &&
    !after.isPaused &&
    !after.isInterrupted
  );
}

/** Console Start/Resume (FTMS 0x04) while app is paused — sync timer, keep segment. */
export function detectFtmsExternalResume(
  workout: WorkoutProgress,
  treadmill: TreadmillState,
): WorkoutProgress | null {
  if (!workout.isActive || !workout.isPaused || workout.isInterrupted) {
    return null;
  }

  if (treadmill.ftmsSessionEvent !== "resumed_by_user") {
    return null;
  }

  getTreadmillAdapter().clearFtmsSessionEvent();
  logFtms("app", "", "Status 0x04 → app resume (console Start key)");
  return {
    ...workout,
    isPaused: false,
    beltCheckGraceUntil: Date.now() + 6000,
  };
}

/** Belt spins while app is paused — console Start without FTMS 0x04 status. */
export function detectTelemetryBeltResume(
  workout: WorkoutProgress,
  treadmill: TreadmillState,
): WorkoutProgress | null {
  if (!workout.isActive || !workout.isPaused || workout.isInterrupted) {
    return null;
  }

  if (getTreadmillAdapter().isAppResumeInFlight()) {
    return null;
  }

  if (!treadmill.isRunning || treadmill.speedKmh < 0.5) {
    return null;
  }

  logFtms(
    "app",
    "",
    `Telemetry: belt running ${treadmill.speedKmh.toFixed(1)} km/h → app resume (console Start key)`,
  );
  return {
    ...workout,
    isPaused: false,
    beltCheckGraceUntil: Date.now() + 6000,
  };
}

/** Returns updated workout when the treadmill reports an external stop, else null. */
export function detectFtmsStopEvent(
  workout: WorkoutProgress,
  treadmill: TreadmillState,
): WorkoutProgress | null {
  if (!workout.isActive || workout.isInterrupted) {
    return null;
  }

  const rawReason = treadmill.ftmsStopReason;
  if (!rawReason) {
    return null;
  }

  const reason = resolveStopReason(treadmill, rawReason);

  if (reason === "user_pause") {
    beltStoppedTicks = 0;
    getTreadmillAdapter().clearFtmsStopReason();
    logFtms(
      "app",
      "",
      rawReason === "user_stop"
        ? "Status 0x02/0x01 with target kept → app pause (console Pause key)"
        : "Status → app pause",
    );
    return {
      ...workout,
      isPaused: true,
      isInterrupted: false,
      interruptionReason: undefined,
    };
  }

  beltStoppedTicks = 0;
  getTreadmillAdapter().clearFtmsStopReason();
  logFtms("app", "", `Status → interrupt (${reason})`);
  return {
    ...workout,
    isPaused: false,
    isInterrupted: true,
    interruptionReason: mapFtmsStopReason(reason),
  };
}

export function detectTelemetryBeltStop(
  workout: WorkoutProgress,
  treadmill: TreadmillState,
  now = Date.now(),
): WorkoutProgress | null {
  if (!workout.isActive || workout.isInterrupted) {
    beltStoppedTicks = 0;
    return null;
  }

  if (workout.isPaused) {
    beltStoppedTicks = 0;
    return null;
  }

  const counterReset = detectSessionCounterReset(workout, treadmill);
  if (counterReset) {
    return counterReset;
  }

  if (!shouldMonitorBeltStop(workout) || isWithinBeltCheckGrace(workout, now)) {
    beltStoppedTicks = 0;
    return null;
  }

  if (!isTreadmillBeltStopped(treadmill)) {
    beltStoppedTicks = 0;
    return null;
  }

  beltStoppedTicks += 1;
  if (beltStoppedTicks < BELT_STOPPED_TICKS_TO_ACT) {
    return null;
  }

  beltStoppedTicks = 0;
  const targetSpeed = getConsoleTargetSpeed(treadmill);

  if (targetSpeed > 0.5) {
    logFtms(
      "app",
      "",
      `Telemetry: belt stopped, target ${targetSpeed.toFixed(1)} → pause`,
    );
    return {
      ...workout,
      isPaused: true,
      isInterrupted: false,
      interruptionReason: undefined,
    };
  }

  logFtms("app", "", "Telemetry: belt stopped, target cleared → user_stop");
  return {
    ...workout,
    isInterrupted: true,
    interruptionReason:
      treadmill.ftmsStopReason === "safety_key" ? "safety_key" : "user_stop",
  };
}

export function detectBeltStoppedFallback(
  workout: WorkoutProgress,
  treadmill: TreadmillState,
  now = Date.now(),
): WorkoutProgress | null {
  if (treadmill.mode !== "mock") {
    return null;
  }

  return detectTelemetryBeltStop(workout, treadmill, now);
}

export function detectTreadmillInterruption(
  workout: WorkoutProgress,
  treadmill: TreadmillState,
  now = Date.now(),
): WorkoutProgress | null {
  return (
    detectSessionCounterReset(workout, treadmill) ??
    detectFtmsExternalResume(workout, treadmill) ??
    detectTelemetryBeltResume(workout, treadmill) ??
    detectFtmsStopEvent(workout, treadmill) ??
    detectTelemetryBeltStop(workout, treadmill, now)
  );
}
