import defaultPrograms from '@/data/default-programs.json';
import type {
  Program,
  ProgramTab,
  ProgramsImportPayload,
  Segment,
} from '@/features/programs/types';
import { createId } from '@/utils/id';

export function getProgramTotalDuration(program: Program): number {
  return program.segments.reduce((sum, segment) => sum + segment.durationSeconds, 0);
}

export function getProgramRecencyMs(program: Program): number {
  const updated = Date.parse(program.updatedAt);
  const lastUsed = program.lastUsedAt ? Date.parse(program.lastUsedAt) : 0;
  const safeUpdated = Number.isNaN(updated) ? 0 : updated;
  const safeLastUsed = Number.isNaN(lastUsed) ? 0 : lastUsed;
  return Math.max(safeUpdated, safeLastUsed);
}

export function sortProgramsByRecency(programs: Program[]): Program[] {
  return [...programs].sort((a, b) => getProgramRecencyMs(b) - getProgramRecencyMs(a));
}

export function filterProgramsByPreset(programs: Program[], preset: boolean): Program[] {
  return sortProgramsByRecency(programs.filter((program) => program.isPreset === preset));
}

export function getProgramTab(program: Program): ProgramTab {
  return program.isPreset ? 'preset' : 'custom';
}

/** Pick Presets vs Custom from active workout, selection, or most recently used/edited program. */
export function resolveProgramsTab(
  programs: Program[],
  options?: {
    selectedProgramId?: string | null;
    activeWorkoutProgramId?: string | null;
  },
): ProgramTab {
  const activeWorkoutProgram = options?.activeWorkoutProgramId
    ? programs.find((program) => program.id === options.activeWorkoutProgramId)
    : undefined;
  if (activeWorkoutProgram) {
    return getProgramTab(activeWorkoutProgram);
  }

  const selectedProgram = options?.selectedProgramId
    ? programs.find((program) => program.id === options.selectedProgramId)
    : undefined;
  if (selectedProgram) {
    return getProgramTab(selectedProgram);
  }

  const mostRecent = sortProgramsByRecency(programs)[0];
  return mostRecent ? getProgramTab(mostRecent) : 'preset';
}

export function createEmptySegment(): Segment {
  return {
    id: createId('seg'),
    durationSeconds: 300,
    speedKmh: 5,
    inclinePercent: 0,
  };
}

export function createEmptyProgram(): Program {
  const now = new Date().toISOString();
  return {
    id: createId('prog'),
    name: 'New Program',
    description: '',
    isPreset: false,
    segments: [createEmptySegment()],
    createdAt: now,
    updatedAt: now,
  };
}

export function getDefaultPrograms(): Program[] {
  const now = new Date().toISOString();
  return (defaultPrograms as Omit<Program, 'createdAt' | 'updatedAt'>[]).map((program) => ({
    ...program,
    createdAt: now,
    updatedAt: now,
  }));
}

export function parseProgramsJson(raw: string): Program[] {
  const parsed = JSON.parse(raw) as
    | ProgramsImportPayload
    | Program[]
    | Omit<Program, 'id' | 'createdAt' | 'updatedAt' | 'isPreset'>[];

  const now = new Date().toISOString();
  let items: ProgramsImportPayload['programs'] | Program[];
  if (Array.isArray(parsed)) {
    items = parsed;
  } else if (Array.isArray(parsed.programs)) {
    items = parsed.programs;
  } else {
    items = [];
  }

  if (items.length === 0) {
    throw new Error('JSON must contain a non-empty programs array.');
  }

  return items.map((item) => {
    const candidate = item as Partial<Program>;
    if (!candidate.name || !Array.isArray(candidate.segments) || candidate.segments.length === 0) {
      throw new Error('Each program needs a name and at least one segment.');
    }

    const segments = candidate.segments.map((segment) => {
      if (
        typeof segment.durationSeconds !== 'number' ||
        typeof segment.speedKmh !== 'number' ||
        typeof segment.inclinePercent !== 'number'
      ) {
        throw new TypeError('Each segment needs durationSeconds, speedKmh, and inclinePercent.');
      }

      return {
        id: segment.id ?? createId('seg'),
        label: segment.label,
        durationSeconds: segment.durationSeconds,
        speedKmh: segment.speedKmh,
        inclinePercent: segment.inclinePercent,
      };
    });

    return {
      id: candidate.id ?? createId('prog'),
      name: candidate.name,
      description: candidate.description ?? '',
      isPreset: false,
      segments,
      createdAt: candidate.createdAt ?? now,
      updatedAt: now,
    };
  });
}
