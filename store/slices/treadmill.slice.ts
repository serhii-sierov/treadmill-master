import type { StateCreator } from 'zustand';

import { treadmillAdapter } from '@/core/treadmill';
import type { AppState, TreadmillSlice } from '@/store/types';

export const createTreadmillSlice: StateCreator<AppState, [], [], TreadmillSlice> = (set) => ({
  treadmill: treadmillAdapter.getState(),
  lastConnectedDeviceName: null,

  scanTreadmills: async () => treadmillAdapter.scan(),

  connectTreadmill: async (deviceId) => {
    await treadmillAdapter.connect(deviceId);
    const treadmill = treadmillAdapter.getState();
    set({
      treadmill,
      lastConnectedDeviceName: treadmill.deviceName ?? null,
    });
  },

  reconnectTreadmill: async () => {
    await treadmillAdapter.reconnectLast();
    const treadmill = treadmillAdapter.getState();
    set({
      treadmill,
      lastConnectedDeviceName: treadmill.deviceName ?? null,
    });
  },

  disconnectTreadmill: async () => {
    await treadmillAdapter.disconnect();
    set({ treadmill: treadmillAdapter.getState() });
  },
});

export function syncTreadmillStateToStore(
  setState: (partial: Pick<TreadmillSlice, 'treadmill'>) => void,
): () => void {
  return treadmillAdapter.subscribe((treadmill) => {
    setState({ treadmill });
  });
}
