/** @deprecated Import from `@/features/programs` instead. */
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

export type { Program, ProgramsImportPayload, ProgramTab, Segment } from '@/features/programs/types';
