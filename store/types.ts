import type { InclineUnit } from '@/constants/TreadmillSettings';
import type { DiscoveredTreadmill, TreadmillState } from '@/core/treadmill/types';
import type { Program } from '@/features/programs/types';
import type { WorkoutProgress, WorkoutSession } from '@/features/workout/types';

export interface SettingsSlice {
  hydrated: boolean;
  inclineUnit: InclineUnit;
  setInclineUnit: (unit: InclineUnit) => Promise<void>;
}

export interface ProgramsSlice {
  programs: Program[];
  selectedProgramId: string | null;
  setSelectedProgram: (programId: string | null) => void;
  addProgram: (program?: Program) => Program;
  updateProgram: (program: Program) => Promise<void>;
  deleteProgram: (programId: string) => Promise<void>;
  importPrograms: (programs: Program[]) => Promise<void>;
  touchProgramUsage: (programId: string) => Promise<void>;
}

export interface TreadmillSlice {
  treadmill: TreadmillState;
  lastConnectedDeviceName: string | null;
  scanTreadmills: () => Promise<DiscoveredTreadmill[]>;
  connectTreadmill: (deviceId: string) => Promise<void>;
  reconnectTreadmill: () => Promise<void>;
  disconnectTreadmill: () => Promise<void>;
}

export interface WorkoutSlice {
  sessions: WorkoutSession[];
  workout: WorkoutProgress | null;
  startWorkout: (programId: string) => Promise<void>;
  pauseWorkout: () => Promise<void>;
  resumeWorkout: () => Promise<void>;
  stopWorkout: () => Promise<void>;
  tickWorkout: () => Promise<void>;
}

export type AppState = SettingsSlice & ProgramsSlice & TreadmillSlice & WorkoutSlice;

export type AppStore = AppState & {
  hydrate: () => Promise<void>;
};
