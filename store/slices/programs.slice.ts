import type { StateCreator } from 'zustand';

import {
  deleteProgram as deleteProgramFromDb,
  touchProgramLastUsed,
  upsertProgram,
  upsertPrograms,
} from '@/features/programs';
import { createEmptyProgram, sortProgramsByRecency } from '@/features/programs/program.logic';
import type { AppState, ProgramsSlice } from '@/store/types';

export const createProgramsSlice: StateCreator<AppState, [], [], ProgramsSlice> = (set, get) => ({
  programs: [],
  selectedProgramId: null,

  setSelectedProgram: (programId) => set({ selectedProgramId: programId }),

  addProgram: (program) => {
    const next = program ?? createEmptyProgram();
    const programs = sortProgramsByRecency([...get().programs, next]);
    set({ programs });
    upsertProgram(next);
    return next;
  },

  updateProgram: async (program) => {
    const updated = { ...program, updatedAt: new Date().toISOString() };
    const programs = sortProgramsByRecency(
      get().programs.map((item) => (item.id === program.id ? updated : item)),
    );
    set({ programs });
    await upsertProgram(updated);
  },

  deleteProgram: async (programId) => {
    const programs = sortProgramsByRecency(get().programs.filter((item) => item.id !== programId));
    set({
      programs,
      selectedProgramId: get().selectedProgramId === programId ? null : get().selectedProgramId,
    });
    await deleteProgramFromDb(programId);
  },

  importPrograms: async (imported) => {
    const programs = sortProgramsByRecency([...get().programs, ...imported]);
    set({ programs });
    await upsertPrograms(imported);
  },

  touchProgramUsage: async (programId) => {
    const now = new Date().toISOString();
    await touchProgramLastUsed(programId);
    set({
      programs: sortProgramsByRecency(
        get().programs.map((item) => (item.id === programId ? { ...item, lastUsedAt: now } : item)),
      ),
    });
  },
});

export { loadPrograms } from '@/features/programs';
