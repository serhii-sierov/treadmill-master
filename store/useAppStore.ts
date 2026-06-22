import { create } from 'zustand';

import { getMeta } from '@/core/database';
import { LAST_BLE_DEVICE_NAME_KEY } from '@/core/treadmill';
import { sortProgramsByRecency } from '@/features/programs/program.logic';
import { createProgramsSlice, loadPrograms } from '@/store/slices/programs.slice';
import { createSettingsSlice, loadSettingsFromDb } from '@/store/slices/settings.slice';
import { createTreadmillSlice, syncTreadmillStateToStore } from '@/store/slices/treadmill.slice';
import { createWorkoutSlice, loadSessions } from '@/store/slices/workout.slice';
import type { AppStore } from '@/store/types';

export const useAppStore = create<AppStore>((set, get, api) => ({
  ...createSettingsSlice(set, get, api),
  ...createProgramsSlice(set, get, api),
  ...createTreadmillSlice(set, get, api),
  ...createWorkoutSlice(set, get, api),

  hydrate: async () => {
    const [programs, sessions, lastConnectedDeviceName, settings] = await Promise.all([
      loadPrograms(),
      loadSessions(),
      getMeta(LAST_BLE_DEVICE_NAME_KEY),
      loadSettingsFromDb(),
    ]);

    set({
      programs: sortProgramsByRecency(programs),
      sessions,
      hydrated: true,
      lastConnectedDeviceName,
      ...settings,
    });
  },
}));

syncTreadmillStateToStore((partial) => {
  useAppStore.setState(partial);
});
