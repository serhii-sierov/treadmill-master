import type * as SQLite from 'expo-sqlite';

export async function runMigrations(db: SQLite.SQLiteDatabase): Promise<void> {
  const columns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(programs)');
  if (!columns.some((column) => column.name === 'last_used_at')) {
    await db.execAsync('ALTER TABLE programs ADD COLUMN last_used_at TEXT');
    await db.execAsync(`
      UPDATE programs SET last_used_at = (
        SELECT MAX(started_at) FROM sessions WHERE sessions.program_id = programs.id
      )
    `);
  }
}
