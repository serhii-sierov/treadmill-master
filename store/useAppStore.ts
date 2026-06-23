import { create } from 'zustand';

import { getMeta } from '@/core/database';
import { initTreadmillAdapter, LAST_BLE_DEVICE_NAME_KEY } from '@/core/treadmill';
import { sortProgramsByRecency } from '@/features/programs/program.logic';
import { createProgramsSlice, loadPrograms } from '@/store/slices/programs.slice';
import { createSettingsSlice, loadSettingsFromDb } from '@/store/slices/settings.slice';
import { createTreadmillSlice, syncTreadmillStateToStore } from '@/store/slices/treadmill.slice';
import { createWorkoutSlice, loadSessions } from '@/store/slices/workout.slice';
import type { AppStore } from '@/store/types';

let unsubscribeTreadmill: (() => void) | null = null;

export const useAppStore = create<AppStore>((set, get, api) => ({
  ...createSettingsSlice(set, get, api),
  ...createProgramsSlice(set, get, api),
  ...createTreadmillSlice(set, get, api),
  ...createWorkoutSlice(set, get, api),

  hydrate: async () => {
    const treadmillAdapter = await initTreadmillAdapter();

    unsubscribeTreadmill ??= syncTreadmillStateToStore((partial) => {
      useAppStore.setState(partial);
      useAppStore.getState().checkTreadmillInterruption();
      useAppStore.getState().syncWorkoutSessionMetrics();
    });

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
      treadmill: treadmillAdapter.getState(),
      ...settings,
    });
  },
}));
