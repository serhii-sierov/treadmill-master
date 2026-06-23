import * as SQLite from 'expo-sqlite';

import { runMigrations } from '@/core/database/migrations';
import { DATABASE_NAME, SCHEMA_SQL } from '@/core/database/schema';

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  databasePromise ??= openDatabase();
  return databasePromise;
}

async function openDatabase(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
  await db.execAsync(SCHEMA_SQL);
  await runMigrations(db);
  return db;
}
