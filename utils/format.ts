import type { InclineUnit } from '@/constants/TreadmillSettings';

export function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${minutes}:${pad(seconds)}`;
}

export function formatSpeed(speedKmh: number): string {
  return `${speedKmh.toFixed(1)} km/h`;
}

export function formatIncline(value: number, unit: InclineUnit = 'level'): string {
  if (unit === 'level') {
    return String(Math.round(value));
  }
  return `${value.toFixed(1)}%`;
}

export function inclineFieldLabel(unit: InclineUnit): string {
  return unit === 'level' ? 'Incline (0–15)' : 'Incline (%)';
}

export function formatDistance(km: number): string {
  return `${km.toFixed(2)} km`;
}

function pad(value: number): string {
  return value.toString().padStart(2, '0');
}
