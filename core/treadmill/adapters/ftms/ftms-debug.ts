import { base64ToBytes } from '@/core/treadmill/adapters/ftms/encoding';

export type FtmsLogSource = 'status' | 'data' | 'cmd' | 'app';

export interface FtmsLogEntry {
  id: string;
  at: string;
  source: FtmsLogSource;
  hex: string;
  message: string;
}

const MAX_ENTRIES = 40;
let nextId = 0;
let entries: FtmsLogEntry[] = [];
const listeners = new Set<(entries: FtmsLogEntry[]) => void>();

export function bytesToHex(bytes: Uint8Array | number[]): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join(' ');
}

export function hexFromBase64(base64Value: string | null | undefined): string {
  if (!base64Value) {
    return '';
  }
  return bytesToHex(base64ToBytes(base64Value));
}

export function logFtms(source: FtmsLogSource, hex: string, message: string): void {
  if (source === 'data') {
    return;
  }

  const entry: FtmsLogEntry = {
    id: String(nextId++),
    at: new Date().toLocaleTimeString(),
    source,
    hex,
    message,
  };

  entries = [entry, ...entries].slice(0, MAX_ENTRIES);
  console.log(`[FTMS ${source}] ${hex ? `${hex} — ` : ''}${message}`);
  listeners.forEach((listener) => listener(entries));
}

export function getFtmsLogEntries(): FtmsLogEntry[] {
  return entries;
}

export function clearFtmsLog(): void {
  entries = [];
  listeners.forEach((listener) => listener(entries));
}

export function subscribeFtmsLog(listener: (entries: FtmsLogEntry[]) => void): () => void {
  listeners.add(listener);
  listener(entries);
  return () => listeners.delete(listener);
}
