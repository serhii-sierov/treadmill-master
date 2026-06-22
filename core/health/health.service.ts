import type { WorkoutSession } from '@/features/workout/types';

export interface HealthService {
  isAvailable(): Promise<boolean>;
  requestPermissions(): Promise<boolean>;
  saveWorkout(session: WorkoutSession): Promise<void>;
}

/**
 * Apple Health / Health Connect stub.
 * Integrate react-native-health (iOS) or react-native-health-connect (Android)
 * in a development build when ready.
 */
class StubHealthService implements HealthService {
  async isAvailable(): Promise<boolean> {
    return false;
  }

  async requestPermissions(): Promise<boolean> {
    return false;
  }

  async saveWorkout(_session: WorkoutSession): Promise<void> {
    // No-op until native health module is wired up.
  }
}

export const healthService: HealthService = new StubHealthService();
