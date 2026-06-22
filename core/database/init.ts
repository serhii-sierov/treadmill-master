import { seedProgramsIfNeeded } from '@/features/programs/seed';

let initPromise: Promise<void> | null = null;

/** Opens DB, runs migrations, seeds presets on first launch. */
export async function ensureDatabaseReady(): Promise<void> {
  initPromise ??= seedProgramsIfNeeded();
  await initPromise;
}
