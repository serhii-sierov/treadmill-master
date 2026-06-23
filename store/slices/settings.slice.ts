import type { StateCreator } from 'zustand';

import { loadInclineUnit, saveInclineUnit } from '@/core/settings';
import type { AppState, SettingsSlice } from '@/store/types';

export const createSettingsSlice: StateCreator<AppState, [], [], SettingsSlice> = (set) => ({
  hydrated: false,
  inclineUnit: 'level',

  setInclineUnit: async (unit) => {
    set({ inclineUnit: unit });
    await saveInclineUnit(unit);
  },
});

export async function loadSettingsFromDb(): Promise<Pick<SettingsSlice, 'inclineUnit'>> {
  return { inclineUnit: await loadInclineUnit() };
}
