/** @deprecated Import from feature modules directly, e.g. `@/features/programs`. */
export type {
  Program,
  ProgramsImportPayload,
  ProgramTab,
  Segment,
} from '@/features/programs/types';

/** @deprecated Import from `@/features/workout/types`. */
export type { WorkoutProgress, WorkoutSession, SessionSegmentLogEntry } from '@/features/workout/types';

/** @deprecated Import from `@/core/treadmill/types`. */
export type {
  DiscoveredTreadmill,
  MockTreadmillReason,
  TreadmillAdapter,
  TreadmillConnectionMode,
  TreadmillState,
} from '@/core/treadmill/types';

/** @deprecated Use TreadmillAdapter */
export type { TreadmillAdapter as TreadmillController } from '@/core/treadmill/types';

/** @deprecated Import from `@/features/dashboard/types`. */
export type {
  DashboardStats,
  TopProgramStat,
  WeeklyDayStat,
  WeeklyStats,
} from '@/features/dashboard/types';

export type { SyncMetadata, WithSyncMetadata } from '@/core/sync/types';
