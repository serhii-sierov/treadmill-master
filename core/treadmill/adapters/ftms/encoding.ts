export function bytesToBase64(bytes: number[]): string {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCodePoint(byte);
  }
  return btoa(binary);
}

export function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.codePointAt(index) ?? 0;
  }
  return bytes;
}

export function writeUint16Le(value: number): [number, number] {
  const clamped = Math.max(0, Math.min(0xffff, Math.round(value)));
  return [clamped & 0xff, (clamped >> 8) & 0xff];
}

export function writeSint16Le(value: number): [number, number] {
  const clamped = Math.max(-32768, Math.min(32767, Math.round(value)));
  const unsigned = clamped < 0 ? clamped + 65536 : clamped;
  return [unsigned & 0xff, (unsigned >> 8) & 0xff];
}

export function readUint16Le(bytes: Uint8Array, offset: number): number {
  return bytes[offset] | (bytes[offset + 1] << 8);
}

export function readSint16Le(bytes: Uint8Array, offset: number): number {
  const raw = readUint16Le(bytes, offset);
  return raw > 32767 ? raw - 65536 : raw;
}

export function readUint24Le(bytes: Uint8Array, offset: number): number {
  return bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16);
}
