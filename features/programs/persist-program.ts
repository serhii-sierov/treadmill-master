import { getDatabase } from '@/core/database/client';
import type { Program } from '@/features/programs/types';

/** Low-level program write — no ensureDatabaseReady (safe for bootstrap seeding). */
export async function persistProgram(program: Program): Promise<void> {
  const db = await getDatabase();

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO programs (id, name, description, is_preset, created_at, updated_at, last_used_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         description = excluded.description,
         is_preset = excluded.is_preset,
         created_at = excluded.created_at,
         updated_at = excluded.updated_at,
         last_used_at = COALESCE(excluded.last_used_at, programs.last_used_at)`,
      program.id,
      program.name,
      program.description ?? '',
      program.isPreset ? 1 : 0,
      program.createdAt,
      program.updatedAt,
      program.lastUsedAt ?? null,
    );

    await db.runAsync('DELETE FROM segments WHERE program_id = ?', program.id);

    for (const [index, segment] of program.segments.entries()) {
      await db.runAsync(
        `INSERT INTO segments (
          id, program_id, sort_order, label, duration_seconds, speed_kmh, incline_percent
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        segment.id,
        program.id,
        index,
        segment.label ?? null,
        segment.durationSeconds,
        segment.speedKmh,
        segment.inclinePercent,
      );
    }
  });
}
