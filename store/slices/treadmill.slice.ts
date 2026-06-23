import type { StateCreator } from 'zustand';

import { getTreadmillAdapter } from '@/core/treadmill';
import type { TreadmillState } from '@/core/treadmill/types';
import type { AppState, TreadmillSlice } from '@/store/types';

export const initialTreadmillState: TreadmillState = {
  connected: false,
  mode: 'mock',
  speedKmh: 0,
  inclinePercent: 0,
  isRunning: false,
  distanceKm: 0,
  calories: 0,
};

export const createTreadmillSlice: StateCreator<AppState, [], [], TreadmillSlice> = (set) => ({
  treadmill: initialTreadmillState,
  lastConnectedDeviceName: null,

  scanTreadmills: async () => getTreadmillAdapter().scan(),

  connectTreadmill: async (deviceId) => {
    await getTreadmillAdapter().connect(deviceId);
    const treadmill = getTreadmillAdapter().getState();
    set({
      treadmill,
      lastConnectedDeviceName: treadmill.deviceName ?? null,
    });
  },

  reconnectTreadmill: async () => {
    await getTreadmillAdapter().reconnectLast();
    const treadmill = getTreadmillAdapter().getState();
    set({
      treadmill,
      lastConnectedDeviceName: treadmill.deviceName ?? null,
    });
  },

  disconnectTreadmill: async () => {
    await getTreadmillAdapter().disconnect();
    set({ treadmill: getTreadmillAdapter().getState() });
  },
});

export function syncTreadmillStateToStore(
  setState: (partial: Pick<TreadmillSlice, 'treadmill'>) => void,
): () => void {
  return getTreadmillAdapter().subscribe((treadmill) => {
    setState({ treadmill });
  });
}
