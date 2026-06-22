import type { WithSyncMetadata } from '@/core/sync/types';

export interface Segment {
  id: string;
  durationSeconds: number;
  speedKmh: number;
  inclinePercent: number;
  label?: string;
}

export type Program = WithSyncMetadata<{
  id: string;
  name: string;
  description?: string;
  isPreset: boolean;
  segments: Segment[];
  createdAt: string;
  updatedAt: string;
  lastUsedAt?: string;
}>;

export type ProgramsImportPayload = {
  programs: Omit<Program, 'id' | 'createdAt' | 'updatedAt' | 'isPreset'>[];
};

export type ProgramTab = 'preset' | 'custom';
