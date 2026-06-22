import { getDatabase } from '@/core/database/client';
import { getMeta, setMeta } from '@/core/database/meta';
import { getDefaultPrograms } from '@/features/programs/program.logic';
import { persistProgram } from '@/features/programs/persist-program';

const SEEDED_KEY = 'seeded_defaults';

export async function seedProgramsIfNeeded(): Promise<void> {
  if (await getMeta(SEEDED_KEY)) {
    return;
  }

  const db = await getDatabase();
  const count = await db.getFirstAsync<{ total: number }>(
    'SELECT COUNT(*) AS total FROM programs',
  );

  if ((count?.total ?? 0) === 0) {
    for (const program of getDefaultPrograms()) {
      await persistProgram(program);
    }
  }

  await setMeta(SEEDED_KEY, 'true');
}
