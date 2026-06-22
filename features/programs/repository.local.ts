import { getDatabase } from '@/core/database/client';
import { ensureDatabaseReady } from '@/core/database/init';
import {
  mapProgramRow,
  mapSegmentRow,
  type ProgramRow,
  type SegmentRow,
} from '@/features/programs/mappers';
import { persistProgram } from '@/features/programs/persist-program';
import type { ProgramRepository } from '@/features/programs/repository.interface';
import { sortProgramsByRecency } from '@/features/programs/program.logic';
import type { Program, Segment } from '@/features/programs/types';

class LocalProgramRepository implements ProgramRepository {
  async loadAll(): Promise<Program[]> {
    await ensureDatabaseReady();

    const db = await getDatabase();
    const programRows = await db.getAllAsync<ProgramRow>('SELECT * FROM programs');

    if (programRows.length === 0) {
      return [];
    }

    const segmentRows = await db.getAllAsync<SegmentRow>(
      'SELECT * FROM segments ORDER BY program_id ASC, sort_order ASC',
    );

    const segmentsByProgram = new Map<string, Segment[]>();
    for (const row of segmentRows) {
      const segments = segmentsByProgram.get(row.program_id) ?? [];
      segments.push(mapSegmentRow(row));
      segmentsByProgram.set(row.program_id, segments);
    }

    return sortProgramsByRecency(
      programRows.map((row) => mapProgramRow(row, segmentsByProgram.get(row.id) ?? [])),
    );
  }

  async upsert(program: Program): Promise<void> {
    await ensureDatabaseReady();
    await persistProgram(program);
  }

  async upsertMany(programs: Program[]): Promise<void> {
    for (const program of programs) {
      await persistProgram(program);
    }
  }

  async delete(id: string): Promise<void> {
    await ensureDatabaseReady();
    const db = await getDatabase();
    await db.runAsync('DELETE FROM programs WHERE id = ?', id);
  }

  async touchLastUsed(id: string): Promise<void> {
    await ensureDatabaseReady();
    const now = new Date().toISOString();
    const db = await getDatabase();
    await db.runAsync('UPDATE programs SET last_used_at = ? WHERE id = ?', now, id);
  }
}

export const localProgramRepository = new LocalProgramRepository();

/** Default repository — replace with sync wrapper when Supabase accounts ship. */
export const programRepository: ProgramRepository = localProgramRepository;

// Back-compat function exports for gradual migration
export const loadPrograms = () => programRepository.loadAll();
export const upsertProgram = (program: Program) => programRepository.upsert(program);
export const upsertPrograms = (programs: Program[]) => programRepository.upsertMany(programs);
export const deleteProgram = (id: string) => programRepository.delete(id);
export const touchProgramLastUsed = (id: string) => programRepository.touchLastUsed(id);

export { persistProgram } from '@/features/programs/persist-program';
