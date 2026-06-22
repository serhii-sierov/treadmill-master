import type { Program, Segment } from '@/features/programs/types';

export type ProgramRow = {
  id: string;
  name: string;
  description: string;
  is_preset: number;
  created_at: string;
  updated_at: string;
  last_used_at: string | null;
};

export type SegmentRow = {
  id: string;
  program_id: string;
  sort_order: number;
  label: string | null;
  duration_seconds: number;
  speed_kmh: number;
  incline_percent: number;
};

export function mapProgramRow(row: ProgramRow, segments: Segment[]): Program {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    isPreset: row.is_preset === 1,
    segments,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastUsedAt: row.last_used_at ?? undefined,
  };
}

export function mapSegmentRow(row: SegmentRow): Segment {
  return {
    id: row.id,
    label: row.label ?? undefined,
    durationSeconds: row.duration_seconds,
    speedKmh: row.speed_kmh,
    inclinePercent: row.incline_percent,
  };
}
