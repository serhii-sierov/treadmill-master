/**
 * Optional sync fields for offline-first + Supabase (future).
 * Not persisted locally yet — add columns / sync_outbox table when accounts land.
 */
export interface SyncMetadata {
  /** ISO timestamp of last successful push/pull with remote */
  syncedAt?: string;
  /** Supabase row id when it differs from local id */
  remoteId?: string;
  /** True when local changes are not yet uploaded */
  pendingSync?: boolean;
}

export type WithSyncMetadata<T> = T & SyncMetadata;
