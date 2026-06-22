export type {
  Program,
  ProgramsImportPayload,
  ProgramTab,
  Segment,
} from '@/features/programs/types';

export {
  createEmptyProgram,
  createEmptySegment,
  filterProgramsByPreset,
  getDefaultPrograms,
  getProgramRecencyMs,
  getProgramTab,
  getProgramTotalDuration,
  parseProgramsJson,
  resolveProgramsTab,
  sortProgramsByRecency,
} from '@/features/programs/program.logic';

export type { ProgramRepository } from '@/features/programs/repository.interface';

export {
  deleteProgram,
  loadPrograms,
  programRepository,
  touchProgramLastUsed,
  upsertProgram,
  upsertPrograms,
} from '@/features/programs/repository.local';
